// src/controllers/sessionController.ts
import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import { broadcastMessage, createWhatsAppClientForSession, whatsappClients } from './whatsappClients'

import * as sql from 'mssql'
import fs from 'fs-extra'

// جلب الجلسات بناءً على المستخدم
export const fetchSessions = async (req: Request, res: Response) => {
  const userId = req.user && typeof req.user !== 'string' ? req.user.id : null

  if (!userId) {
    return res.status(401).json({ message: 'User not authorized.' })
  }

  try {
    const pool = await getConnection()
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

    // جلب عدد الجلسات الحالية للمستخدم
    const sessionCountResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT COUNT(*) as sessionCount FROM Sessions WHERE userId = @userId')
    const sessionCount = sessionCountResult.recordset[0].sessionCount

    // جلب maxSessions من جدول المستخدمين
    const maxSessionsResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT maxSessions FROM Users WHERE ID = @userId')
    const maxSessions = maxSessionsResult.recordset[0]?.maxSessions || 0

    // التحقق من الحد الأقصى للجلسات
    if (sessionCount >= maxSessions) {
      return res.status(400).json({ message: 'Maximum session limit reached.' })
    }

    // بيانات الجلسة من الطلب
    const { status, greetingMessage, greetingActive } = req.body
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`

    // إدخال سجل الجلسة الجديد
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

    // أنشئ عميل واتساب للجلسة
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
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('botActive', sql.Bit, botActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET botActive = @botActive
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Bot status updated successfully.' })
  } catch (error) {
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

    // إغلاق اتصال عميل واتساب إن وجد
    const client = whatsappClients[sessionId]
    if (client) {
      await client.destroy()
      delete whatsappClients[sessionId]
    }

    // حذف السجل من جدول Sessions
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('DELETE FROM Sessions WHERE id = @sessionId')

    return res.status(200).json({ message: 'Session deleted successfully.' })
  } catch (error) {
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
  } catch (error) {
    console.error('Error updating greeting:', error)
    res.status(500).json({ message: 'Error updating greeting.' })
  }
}

// استرجاع رمز QR لجلسة معينة
export const getQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT qrCode FROM Sessions WHERE id = @sessionId')

    if (result.recordset.length) {
      res.status(200).json({ qr: result.recordset[0].qrCode })
    } else {
      res.status(404).json({ message: 'Session not found' })
    }
  } catch (error) {
    console.error('Error fetching QR:', error)
    res.status(500).json({ message: 'Error fetching QR.' })
  }
}

// تسجيل الخروج من الجلسة (حذف ملفات الجلسة)
export const logoutSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    // ابحث عن الـ client
    const client = whatsappClients[sessionId]
    if (client) {
      await client.destroy()
      delete whatsappClients[sessionId]
    }

    // حذف مجلد LocalAuth
    const pool = await getConnection()
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId')

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Session not found in DB.' })
    }

    const { sessionIdentifier } = result.recordset[0]
    const folderPath = `.wwebjs_auth/session-${sessionIdentifier.replace(/[^A-Za-z0-9_-]/g, '_')}`

    if (fs.existsSync(folderPath)) {
      await fs.remove(folderPath)
    }

    // تحديث الحالة في DB
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
  } catch (error) {
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
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId')

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    const { sessionIdentifier } = result.recordset[0]

    // شغّل العميل من جديد
    await createWhatsAppClientForSession(sessionId, sessionIdentifier)

    // حدّث الحالة
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for QR Code', qrCode = NULL
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Session login initiated. Please scan the QR code.' })
  } catch (error) {
    console.error('Error logging in session:', error)
    return res.status(500).json({ message: 'Error logging in session.' })
  }
}

// -------------------- [ الدوال الخاصة بجدول Categories ] --------------------

// إضافة فئة في جدول ثابت
export const addCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { category_name } = req.body

  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' })
  }

  try {
    const pool = await getConnection()
    const insertSQL = `
      INSERT INTO [dbo].[Categories] (sessionId, category_name)
      VALUES (@sessionId, @category_name)
    `
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_name', sql.NVarChar, category_name)
      .query(insertSQL)

    return res.status(201).json({ message: 'Category added successfully.' })
  } catch (error) {
    console.error('Error adding category:', error)
    return res.status(500).json({ message: 'Error adding category.' })
  }
}

// جلب الفئات الخاصة بالجلسة
export const getCategoriesForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, category_name FROM [dbo].[Categories]
        WHERE sessionId = @sessionId
      `)

    return res.status(200).json(result.recordset)
  } catch (error) {
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
  } catch (error) {
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
    const deleteSQL = `
      DELETE FROM [dbo].[Categories]
      WHERE id = @categoryId AND sessionId = @sessionId
    `
    await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .input('sessionId', sql.Int, sessionId)
      .query(deleteSQL)

    return res.status(200).json({ message: 'Category deleted successfully.' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return res.status(500).json({ message: 'Error deleting category.' })
  }
}

// -------------------- [ الدوال الخاصة بجدول Products ] --------------------

// إضافة منتج في جدول ثابت مع سعره
export const addProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { product_name, category_id, price } = req.body

  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' })
  }

  try {
    const pool = await getConnection()
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
  } catch (error) {
    console.error('Error adding product:', error)
    return res.status(500).json({ message: 'Error adding product.' })
  }
}

// استرجاع المنتجات
export const getProductsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, product_name, category_id, price
        FROM [dbo].[Products]
        WHERE sessionId = @sessionId
      `)

    return res.status(200).json(result.recordset)
  } catch (error) {
    console.error('Error fetching products:', error)
    return res.status(500).json({ message: 'Error fetching products.' })
  }
}

// تحديث المنتج
export const updateProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  const { product_name, category_id, price } = req.body

  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' })
  }

  try {
    const pool = await getConnection()
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
  } catch (error) {
    console.error('Error updating product:', error)
    return res.status(500).json({ message: 'Error updating product.' })
  }
}


// حذف المنتج
export const deleteProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  try {
    const pool = await getConnection()
    const deleteSQL = `
      DELETE FROM [dbo].[Products]
      WHERE id = @productId AND sessionId = @sessionId
    `
    await pool.request()
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId)
      .query(deleteSQL)

    return res.status(200).json({ message: 'Product deleted successfully.' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return res.status(500).json({ message: 'Error deleting product.' })
  }
}

// -------------------- [ الدوال الخاصة بجدول Keywords + Replays ] --------------------

// إضافة Keyword (Many) مع Replay (واحد)
export const addKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { keyword, replyText } = req.body

  if (!keyword || !replyText) {
    return res.status(400).json({ message: 'keyword and replyText are required.' })
  }

  try {
    const pool = await getConnection()

    // ابحث عن الـ Replay إن كان موجوداً
    let replayId: number
    const replaySearch = await pool.request()
      .input('replyText', sql.NVarChar, replyText)
      .query(`
        SELECT id FROM [dbo].[Replays]
        WHERE replyText = @replyText
      `)

    if (replaySearch.recordset.length > 0) {
      replayId = replaySearch.recordset[0].id
    } else {
      const replayInsert = await pool.request()
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          INSERT INTO [dbo].[Replays] (replyText)
          OUTPUT INSERTED.id
          VALUES (@replyText)
        `)
      replayId = replayInsert.recordset[0].id
    }

    // الآن أضف الـ keyword
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('keyword', sql.NVarChar, keyword)
      .input('replay_id', sql.Int, replayId)
      .query(`
        INSERT INTO [dbo].[Keywords] (sessionId, keyword, replay_id)
        VALUES (@sessionId, @keyword, @replay_id)
      `)

    return res.status(201).json({ message: 'Keyword added successfully.' })
  } catch (error) {
    console.error('Error adding keyword:', error)
    return res.status(500).json({ message: 'Error adding keyword.' })
  }
}

// ------------------------------------------------------------------
// مقتطف من كود الواتساب (whatsappClients.ts) للتوضيح فقط (لو احتجته)
// ------------------------------------------------------------------

/*
  client.on('message', async msg => {
    try {
      const pool = await getConnection()
      const sessionResult = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive
          FROM Sessions
          WHERE id = @sessionId
        `)
      if (!sessionResult.recordset.length) return

      const { botActive } = sessionResult.recordset[0]
      if (!botActive) return

      // جلب الكلمات المفتاحية + الردود من الجداول الثابتة
      const keywordsResult = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT k.keyword, r.replyText
          FROM Keywords k
          JOIN Replays r ON k.replay_id = r.id
          WHERE k.sessionId = @sessionId
        `)

      const receivedText = msg.body.toLowerCase().trim()
      const foundKeywordRow = keywordsResult.recordset.find((row: any) => {
        return row.keyword.toLowerCase() === receivedText
      })

      if (foundKeywordRow) {
        await client.sendMessage(msg.from, foundKeywordRow.replyText)
      }
    } catch (error) {
      console.error('Error handling incoming message:', error)
    }
  })
*/

export const initializeExistingSessions = async () => {
  const pool = await getConnection()
  // هنا نسترجع الـ sessions ذات الحالة التي تستحق الاستعادة
  // مثلاً: Connected أو Waiting for QR Code
  const result = await pool.request().query(`
    SELECT id, sessionIdentifier
    FROM Sessions
    WHERE status IN ('Connected', 'Waiting for QR Code')
  `)

  for (const record of result.recordset) {
    // أنشئ عميل واتساب لكل جلسة مخزنة
    await createWhatsAppClientForSession(record.id, record.sessionIdentifier)
  }
}

export const updateMenuBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { menuBotActive } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('menuBotActive', sql.Bit, menuBotActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET menuBotActive = @menuBotActive
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'MenuBot status updated successfully.' })
  } catch (error) {
    console.error('Error updating menu bot status:', error)
    return res.status(500).json({ message: 'Error updating menu bot status.' })
  }
}



// إضافة الـ route الجديد للبث
export const broadcastMessageAPI = async (req: Request, res: Response) => {
  // 1) قراءة sessionId من الـ params
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  // 2) استدعاء دالة البث وتمرير sessionId
  await broadcastMessage(req, res, sessionId)
}