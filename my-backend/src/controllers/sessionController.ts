// src/controllers/sessionController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import { broadcastMessage, createWhatsAppClientForSession, whatsappClients } from './whatsappClients'
import * as sql from 'mssql'
import fs from 'fs-extra'

// ===================================================================
// دالة مساعدة لفحص ملكية session
async function checkSessionOwnership(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const sessionRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query('SELECT userId FROM Sessions WHERE id = @sessionId')

  if (!sessionRow.recordset.length) {
    throw new Error('SessionNotFound')
  }

  const ownerId = sessionRow.recordset[0].userId

  // إن لم يكن Admin وتختلف الملكية => منع
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== ownerId) {
    throw new Error('Forbidden')
  }
}
// ===================================================================


// جلب الجلسات بناءً على المستخدم
export const fetchSessions = async (req: Request, res: Response) => {
  const userId = req.user && typeof req.user !== 'string' ? req.user.id : null

  if (!userId) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()

    // حتى لو كان Admin، حسب كلامك لا تريد أن يرى جلسات الآخرين.
    // بالتالي نجلب فقط الجلسات المملوكة لهذا الuserId
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT * FROM Sessions WHERE userId = @userId`)
    return res.status(200).json(result.recordset)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error fetching sessions' })
  }
}

// إنشاء جلسة جديدة
export const createSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null

  if (!user || !user.id || !user.subscriptionType) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()

    const sessionCountResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT COUNT(*) as sessionCount FROM Sessions WHERE userId = @userId')
    const sessionCount = sessionCountResult.recordset[0].sessionCount

    const maxSessionsResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT maxSessions FROM Users WHERE ID = @userId')
    const maxSessions = maxSessionsResult.recordset[0]?.maxSessions || 0

    if (sessionCount >= maxSessions) {
      return res.status(400).json({ message: 'Maximum session limit reached.' })
    }

    const { status, greetingMessage, greetingActive } = req.body
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`

    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, status || 'Inactive')
      .input('greetingMessage', sql.NVarChar(sql.MAX), greetingMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        INSERT INTO Sessions 
          (userId, sessionIdentifier, status, greetingMessage, greetingActive)
        OUTPUT INSERTED.id
        VALUES 
          (@userId, @sessionIdentifier, @status, @greetingMessage, @greetingActive)
      `)

    const newSessionId = insertSessionResult.recordset[0].id

    await createWhatsAppClientForSession(newSessionId, sessionIdentifier)

    return res.status(201).json({ message: 'Session created successfully.' })
  } catch (error) {
    console.error('Error creating session:', error)
    return res.status(500).json({ message: 'Error creating session.' })
  }
}

// تحديث حالة البوت (botActive)
export const updateBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { botActive } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('botActive', sql.Bit, botActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET botActive = @botActive
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Bot status updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating bot status:', error)
    return res.status(500).json({ message: 'Error updating bot status.' })
  }
}

// حذف جلسة
export const deleteSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }
  try {
    const pool = await getConnection()

    await checkSessionOwnership(pool, sessionId, req.user)

    const client = whatsappClients[sessionId]
    if (client) {
      await client.destroy()
      delete whatsappClients[sessionId]
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('DELETE FROM Sessions WHERE id = @sessionId')

    return res.status(200).json({ message: 'Session deleted successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error deleting session:', error)
    return res.status(500).json({ message: 'Error deleting session.' })
  }
}

// تحديث رسالة الترحيب
export const updateGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { greetingMessage, greetingActive } = req.body
  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('greetingMessage', sql.NVarChar(sql.MAX), greetingMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET greetingMessage = @greetingMessage, greetingActive = @greetingActive
        WHERE id = @sessionId
      `)
    res.status(200).json({ message: 'Greeting updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating greeting:', error)
    res.status(500).json({ message: 'Error updating greeting.' })
  }
}

// استرجاع رمز QR لجلسة معينة
export const getQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT qrCode FROM Sessions WHERE id = @sessionId')

    if (result.recordset.length) {
      res.status(200).json({ qr: result.recordset[0].qrCode })
    } else {
      res.status(404).json({ message: 'Session not found' })
    }
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error fetching QR:', error)
    res.status(500).json({ message: 'Error fetching QR.' })
  }
}

// تسجيل الخروج من الجلسة
export const logoutSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId')

    const { sessionIdentifier } = result.recordset[0]

    const client = whatsappClients[sessionId]
    if (client) {
      await client.destroy()
      delete whatsappClients[sessionId]
    }

    const folderPath = `.wwebjs_auth/session-${sessionIdentifier.replace(/[^A-Za-z0-9_-]/g, '_')}`
    if (fs.existsSync(folderPath)) {
      await fs.remove(folderPath)
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Terminated',
            qrCode = NULL,
            phoneNumber = NULL
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Session logged out successfully (files removed).' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found in DB.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error logging out session:', error)
    return res.status(500).json({ message: 'Error logging out session.' })
  }
}

// تسجيل الدخول مجددًا (إعادة تهيئة)
export const loginSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId')

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    const { sessionIdentifier } = result.recordset[0]
    await createWhatsAppClientForSession(sessionId, sessionIdentifier)

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for QR Code', qrCode = NULL
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Session login initiated. Please scan the QR code.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error logging in session:', error)
    return res.status(500).json({ message: 'Error logging in session.' })
  }
}


// -------------------- [ الدوال الخاصة بجدول Categories ] --------------------
// نفس فكرة الملكية: يجب التحقق sessionId يعود للـ user
async function checkSessionOwnershipForCatProd(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const sess = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT userId FROM Sessions WHERE id = @sessionId`)
  if (!sess.recordset.length) {
    throw new Error('SessionNotFound')
  }
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== sess.recordset[0].userId) {
    throw new Error('Forbidden')
  }
}

export const addCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { category_name } = req.body

  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const insertSQL = `
      INSERT INTO [dbo].[Categories] (sessionId, category_name)
      VALUES (@sessionId, @category_name)
    `
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_name', sql.NVarChar, category_name)
      .query(insertSQL)

    return res.status(201).json({ message: 'Category added successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error adding category:', error)
    return res.status(500).json({ message: 'Error adding category.' })
  }
}

// جلب الفئات الخاصة بالجلسة
export const getCategoriesForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, category_name FROM [dbo].[Categories]
        WHERE sessionId = @sessionId
      `)

    return res.status(200).json(result.recordset)
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error fetching categories:', error)
    return res.status(500).json({ message: 'Error fetching categories.' })
  }
}

// تحديث الفئة
export const updateCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const categoryId = parseInt(req.params.categoryId, 10)
  const { category_name } = req.body

  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' })
  }
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const updateSQL = `
      UPDATE [dbo].[Categories]
      SET category_name = @category_name
      WHERE id = @categoryId AND sessionId = @sessionId
    `
    await pool.request()
      .input('category_name', sql.NVarChar, category_name)
      .input('categoryId', sql.Int, categoryId)
      .input('sessionId', sql.Int, sessionId)
      .query(updateSQL)

    return res.status(200).json({ message: 'Category updated successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error updating category:', error)
    return res.status(500).json({ message: 'Error updating category.' })
  }
}

// حذف الفئة
export const deleteCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const categoryId = parseInt(req.params.categoryId, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const deleteSQL = `
      DELETE FROM [dbo].[Categories]
      WHERE id = @categoryId AND sessionId = @sessionId
    `
    await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .input('sessionId', sql.Int, sessionId)
      .query(deleteSQL)

    return res.status(200).json({ message: 'Category deleted successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error deleting category:', error)
    return res.status(500).json({ message: 'Error deleting category.' })
  }
}

// -------------------- [ الدوال الخاصة بجدول Products ] --------------------

export const addProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { product_name, category_id, price } = req.body

  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const insertSQL = `
      INSERT INTO [dbo].[Products] (sessionId, category_id, product_name, price)
      VALUES (@sessionId, @category_id, @product_name, @price)
    `
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_id', sql.Int, category_id)
      .input('product_name', sql.NVarChar, product_name)
      .input('price', sql.Decimal(18,2), price ?? null)
      .query(insertSQL)

    return res.status(201).json({ message: 'Product added successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error adding product:', error)
    return res.status(500).json({ message: 'Error adding product.' })
  }
}

// استرجاع المنتجات
export const getProductsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, product_name, category_id, price
        FROM [dbo].[Products]
        WHERE sessionId = @sessionId
      `)

    return res.status(200).json(result.recordset)
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error fetching products:', error)
    return res.status(500).json({ message: 'Error fetching products.' })
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  const { product_name, category_id, price } = req.body

  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const updateSQL = `
      UPDATE [dbo].[Products]
      SET product_name = @product_name,
          category_id = @category_id,
          price = @price
      WHERE id = @productId
        AND sessionId = @sessionId
    `
    await pool.request()
      .input('product_name', sql.NVarChar, product_name)
      .input('category_id', sql.Int, category_id)
      .input('price', sql.Decimal(18,2), price ?? null)
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId)
      .query(updateSQL)

    return res.status(200).json({ message: 'Product updated successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error updating product:', error)
    return res.status(500).json({ message: 'Error updating product.' })
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const deleteSQL = `
      DELETE FROM [dbo].[Products]
      WHERE id = @productId AND sessionId = @sessionId
    `
    await pool.request()
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId)
      .query(deleteSQL)

    return res.status(200).json({ message: 'Product deleted successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error deleting product:', error)
    return res.status(500).json({ message: 'Error deleting product.' })
  }
}



// ---------------------------------------------------------------------------
// دالة مساعدة: التحقق من ملكية الـ Session (أو السماح للـ admin)
// ---------------------------------------------------------------------------
async function checkSessionOwnershipForKeywords(pool: sql.ConnectionPool, sessionId: number, user: any) {
  const sessRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT userId FROM Sessions WHERE id = @sessionId`)

  if (!sessRow.recordset.length) {
    throw new Error('SessionNotFound')
  }

  const ownerId = sessRow.recordset[0].userId
  if (user.subscriptionType !== 'admin' && user.id !== ownerId) {
    throw new Error('Forbidden')
  }
}

// ---------------------------------------------------------------------------
// (1) إضافة Keyword + Replay (عند الحاجة)
// ---------------------------------------------------------------------------
export const addKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const {
    keyword,
    replyText,
    replyMediaBase64,
    replyMediaMimeType,
    replyMediaFilename
  } = req.body

  if (!keyword || !replyText) {
    return res.status(400).json({ message: 'keyword and replyText are required.' })
  }

  try {
    const pool = await getConnection()

    // تحقق من ملكية الجلسة أو صلاحيات admin
    await checkSessionOwnershipForKeywords(pool, sessionId, req.user)

    // ابحث عن Replay لو موجود بنفس النص
    let replayId: number
    const replaySearch = await pool.request()
      .input('replyText', sql.NVarChar, replyText)
      .query(`
        SELECT id FROM [dbo].[Replays]
        WHERE replyText = @replyText
      `)

    if (replaySearch.recordset.length > 0) {
      // يوجد Replay بنفس الرد => حدث الميديا لو لزم
      replayId = replaySearch.recordset[0].id

      await pool.request()
        .input('replayId', sql.Int, replayId)
        .input('replyText', sql.NVarChar, replyText)
        .input('replyMediaBase64', sql.NVarChar(sql.MAX), replyMediaBase64 || null)
        .input('replyMediaMimeType', sql.NVarChar(200), replyMediaMimeType || null)
        .input('replyMediaFilename', sql.NVarChar(200), replyMediaFilename || null)
        .query(`
          UPDATE [dbo].[Replays]
          SET 
            replyText = @replyText,
            replyMediaBase64 = @replyMediaBase64,
            replyMediaMimeType = @replyMediaMimeType,
            replyMediaFilename = @replyMediaFilename
          WHERE id = @replayId
        `)
    } else {
      // لا يوجد Replay => أنشئ جديد
      const replayInsert = await pool.request()
        .input('replyText', sql.NVarChar, replyText)
        .input('replyMediaBase64', sql.NVarChar(sql.MAX), replyMediaBase64 || null)
        .input('replyMediaMimeType', sql.NVarChar(200), replyMediaMimeType || null)
        .input('replyMediaFilename', sql.NVarChar(200), replyMediaFilename || null)
        .query(`
          INSERT INTO [dbo].[Replays] (
            replyText,
            replyMediaBase64,
            replyMediaMimeType,
            replyMediaFilename
          )
          OUTPUT INSERTED.id
          VALUES (
            @replyText,
            @replyMediaBase64,
            @replyMediaMimeType,
            @replyMediaFilename
          )
        `)
      replayId = replayInsert.recordset[0].id
    }

    // إضافة الـ keyword
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('keyword', sql.NVarChar, keyword)
      .input('replay_id', sql.Int, replayId)
      .query(`
        INSERT INTO [dbo].[Keywords] (sessionId, keyword, replay_id)
        VALUES (@sessionId, @keyword, @replay_id)
      `)

    return res.status(201).json({ message: 'Keyword added successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error adding keyword:', error)
    return res.status(500).json({ message: 'Error adding keyword.' })
  }
}

// ---------------------------------------------------------------------------
// (2) جلب كل الـ Keywords الخاصة بالجلسة
// ---------------------------------------------------------------------------
export const getKeywordsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await getConnection()

    // تحقق من الملكية
    await checkSessionOwnershipForKeywords(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT 
          k.id AS keywordId,
          k.keyword,
          r.id AS replayId,
          r.replyText,
          r.replyMediaBase64,
          r.replyMediaMimeType,
          r.replyMediaFilename
        FROM Keywords k
        JOIN Replays r ON k.replay_id = r.id
        WHERE k.sessionId = @sessionId
      `)
    return res.status(200).json(result.recordset)
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error fetching keywords:', error)
    return res.status(500).json({ message: 'Error fetching keywords.' })
  }
}

// ---------------------------------------------------------------------------
// (3) تحديث Keyword
// ---------------------------------------------------------------------------
export const updateKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const keywordId = parseInt(req.params.keywordId, 10)

  const {
    newKeyword,
    newReplyText,
    newReplyMediaBase64,
    newReplyMediaMimeType,
    newReplyMediaFilename
  } = req.body

  if (!newKeyword || !newReplyText) {
    return res.status(400).json({ message: 'newKeyword and newReplyText are required.' })
  }

  try {
    const pool = await getConnection()

    // تحقق من ملكية الـ session
    await checkSessionOwnershipForKeywords(pool, sessionId, req.user)

    // ابحث عن السجل
    const keywordRow = await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT replay_id
        FROM Keywords
        WHERE id = @keywordId 
          AND sessionId = @sessionId
      `)

    if (!keywordRow.recordset.length) {
      return res.status(404).json({ message: 'Keyword not found.' })
    }

    const replayId = keywordRow.recordset[0].replay_id

    // (1) حدّث keyword نفسه
    await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .input('newKeyword', sql.NVarChar, newKeyword)
      .query(`
        UPDATE Keywords
        SET keyword = @newKeyword
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `)

    // (2) حدّث الـ Replay
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('newReplyText', sql.NVarChar, newReplyText)
      .input('newReplyMediaBase64', sql.NVarChar(sql.MAX), newReplyMediaBase64 || null)
      .input('newReplyMediaMimeType', sql.NVarChar(200), newReplyMediaMimeType || null)
      .input('newReplyMediaFilename', sql.NVarChar(200), newReplyMediaFilename || null)
      .query(`
        UPDATE Replays
        SET
          replyText = @newReplyText,
          replyMediaBase64 = @newReplyMediaBase64,
          replyMediaMimeType = @newReplyMediaMimeType,
          replyMediaFilename = @newReplyMediaFilename
        WHERE id = @replayId
      `)

    return res.status(200).json({ message: 'Keyword updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating keyword:', error)
    return res.status(500).json({ message: 'Error updating keyword.' })
  }
}

// ---------------------------------------------------------------------------
// (4) حذف Keyword
// ---------------------------------------------------------------------------
export const deleteKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const keywordId = parseInt(req.params.keywordId, 10)

  try {
    const pool = await getConnection()

    // تحقق ملكية
    await checkSessionOwnershipForKeywords(pool, sessionId, req.user)

    // ابحث عن الـ replay_id
    const keywordRow = await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT replay_id
        FROM Keywords
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `)

    if (!keywordRow.recordset.length) {
      return res.status(404).json({ message: 'Keyword not found.' })
    }
    const replayId = keywordRow.recordset[0].replay_id

    // احذف الكلمة المفتاحية
    await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Keywords
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `)

    // تأكد هل لا يزال الـ replay يُستخدم؟
    const checkReplay = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT COUNT(*) as cnt
        FROM Keywords
        WHERE replay_id = @replayId
      `)

    if (checkReplay.recordset[0].cnt === 0) {
      // لا أحد يشير لهذا replay => نحذفه نهائيًا
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`
          DELETE FROM Replays
          WHERE id = @replayId
        `)
    }

    return res.status(200).json({ message: 'Keyword deleted successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error deleting keyword:', error)
    return res.status(500).json({ message: 'Error deleting keyword.' })
  }
}



// ===================================================================
// دالة تُستدعى عند تشغيل السيرفر
// ===================================================================
export const initializeExistingSessions = async () => {
  const pool = await getConnection()
  const result = await pool.request().query(`
    SELECT id, sessionIdentifier
    FROM Sessions
    WHERE status IN ('Connected', 'Waiting for QR Code')
  `)

  for (const record of result.recordset) {
    await createWhatsAppClientForSession(record.id, record.sessionIdentifier)
  }
}




// تفعيل أو إيقاف الـ Menu Bot
export const updateMenuBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { menuBotActive } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('menuBotActive', sql.Bit, menuBotActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET menuBotActive = @menuBotActive
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'MenuBot status updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating menu bot status:', error)
    return res.status(500).json({ message: 'Error updating menu bot status.' })
  }
}



// البث
export const broadcastMessageAPI = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    await broadcastMessage(req, res, sessionId)
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Error broadcasting message.' })
  }
}