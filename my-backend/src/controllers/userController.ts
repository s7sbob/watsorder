// src/controllers/userController.ts
import { Request, Response } from 'express';
import { poolPromise } from '../config/db';
import * as sql from 'mssql';
import bcrypt from 'bcrypt';
import { getUserById } from '../utils/sessionUserChecks';

// جلب كافة المستخدمين (للمسؤول) مع كافة الحقول
export const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT u.ID, 
             u.name, 
             u.subscriptionStart, 
             u.subscriptionEnd, 
             u.subscriptionType,
             u.parentId, 
             u.maxSessions, 
             u.subUserRole, 
             u.phoneNumber, 
             u.createdAt,
             COUNT(s.id) as activeSessions
      FROM Users u
      LEFT JOIN Sessions s 
        ON s.userId = u.ID 
       AND s.status NOT IN ('Terminated', 'Expired')
      GROUP BY u.ID, u.name, u.subscriptionStart, u.subscriptionEnd, u.subscriptionType, u.parentId, u.maxSessions, u.subUserRole, u.phoneNumber, u.createdAt
    `);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
};


// جلب الحسابات الفرعية لحساب وكالة معيّن
export const getSubAccounts = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }
  const { agencyId } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('agencyId', sql.Int, agencyId)
      .query(`
        SELECT ID, 
               name, 
               subscriptionStart, 
               subscriptionEnd, 
               subscriptionType,
               parentId, 
               phoneNumber, 
               createdAt
        FROM Users
        WHERE parentId = @agencyId
      `);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching subordinate accounts' });
  }
};

// إنشاء مستخدم جديد (يمكن للمسؤول إنشاء حسابات عادية أو حسابات وكالة)
// نستخدم phoneNumber بدلاً من username
export const createUser = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }
  const { password, name, subscriptionStart, subscriptionEnd, subscriptionType, parentId, maxSessions, subUserRole, phoneNumber } = req.body;
  if (!phoneNumber || !password) {
    return res.status(400).json({ message: 'يرجى إدخال رقم الموبايل وكلمة المرور' });
  }
  try {
    const pool = await poolPromise;
    // التأكد من عدم تكرار رقم الموبايل
    const checkUser = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query('SELECT * FROM Users WHERE phoneNumber = @phoneNumber');
    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'رقم الموبايل موجود بالفعل' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.request()
      .input('name', sql.NVarChar, name || null)
      .input('password', sql.NVarChar, hashedPassword)
      .input('subscriptionStart', sql.NVarChar, subscriptionStart || null)
      .input('subscriptionEnd', sql.NVarChar, subscriptionEnd || null)
      .input('subscriptionType', sql.NVarChar, subscriptionType || 'free')
      .input('parentId', sql.Int, parentId || null)
      .input('maxSessions', sql.Int, maxSessions || 1)
      .input('subUserRole', sql.NVarChar, subUserRole || '')
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query(`
        INSERT INTO Users (name, password, subscriptionStart, subscriptionEnd, subscriptionType, parentId, maxSessions, subUserRole, phoneNumber)
        VALUES (@name, @password, @subscriptionStart, @subscriptionEnd, @subscriptionType, @parentId, @maxSessions, @subUserRole, @phoneNumber)
      `);
    return res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating user' });
  }
};

// تعديل بيانات المستخدم
export const updateUser = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }
  const { id } = req.params;
  const { password, name, subscriptionStart, subscriptionEnd, subscriptionType, parentId, maxSessions, subUserRole, phoneNumber } = req.body;
  try {
    const pool = await poolPromise;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    let query = `
      UPDATE Users 
      SET name = @name, 
          subscriptionStart = @subscriptionStart, 
          subscriptionEnd = @subscriptionEnd,
          subscriptionType = @subscriptionType,
          parentId = @parentId,
          maxSessions = @maxSessions,
          subUserRole = @subUserRole,
          phoneNumber = @phoneNumber
    `;
    if (hashedPassword) {
      query += `, password = @password`;
    }
    query += ` WHERE ID = @id`;
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('subscriptionStart', sql.NVarChar, subscriptionStart || null)
      .input('subscriptionEnd', sql.NVarChar, subscriptionEnd || null)
      .input('subscriptionType', sql.NVarChar, subscriptionType)
      .input('parentId', sql.Int, parentId || null)
      .input('maxSessions', sql.Int, maxSessions || 1)
      .input('subUserRole', sql.NVarChar, subUserRole || '')
      .input('phoneNumber', sql.NVarChar, phoneNumber);
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
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Users WHERE ID = @id');
    return res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
};
