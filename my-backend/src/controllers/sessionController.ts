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
  // التأكد من وجود بيانات المستخدم من التوكن
  const user = req.user && typeof req.user !== 'string' ? req.user : null;
  if (!user) {
    return res.status(401).json({ message: 'User not authorized.' });
  }

  try {
    const pool = await getConnection();
    let query = '';
    
    // إذا كان المستخدم admin، فاجلب جميع الجلسات
    if (user.subscriptionType === 'admin') {
      query = `SELECT * FROM Sessions`;
    } else {
      // وإلا جلب الجلسات الخاصة بالمستخدم فقط
      query = `SELECT * FROM Sessions WHERE userId = @userId`;
    }
    
    const request = pool.request();
    if (user.subscriptionType !== 'admin') {
      request.input('userId', sql.Int, user.id);
    }
    
    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ message: 'Error fetching sessions' });
  }
};

// إنشاء جلسة جديدة
export const createSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null;

  if (!user || !user.id || !user.subscriptionType) {
    return res.status(401).json({ message: 'User not authorized.' });
  }

  try {
    const pool = await getConnection();

    // حالة الجلسة الجديدة تُحدد كـ "Waiting for Plan"
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`;

    // تعديل الاستعلام ليضيف عمود clientName
    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, 'Waiting for Plan')
      .input('greetingMessage', sql.NVarChar(sql.MAX), req.body.greetingMessage || null)
      .input('greetingActive', sql.Bit, req.body.greetingActive ? 1 : 0)
      .input('clientName', sql.NVarChar, user.name) // إضافة اسم العميل
      .query(`
        INSERT INTO Sessions 
          (userId, sessionIdentifier, status, greetingMessage, greetingActive, clientName)
        OUTPUT INSERTED.id
        VALUES 
          (@userId, @sessionIdentifier, @status, @greetingMessage, @greetingActive, @clientName)
      `);

    const newSessionId = insertSessionResult.recordset[0].id;

    // لا نقوم بتهيئة عميل الواتساب حتى يتم اختيار الخطة ودفع المبلغ.
    return res.status(201).json({ message: 'Session created successfully in Waiting for Plan state.', sessionId: newSessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: 'Error creating session.' });
  }
};

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

    // سنفترض أننا نصنفها كـ Paid مباشرة، 
    // أو "Waiting for Manager Confirmation" إن أردت.
    const status = 'Paid'

    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`

    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, status)
      .input('planType', sql.NVarChar, planType)
      .input('clientName', sql.NVarChar, user.name)
      .query(`
        INSERT INTO Sessions
          (userId, sessionIdentifier, status, planType, clientName)
        OUTPUT INSERTED.*
        VALUES
          (@userId, @sessionIdentifier, @status, @planType, @clientName)
      `)

    const newSession = insertSessionResult.recordset[0]

    // نعيد البيانات للعميل
    return res.status(201).json({
      message: 'Session created with Paid status.',
      session: newSession
    })
  } catch (error) {
    console.error('Error creating paid session:', error)
    return res.status(500).json({ message: 'Error creating paid session.' })
  }
}





export const choosePlan = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { planType } = req.body;
  if (!planType) {
    return res.status(400).json({ message: 'Plan type is required.' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('planType', sql.NVarChar, planType)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for Payment',
            planType = @planType
        WHERE id = @sessionId
      `);
    return res.status(200).json({ message: 'Plan chosen, waiting for payment.' });
  } catch (error) {
    console.error('Error choosing plan:', error);
    return res.status(500).json({ message: 'Error choosing plan.' });
  }
};

export const sendToManager = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Paid'
        WHERE id = @sessionId
      `);
    return res.status(200).json({ message: 'Session marked as Paid. Manager will confirm it.' });
  } catch (error) {
    console.error('Error sending session to manager:', error);
    return res.status(500).json({ message: 'Error sending session to manager.' });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Ready'
        WHERE id = @sessionId
      `);
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`);
    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier;
      await createWhatsAppClientForSession(sessionId, sessionIdentifier);
    }
    return res.status(200).json({ message: 'Payment confirmed, session is now ready.' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ message: 'Error confirming payment.' });
  }
};


export const rejectPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    
    // يكفي التحقق من ملكية الجلسة أو أن المستخدم مدير
    // checkSessionOwnership(pool, sessionId, req.user) 
    // أو فقط السماح لمن هو admin

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



export const confirmPaymentWithExpire = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { newExpireDate } = req.body;
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `);
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`);
    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier;
      await createWhatsAppClientForSession(sessionId, sessionIdentifier);
    }
    return res.status(200).json({ message: 'Payment confirmed and expire date set. Session is now ready.' });
  } catch (error) {
    console.error('Error confirming payment with expire date:', error);
    return res.status(500).json({ message: 'Error confirming payment with expire date.' });
  }
};



export const renewSubscription = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { newExpireDate } = req.body;
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `);
    return res.status(200).json({ message: 'Subscription renewed, session is now ready.' });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return res.status(500).json({ message: 'Error renewing subscription.' });
  }
};





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
  const { keyword, replyText } = req.body

  if (!keyword || !replyText) {
    return res.status(400).json({ message: 'keyword and replyText are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

    let replayId: number

    // البحث عن Replay بنفس النص (إذا كان موجودًا)
    const replaySearch = await pool.request()
      .input('replyText', sql.NVarChar, replyText)
      .query(`
        SELECT id FROM [dbo].[Replays]
        WHERE replyText = @replyText
      `)

    if (replaySearch.recordset.length > 0) {
      replayId = replaySearch.recordset[0].id
      // تحديث النص إن رغبت (اختياري)
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          UPDATE [dbo].[Replays]
          SET replyText = @replyText
          WHERE id = @replayId
        `)
    } else {
      // إنشاء Replay جديد (فقط النص)
      const replayInsert = await pool.request()
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          INSERT INTO [dbo].[Replays] (replyText)
          OUTPUT INSERTED.id
          VALUES (@replyText)
        `)
      replayId = replayInsert.recordset[0].id
    }

    // إضافة الـ Keyword
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('keyword', sql.NVarChar, keyword)
      .input('replay_id', sql.Int, replayId)
      .query(`
        INSERT INTO [dbo].[Keywords] (sessionId, keyword, replay_id)
        VALUES (@sessionId, @keyword, @replay_id)
      `)

    // قبل إدخال الملفات، تحقق إذا كان لهذا Replay ملفات موجودة بالفعل
    const existingMedia = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`SELECT COUNT(*) as cnt FROM ReplayMedia WHERE replayId = @replayId`)

    if (existingMedia.recordset[0].cnt === 0) {
      // إذا لم توجد ملفات، نقوم بإدخال الملفات المرفوعة (إذا كانت موجودة)
      const files = req.files as Express.Multer.File[]
      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = file.path // المسار الذي حفظه multer
          const originalName = file.originalname
          await pool.request()
            .input('replayId', sql.Int, replayId)
            .input('filePath', sql.NVarChar, filePath)
            .input('fileName', sql.NVarChar, originalName)
            .query(`
              INSERT INTO [dbo].[ReplayMedia] (replayId, filePath, fileName)
              VALUES (@replayId, @filePath, @fileName)
            `)
        }
      }
    }

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
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

    const queryResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT 
          k.id AS keywordId,
          k.keyword,
          r.id AS replayId,
          r.replyText,
          m.id AS mediaId,
          m.filePath AS mediaPath,
          m.fileName AS mediaName
        FROM Keywords k
        JOIN Replays r ON k.replay_id = r.id
        LEFT JOIN ReplayMedia m ON m.replayId = r.id
        WHERE k.sessionId = @sessionId
      `)

    // تجميع النتائج بحيث يكون لكل Keyword مصفوفة mediaFiles
    const rows = queryResult.recordset
    const map = new Map<number, any>()

    for (const row of rows) {
      if (!map.has(row.keywordId)) {
        map.set(row.keywordId, {
          keywordId: row.keywordId,
          keyword: row.keyword,
          replayId: row.replayId,
          replyText: row.replyText,
          mediaFiles: []
        })
      }
      if (row.mediaId) {
        map.get(row.keywordId).mediaFiles.push({
          mediaId: row.mediaId,
          mediaPath: row.mediaPath,
          mediaName: row.mediaName
        })
      }
    }

    const keywordsArray = Array.from(map.values())
    return res.status(200).json(keywordsArray)
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
  const { newKeyword, newReplyText } = req.body

  if (!newKeyword || !newReplyText) {
    return res.status(400).json({ message: 'newKeyword and newReplyText are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

    // استرجاع replay_id الخاص بالـ Keyword
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

    // تحديث الـ Keyword
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

    // تحديث نص الرد في Replays
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('newReplyText', sql.NVarChar, newReplyText)
      .query(`
        UPDATE Replays
        SET replyText = @newReplyText
        WHERE id = @replayId
      `)

    // حذف الملفات القديمة من ReplayMedia
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`)

    // إدخال الملفات الجديدة (إذا وُجدت)
    const files = req.files as Express.Multer.File[]
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = file.path
        const originalName = file.originalname
        await pool.request()
          .input('replayId', sql.Int, replayId)
          .input('filePath', sql.NVarChar, filePath)
          .input('fileName', sql.NVarChar, originalName)
          .query(`
            INSERT INTO [dbo].[ReplayMedia] (replayId, filePath, fileName)
            VALUES (@replayId, @filePath, @fileName)
          `)
      }
    }

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
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

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

    // تأكد هل لا يزال replay مستخدمًا؟
    const checkReplay = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT COUNT(*) as cnt
        FROM Keywords
        WHERE replay_id = @replayId
      `)

    if (checkReplay.recordset[0].cnt === 0) {
      // لا أحد يشير لهذا replay => نحذفه مع حذف ميديااته
      // أولاً نحذف سجلات ReplayMedia
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`)

      // ثم نحذف سجل الـ replay
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM Replays WHERE id = @replayId`)
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