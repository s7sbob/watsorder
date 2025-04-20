// controllers/session/session.controller.ts

import { Request, Response } from 'express'
import { getConnection } from '../../config/db'
import * as sql from 'mssql'
import { createWhatsAppClientForSession } from '../whatsappClients'
import { checkSessionOwnership } from './helpers'
import fs from 'fs-extra'

// ===========================
// 1) جلب كل الجلسات للمستخدم
// ===========================
export const fetchSessions = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null
  if (!user) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()
    let query = ''

    // لو كان المستخدم admin => جلب كل الجلسات
    if (user.subscriptionType === 'admin') {
      query = `SELECT * FROM Sessions
      WHERE status != 'Deleted'
      `
    } else {
      // خلاف ذلك => جلب الجلسات الخاصة فقط
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

// ==================================
// 2) إنشاء جلسة مجانية (بشكل أساسي)
// ==================================
export const createSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null

  if (!user || !user.id || !user.subscriptionType) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()
    const sessionIdentifier = `${user.id}_${user.subscriptionType}_${Date.now()}`

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

// ===================================================
// 3) إنشاء جلسة مدفوعة (createPaidSession)
//    - لو المستخدم ما استخدمش الTrial => 3 أيام مجانية
//    - لو مستخدم => Waiting for Payment
// ===================================================
export const createPaidSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }

  const { planType } = req.body  // قيمة planType تحتوي الآن على نوع الخطة (مثلاً "OTP Plan - Monthly" أو "All Features - Yearly")
  if (!planType) {
    return res.status(400).json({ message: 'Plan type is required.' })
  }

  try {
    const pool = await getConnection()

    // جلب حالة usedTrial من جدول Users
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

    if (!usedTrial) {
      // حالة المستخدم لم يستخدم التجربة: يتم إنشاء جلسة تجريبية مجانية لمدة 3 أيام
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

      // تحديث الحالة في جدول Users بأن المستخدم استخدم التجربة
      await pool.request()
        .input('userId', sql.Int, user.id)
        .query(`
          UPDATE Users
          SET usedTrial = 1
          WHERE ID = @userId
        `)

      // بدء عميل واتساب للجلسة الجديدة (لبدء عملية الـ QR Code)
      await createWhatsAppClientForSession(newSession.id, newSession.sessionIdentifier)

      return res.status(201).json({
        message: 'Session created with a 3-day free trial (and auto-approved).',
        session: newSession
      })
    } else {
      // حالة المستخدم الذي استخدم التجربة: يتم إنشاء جلسة بوضع "Waiting for Payment"
      // لاحظ أننا لا نقوم بتعيين expireDate هنا؛ حيث يتم تعيينه لاحقاً بعد تأكيد الدفع من المدير.
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

// ========================
// 4) اختيار الخطة
// ========================
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

// ==========================
// 5) إرسال للجلسة => Paid
// ==========================
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

// ========================
// 6) تأكيد الدفع -> Ready
// ========================
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

// =======================================================================
// 7) رفض الدفع => Payment Rejected + تحديث SubscriptionRenewals بالرفض
// =======================================================================
export const rejectPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()

    // 1) تحديث حالة الجلسة
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Payment Rejected'
        WHERE id = @sessionId
      `)

    // 2) تحديث أحدث سجل في SubscriptionRenewals وجعله مرفوض
    //    (تأكد من وجود حقل [status] في SubscriptionRenewals)
    const subResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT TOP 1 id
        FROM SubscriptionRenewals
        WHERE sessionId = @sessionId
        ORDER BY id DESC
      `)

    if (subResult.recordset.length > 0) {
      const renewalId = subResult.recordset[0].id
      await pool.request()
        .input('renewalId', sql.Int, renewalId)
        .input('status', sql.NVarChar, 'Rejected')
        .query(`
          UPDATE SubscriptionRenewals
          SET status = @status, newExpireDate = NULL
          WHERE id = @renewalId
        `)
    }

    return res.status(200).json({ message: 'Payment rejected successfully.' })
  } catch (error) {
    console.error('Error rejecting payment:', error)
    return res.status(500).json({ message: 'Error rejecting payment.' })
  }
}

// =====================================================================
// 8) تأكيد الدفع مع تاريخ انتهاء => Ready + تحديث SubscriptionRenewals
// =====================================================================
export const confirmPaymentWithExpire = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { newExpireDate } = req.body
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' })
  }
  try {
    const pool = await getConnection()
    // تحديث حالة الجلسة
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `)

    // استدعاء الواتساب
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`)

    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier
      // createWhatsAppClientForSession(sessionId, sessionIdentifier) // لو حابب تعيد التشغيل
    }

    // تحديث أحدث سجل في SubscriptionRenewals => وضع newExpireDate + status='Confirmed'
    const subResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT TOP 1 id
        FROM SubscriptionRenewals
        WHERE sessionId = @sessionId
        ORDER BY id DESC
      `)

    if (subResult.recordset.length > 0) {
      const renewalId = subResult.recordset[0].id
      await pool.request()
        .input('renewalId', sql.Int, renewalId)
        .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
        .input('status', sql.NVarChar, 'Confirmed')
        .query(`
          UPDATE SubscriptionRenewals
          SET newExpireDate = @newExpireDate,
              status = @status
          WHERE id = @renewalId
        `)
    }

    return res.status(200).json({ message: 'Payment confirmed and expire date set. Session is now ready.' })
  } catch (error) {
    console.error('Error confirming payment with expire date:', error)
    return res.status(500).json({ message: 'Error confirming payment with expire date.' })
  }
}

// =====================
// 9) تجديد الاشتراك
// =====================
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

    // بمجرد Ready => من الممكن إعادة تشغيل الواتساب لو حابب
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