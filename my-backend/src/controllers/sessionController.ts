import { Request, Response } from 'express';
import { getConnection } from '../config/db';
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

    // إنشاء الجلسة
    const { status, category, products, keywords } = req.body;
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`;

    await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, status || 'Inactive')
      .input('category', sql.NVarChar, category || null)
      .input('products', sql.NVarChar, products || null)
      .input('keywords', sql.NVarChar, keywords || null)
      .query(`
        INSERT INTO Sessions (userId, sessionIdentifier, status, category, products, keywords)
        VALUES (@userId, @sessionIdentifier, @status, @category, @products, @keywords)
      `);

    return res.status(201).json({ message: 'Session created successfully.' });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: 'Error creating session.' });
  }
};
