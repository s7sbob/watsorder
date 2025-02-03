// src/controllers/userController.ts
import { Request, Response } from 'express';
import { getConnection } from '../config/db';
import * as sql from 'mssql';
import bcrypt from 'bcrypt';

// جلب جميع المستخدمين
export const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  // تحقق: هل المستخدم admin؟
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT id, username, name, subscriptionStart, subscriptionEnd, subscriptionType 
      FROM Users
    `);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
};

// إنشاء مستخدم جديد
export const createUser = async (req: Request, res: Response): Promise<Response> => {
  // تحقق: هل المستخدم admin؟
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }

  const { username, password, name, subscriptionStart, subscriptionEnd, subscriptionType } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  try {
    const pool = await getConnection();

    // تحقق إذا كان اسم المستخدم موجود بالفعل
    const checkUser = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('name', sql.NVarChar, name || null)
      .input('password', sql.NVarChar, hashedPassword)
      .input('subscriptionStart', sql.NVarChar, subscriptionStart || null)
      .input('subscriptionEnd', sql.NVarChar, subscriptionEnd || null)
      .input('subscriptionType', sql.NVarChar, subscriptionType || 'free')
      .query(`
        INSERT INTO Users (username, name, password, subscriptionStart, subscriptionEnd, subscriptionType)
        VALUES (@username, @name, @password, @subscriptionStart, @subscriptionEnd, @subscriptionType)
      `);

    return res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating user' });
  }
};

// تعديل بيانات المستخدم
export const updateUser = async (req: Request, res: Response): Promise<Response> => {
  // تحقق: هل المستخدم admin؟
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }

  const { id } = req.params;
  const { username, name, password, subscriptionStart, subscriptionEnd, subscriptionType } = req.body;

  try {
    const pool = await getConnection();
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    let query = `
      UPDATE Users 
      SET username = @username, 
          name = @name, 
          subscriptionStart = @subscriptionStart, 
          subscriptionEnd = @subscriptionEnd,
          subscriptionType = @subscriptionType
    `;

    if (hashedPassword) {
      query += `, password = @password`;
    }
    query += ` WHERE id = @id`;

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.NVarChar, username)
      .input('name', sql.NVarChar, name)
      .input('subscriptionStart', sql.NVarChar, subscriptionStart || null)
      .input('subscriptionEnd', sql.NVarChar, subscriptionEnd || null)
      .input('subscriptionType', sql.NVarChar, subscriptionType);

    if (hashedPassword) {
      request.input('password', sql.NVarChar, hashedPassword);
    }

    await request.query(query);
    return res.status(200).json({ message: 'تم تحديث بيانات المستخدم بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating user' });
  }
};

// حذف مستخدم
export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
  // تحقق: هل المستخدم admin؟
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }

  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Users WHERE id = @id');
    return res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
};
