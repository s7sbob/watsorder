// controllers/session/session.controller.ts

import { Request, Response } from 'express'
import { getConnection } from '../../config/db'
import * as sql from 'mssql'
import { createWhatsAppClientForSession } from '../whatsappClients'
import { checkSessionOwnership } from './helpers'
import fs from 'fs-extra'

/**
 * جلب الجلسات بناءً على المستخدم
 */
export const fetchSessions = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null
  if (!user) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()
    let query = ''

    // إذا كان المستخدم admin، فاجلب جميع الجلسات
    if (user.subscriptionType === 'admin') {
      query = `SELECT * FROM Sessions`
    } else {
      // وإلا جلب الجلسات الخاصة بالمستخدم فقط
      query = `SELECT * FROM Sessions WHERE userId = @userId`
    }

    const request = pool.request()
    if (user.subscriptionType !== 'admin') {
      request.input('userId', sql.Int, user.id)
    }

    const result = await request.query(query)
    return res.status(200).json(result.recordset)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return res.status(500).json({ message: 'Error fetching sessions' })
  }
}

/**
 * إنشاء جلسة جديدة (وضعها Waiting for Plan)
 */
export const createSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null

  if (!user || !user.id || !user.subscriptionType) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`

    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, 'Waiting for Plan')
      .input('greetingMessage', sql.NVarChar(sql.MAX), req.body.greetingMessage || null)
      .input('greetingActive', sql.Bit, req.body.greetingActive ? 1 : 0)
      .input('clientName', sql.NVarChar, user.name || '')
      .query(`
        INSERT INTO Sessions 
          (userId, sessionIdentifier, status, greetingMessage, greetingActive, clientName)
        OUTPUT INSERTED.id
        VALUES 
          (@userId, @sessionIdentifier, @status, @greetingMessage, @greetingActive, @clientName)
      `)

    const newSessionId = insertSessionResult.recordset[0].id
    return res.status(201).json({
      message: 'Session created successfully in Waiting for Plan state.',
      sessionId: newSessionId
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return res.status(500).json({ message: 'Error creating session.' })
  }
}

/**
 * إنشاء جلسة مدفوعة (createPaidSession)
 * - إذا كان المستخدم لم يستخدم التجربة المجانية (usedTrial=0)، نعطيه 3 أيام مجانية -> الحالة Ready وتشغيل الجلسة فورًا.
 * - إذا كان المستخدم قد استخدم التجربة (usedTrial=1)، ننشئ الجلسة مباشرة بحالة "Waiting for Payment".
 */
export const createPaidSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }

  const { planType } = req.body
  if (!planType) {
    return res.status(400).json({ message: 'Plan type is required.' })
  }

  try {
    const pool = await getConnection()

    // التحقق من حالة usedTrial لدى المستخدم
    const userCheck = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT usedTrial
        FROM Users
        WHERE ID = @userId
      `)

    if (!userCheck.recordset.length) {
      return res.status(404).json({
        message: 'User not found in DB.'
      })
    }

    const { usedTrial } = userCheck.recordset[0]

    // ----- 1) المستخدم لم يستخدم التجربة المجانية بعد => سيحصل على 3 أيام تجريبية -----
    if (!usedTrial) {
      // حالة Ready مباشرة + تشغيل جلسة
      const status = 'Ready'
      const now = new Date()
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`

      const insertSessionResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
        .input('status', sql.NVarChar, status)
        .input('planType', sql.NVarChar, planType)
        .input('expireDate', sql.DateTime, threeDaysLater)
        .input('clientName', sql.NVarChar, user.name || '')
        .query(`
          INSERT INTO Sessions
            (userId, sessionIdentifier, status, planType, expireDate, clientName)
          OUTPUT INSERTED.*
          VALUES
            (@userId, @sessionIdentifier, @status, @planType, @expireDate, @clientName)
        `)

      const newSession = insertSessionResult.recordset[0]

      // تحديث المستخدم بوضع usedTrial=1
      await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          UPDATE Users
          SET usedTrial = 1
          WHERE ID = @userId
        `)

      // استدعاء عميل الواتساب -> يبدأ بطلب الـ QR فورًا
      await createWhatsAppClientForSession(newSession.id, newSession.sessionIdentifier)

      return res.status(201).json({
        message: 'Session created with a 3-day free trial (and auto-approved).',
        session: newSession
      })

    // ----- 2) المستخدم استخدم التجربة المجانية => إنشاء جلسة بدون Free Trial -----
    } else {
      // الحالة: "Waiting for Payment"
      const status = 'Waiting for Payment'
      const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`

      const insertSessionResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
        .input('status', sql.NVarChar, status)
        .input('planType', sql.NVarChar, planType)
        .input('clientName', sql.NVarChar, user.name || '')
        .query(`
          INSERT INTO Sessions
            (userId, sessionIdentifier, status, planType, clientName)
          OUTPUT INSERTED.*
          VALUES
            (@userId, @sessionIdentifier, @status, @planType, @clientName)
        `)

      const newSession = insertSessionResult.recordset[0]

      return res.status(201).json({
        message: 'Session created. Please proceed with payment to activate it.',
        session: newSession
      })
    }
  } catch (error) {
    console.error('Error creating paid session:', error)
    return res.status(500).json({ message: 'Error creating paid session.' })
  }
}

/**
 * اختيار الخطة
 */
export const choosePlan = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { planType } = req.body
  if (!planType) {
    return res.status(400).json({ message: 'Plan type is required.' })
  }
  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('planType', sql.NVarChar, planType)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for Payment',
            planType = @planType
        WHERE id = @sessionId
      `)
    return res.status(200).json({ message: 'Plan chosen, waiting for payment.' })
  } catch (error) {
    console.error('Error choosing plan:', error)
    return res.status(500).json({ message: 'Error choosing plan.' })
  }
}

/**
 * ارسال إلى المدير (تغيير الحالة إلى Paid)
 */
export const sendToManager = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Paid'
        WHERE id = @sessionId
      `)
    return res.status(200).json({ message: 'Session marked as Paid. Manager will confirm it.' })
  } catch (error) {
    console.error('Error sending session to manager:', error)
    return res.status(500).json({ message: 'Error sending session to manager.' })
  }
}

/**
 * تأكيد الدفع -> جاهزة (Ready)
 */
export const confirmPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Ready'
        WHERE id = @sessionId
      `)

    // بعد جعلها Ready، نستدعي الواتساب
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`)

    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier
      await createWhatsAppClientForSession(sessionId, sessionIdentifier)
    }

    return res.status(200).json({ message: 'Payment confirmed, session is now ready.' })
  } catch (error) {
    console.error('Error confirming payment:', error)
    return res.status(500).json({ message: 'Error confirming payment.' })
  }
}

/**
 * رفض الدفع
 */
export const rejectPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Payment Rejected'
        WHERE id = @sessionId
      `)
    return res.status(200).json({ message: 'Payment rejected successfully.' })
  } catch (error) {
    console.error('Error rejecting payment:', error)
    return res.status(500).json({ message: 'Error rejecting payment.' })
  }
}

/**
 * تأكيد الدفع مع تحديد تاريخ انتهاء جديد
 */
export const confirmPaymentWithExpire = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { newExpireDate } = req.body
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' })
  }
  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`)

    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier
      // await createWhatsAppClientForSession(sessionId, sessionIdentifier)
    }
    return res.status(200).json({ message: 'Payment confirmed and expire date set. Session is now ready.' })
  } catch (error) {
    console.error('Error confirming payment with expire date:', error)
    return res.status(500).json({ message: 'Error confirming payment with expire date.' })
  }
}

/**
 * تجديد الاشتراك -> جاهز (Ready) + تشغيل الجلسة فورًا
 */
export const renewSubscription = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { newExpireDate } = req.body
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' })
  }
  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `)

    // بمجرد أن تصبح Ready نعيد تشغيل الجلسة
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`)

    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier
      // await createWhatsAppClientForSession(sessionId, sessionIdentifier)
    }

    return res.status(200).json({ message: 'Subscription renewed, session is now ready.' })
  } catch (error) {
    console.error('Error renewing subscription:', error)
    return res.status(500).json({ message: 'Error renewing subscription.' })
  }
}

