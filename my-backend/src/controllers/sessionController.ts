// src\controllers\sessionController.ts
import { Request, Response } from 'express';
import { getConnection } from '../config/db';
import { createWhatsAppClientForSession, whatsappClients } from './whatsappClients';
import * as sql from 'mssql';

// جلب الجلسات بناءً على المستخدم
export const fetchSessions = async (req: Request, res: Response) => {
  const userId = req.user && typeof req.user !== 'string' ? req.user.id : null;

  if (!userId) {
    return res.status(401).json({ message: 'User not authorized.' });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT * FROM Sessions WHERE userId = @userId`);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(error);
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

    // جلب عدد الجلسات الحالية للمستخدم
    const sessionCountResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT COUNT(*) as sessionCount FROM Sessions WHERE userId = @userId');
    const sessionCount = sessionCountResult.recordset[0].sessionCount;

    // جلب maxSessions من جدول المستخدمين
    const maxSessionsResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT maxSessions FROM Users WHERE ID = @userId');
    const maxSessions = maxSessionsResult.recordset[0]?.maxSessions || 0;

    // التحقق من الحد الأقصى للجلسات
    if (sessionCount >= maxSessions) {
      return res.status(400).json({ message: 'Maximum session limit reached.' });
    }

    // بيانات الجلسة من الطلب، بما في ذلك رسائل الترحيب
    const { status, category, products, keywords, greetingMessage, greetingActive } = req.body;
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`;

    // إدخال سجل الجلسة الجديد والحصول على معرّف الجلسة
    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, status || 'Inactive')
      .input('category', sql.NVarChar, category || null)
      .input('products', sql.NVarChar, products || null)
      .input('keywords', sql.NVarChar, keywords || null)
      .input('greetingMessage', sql.NVarChar(sql.MAX), greetingMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        INSERT INTO Sessions 
          (userId, sessionIdentifier, status, category, products, keywords, greetingMessage, greetingActive)
        OUTPUT INSERTED.id
        VALUES 
          (@userId, @sessionIdentifier, @status, @category, @products, @keywords, @greetingMessage, @greetingActive)
      `);
    const newSessionId = insertSessionResult.recordset[0].id;

    // بناء أسماء الجداول استنادًا إلى بيانات الجلسة
    const subscriptionType = user.subscriptionType;
    const categoryTableName = `Category_${user.id}_${subscriptionType}_${newSessionId}_3`;
    const productsTableName = `Products_${user.id}_${subscriptionType}_${newSessionId}_3`;
    const keywordsTableName = `Keywords_${user.id}_${subscriptionType}_${newSessionId}_3`;

    // إنشاء الجداول الثلاثة
    const createCategoryTableSQL = `
      CREATE TABLE [dbo].[${categoryTableName}] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [category_name] NVARCHAR(150) NULL
      )
    `;
    const createProductsTableSQL = `
      CREATE TABLE [dbo].[${productsTableName}] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [product_name] NVARCHAR(100) NULL,
        [category_id] INT NULL
      )
    `;
    const createKeywordsTableSQL = `
      CREATE TABLE [dbo].[${keywordsTableName}] (
        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [keyword] NVARCHAR(500) NULL,
        [reply] NVARCHAR(500) NULL
      )
    `;

    await pool.request().query(createCategoryTableSQL);
    await pool.request().query(createProductsTableSQL);
    await pool.request().query(createKeywordsTableSQL);
    await createWhatsAppClientForSession(newSessionId, sessionIdentifier);

    // تحديث سجل الجلسة بأسماء الجداول
    await pool.request()
      .input('sessionId', sql.Int, newSessionId)
      .input('categoryTable', sql.NVarChar, categoryTableName)
      .input('productsTable', sql.NVarChar, productsTableName)
      .input('keywordsTable', sql.NVarChar, keywordsTableName)
      .query(`
        UPDATE Sessions 
        SET category = @categoryTable, products = @productsTable, keywords = @keywordsTable
        WHERE id = @sessionId
      `);

    return res.status(201).json({ message: 'Session created successfully.' });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: 'Error creating session.' });
  }
};

export const updateBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { botActive } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()

    // تحديث القيمة في جدول Sessions
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


export const deleteSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  try {
    const pool = await getConnection();
    // جلب أسماء الجداول المرتبطة بالجلسة (كما في الكود السابق)
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT category, products, keywords FROM Sessions WHERE id = @sessionId');
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    const { category, products, keywords } = sessionResult.recordset[0];

    // حذف الجداول
    const dropCategoryTableSQL = `IF OBJECT_ID(N'[dbo].[${category}]', 'U') IS NOT NULL DROP TABLE [dbo].[${category}]`;
    const dropProductsTableSQL = `IF OBJECT_ID(N'[dbo].[${products}]', 'U') IS NOT NULL DROP TABLE [dbo].[${products}]`;
    const dropKeywordsTableSQL = `IF OBJECT_ID(N'[dbo].[${keywords}]', 'U') IS NOT NULL DROP TABLE [dbo].[${keywords}]`;

    await pool.request().query(dropCategoryTableSQL);
    await pool.request().query(dropProductsTableSQL);
    await pool.request().query(dropKeywordsTableSQL);

    // إغلاق اتصال عميل واتساب إن وجد
    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();  // إيقاف العميل وإغلاق الاتصال
      delete whatsappClients[sessionId];  // إزالة العميل من الخريطة
    }

    // حذف السجل من جدول Sessions
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('DELETE FROM Sessions WHERE id = @sessionId');

    return res.status(200).json({ message: 'Session and related tables deleted successfully.' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ message: 'Error deleting session.' });
  }
};

export const updateGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { greetingMessage, greetingActive } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('greetingMessage', sql.NVarChar(sql.MAX), greetingMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET greetingMessage = @greetingMessage, greetingActive = @greetingActive
        WHERE id = @sessionId
      `);
    res.status(200).json({ message: 'Greeting updated successfully.' });
  } catch (error) {
    console.error('Error updating greeting:', error);
    res.status(500).json({ message: 'Error updating greeting.' });
  }
};

// دالة مساعدة لاستخراج اسم الجدول من سجل الجلسة
const getSessionTableNames = async (pool: sql.ConnectionPool, sessionId: number) => {
  const result = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query('SELECT category, products, keywords FROM Sessions WHERE id = @sessionId');
  if (!result.recordset.length) {
    throw new Error('Session not found');
  }
  return result.recordset[0];
};

const initializeExistingSessions = async () => {
  const pool = await getConnection();
  const result = await pool.request().query(`SELECT id, sessionIdentifier, status FROM Sessions WHERE status IN ('Connected', 'Waiting for QR Code')`);
  for (const session of result.recordset) {
    // إنشاء عميل واتساب لكل جلسة مسترجعة
    await createWhatsAppClientForSession(session.id, session.sessionIdentifier);
  }
};


// نشاء مسار API لاسترجاع رمز QR لجلسة معينة
export const getQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT qrCode FROM Sessions WHERE id = @sessionId');
    if (result.recordset.length) {
      res.status(200).json({ qr: result.recordset[0].qrCode });
    } else {
      res.status(404).json({ message: 'Session not found' });
    }
  } catch (error) {
    console.error('Error fetching QR:', error);
    res.status(500).json({ message: 'Error fetching QR.' });
  }
};


// بعد بدء الخادم واستضافة المسارات
initializeExistingSessions().catch(console.error);

// إضافة Category جديد
export const addCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { category_name } = req.body;
  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' });
  }
  try {
    const pool = await getConnection();
    const { category: categoryTable } = await getSessionTableNames(pool, sessionId);
    const insertSQL = `INSERT INTO [dbo].[${categoryTable}] (category_name) VALUES (@category_name)`;
    await pool.request()
      .input('category_name', sql.NVarChar, category_name)
      .query(insertSQL);
    return res.status(201).json({ message: 'Category added successfully.' });
  } catch (error) {
    console.error('Error adding category:', error);
    return res.status(500).json({ message: 'Error adding category.' });
  }
};

// إضافة API لجلب الفئات (Categories) الخاصة بجلسة معينة
export const getCategoriesForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  try {
    const pool = await getConnection();
    const { category: categoryTable } = await getSessionTableNames(pool, sessionId);
    const result = await pool.request().query(`
      SELECT id, category_name FROM [dbo].[${categoryTable}]
    `);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ message: 'Error fetching categories.' });
  }
};

// دوال تحديث وحذف الفئات والمنتجات
export const updateCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const categoryId = parseInt(req.params.categoryId, 10);
  const { category_name } = req.body;
  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' });
  }
  try {
    const pool = await getConnection();
    const { category: categoryTable } = await getSessionTableNames(pool, sessionId);
    const updateSQL = `
      UPDATE [dbo].[${categoryTable}]
      SET category_name = @category_name
      WHERE id = @categoryId
    `;
    await pool.request()
      .input('category_name', sql.NVarChar, category_name)
      .input('categoryId', sql.Int, categoryId)
      .query(updateSQL);
    return res.status(200).json({ message: 'Category updated successfully.' });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ message: 'Error updating category.' });
  }
};

// حذف الفئة
export const deleteCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const categoryId = parseInt(req.params.categoryId, 10);
  try {
    const pool = await getConnection();
    const { category: categoryTable } = await getSessionTableNames(pool, sessionId);
    const deleteSQL = `
      DELETE FROM [dbo].[${categoryTable}]
      WHERE id = @categoryId
    `;
    await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query(deleteSQL);
    return res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Error deleting category.' });
  }
};

// تحديث المنتج
export const updateProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const productId = parseInt(req.params.productId, 10);
  const { product_name, category_id } = req.body;
  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' });
  }
  try {
    const pool = await getConnection();
    const { products: productsTable } = await getSessionTableNames(pool, sessionId);
    const updateSQL = `
      UPDATE [dbo].[${productsTable}]
      SET product_name = @product_name,
          category_id = @category_id
      WHERE id = @productId
    `;
    await pool.request()
      .input('product_name', sql.NVarChar, product_name)
      .input('category_id', sql.Int, category_id)
      .input('productId', sql.Int, productId)
      .query(updateSQL);
    return res.status(200).json({ message: 'Product updated successfully.' });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Error updating product.' });
  }
};

// حذف المنتج
export const deleteProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const productId = parseInt(req.params.productId, 10);
  try {
    const pool = await getConnection();
    const { products: productsTable } = await getSessionTableNames(pool, sessionId);
    const deleteSQL = `
      DELETE FROM [dbo].[${productsTable}]
      WHERE id = @productId
    `;
    await pool.request()
      .input('productId', sql.Int, productId)
      .query(deleteSQL);
    return res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Error deleting product.' });
  }
};


// دالة لاسترجاع المنتجات
export const getProductsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  try {
    const pool = await getConnection();
    const { products: productsTable } = await getSessionTableNames(pool, sessionId);
    const result = await pool.request().query(`
      SELECT id, product_name, category_id FROM [dbo].[${productsTable}]
    `);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Error fetching products.' });
  }
};


// إضافة Product جديد
export const addProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { product_name, category_id } = req.body;
  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' });
  }
  try {
    const pool = await getConnection();
    const { products: productsTable } = await getSessionTableNames(pool, sessionId);
    const insertSQL = `
      INSERT INTO [dbo].[${productsTable}] (product_name, category_id)
      VALUES (@product_name, @category_id)
    `;
    await pool.request()
      .input('product_name', sql.NVarChar, product_name)
      .input('category_id', sql.Int, category_id)
      .query(insertSQL);
    return res.status(201).json({ message: 'Product added successfully.' });
  } catch (error) {
    console.error('Error adding product:', error);
    return res.status(500).json({ message: 'Error adding product.' });
  }
};


// إضافة Keyword جديد
export const addKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { keyword, reply } = req.body;
  if (!keyword) {
    return res.status(400).json({ message: 'keyword is required.' });
  }
  try {
    const pool = await getConnection();
    const { keywords: keywordsTable } = await getSessionTableNames(pool, sessionId);
    const insertSQL = `INSERT INTO [dbo].[${keywordsTable}] (keyword, reply) VALUES (@keyword, @reply)`;
    await pool.request()
      .input('keyword', sql.NVarChar, keyword)
      .input('reply', sql.NVarChar, reply || null)
      .query(insertSQL);
    return res.status(201).json({ message: 'Keyword added successfully.' });
  } catch (error) {
    console.error('Error adding keyword:', error);
    return res.status(500).json({ message: 'Error adding keyword.' });
  }
};