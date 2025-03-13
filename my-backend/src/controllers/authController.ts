// src/controllers/authController.ts
import { NextFunction, Request, Response } from 'express';
import { getConnection } from '../config/db';
import bcrypt from 'bcrypt';
import * as sql from 'mssql';
import jwt from 'jsonwebtoken';
import { MyJwtPayload } from '../types/MyJwtPayload';

// ====== تعديل التسجيل ====== //
export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  // نتوقع من الواجهة: { phoneNumber, name, password, otpCode, companyName, country, address, contactPhone }
  const { phoneNumber, name, password, otpCode, companyName, country, address, contactPhone } = req.body;

  if (!phoneNumber || !password || !otpCode) {
    return res.status(400).json({ message: 'يرجى ملء الحقول المطلوبة: phoneNumber, password, otpCode' });
  }

  try {
    const pool = await getConnection();

    // التحقق من OTP
    const now = new Date();
    const otpResult = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .input('otpCode', sql.NVarChar, otpCode)
      .input('now', sql.DateTime, now)
      .query(`
        SELECT TOP 1 * 
        FROM OtpCodes
        WHERE phoneNumber = @phoneNumber
          AND otpCode = @otpCode
          AND isUsed = 0
          AND expiresAt > @now
        ORDER BY id DESC
      `);

    if (!otpResult.recordset.length) {
      return res.status(400).json({ message: 'OTP غير صالح أو منتهي.' });
    }

    const otpRow = otpResult.recordset[0];
    await pool.request()
      .input('id', sql.Int, otpRow.id)
      .query(`UPDATE OtpCodes SET isUsed = 1 WHERE id = @id`);

    // التحقق من وجود المستخدم مسبقاً
    const checkUser = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query('SELECT * FROM Users WHERE phoneNumber = @phoneNumber');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'رقم الموبايل هذا مسجّل بالفعل.' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء المستخدم مع الحقول الجديدة (بدون حقل logo)
    await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .input('name', sql.NVarChar, name || null)
      .input('password', sql.NVarChar, hashedPassword)
      .input('companyName', sql.NVarChar, companyName || null)
      .input('country', sql.NVarChar, country || null)
      .input('address', sql.NVarChar, address || null)
      .input('contactPhone', sql.NVarChar, contactPhone || null)
      .query(`
        INSERT INTO Users (phoneNumber, name, password, companyName, country, address, contactPhone)
        VALUES (@phoneNumber, @name, @password, @companyName, @country, @address, @contactPhone)
      `);

    return res.status(201).json({ message: 'تم التسجيل بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'خطأ في الخادم أثناء التسجيل' });
  }
};

// ====== تعديل تسجيل الدخول ====== //
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  // الآن بدلاً من username، سنستخدم phoneNumber
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: 'يرجى ملء جميع الحقول: phoneNumber, password' });
  }

  try {
    const pool = await getConnection();

    // التحقق من وجود المستخدم بهذه القيمة
    const result = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query('SELECT * FROM Users WHERE phoneNumber = @phoneNumber');

    const user = result.recordset[0];

    if (!user) {
      return res.status(400).json({ message: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
    }

    // إنشاء التوكين (JWT) وتضمين بيانات المستخدم
    const token = jwt.sign(
      {
        id: user.ID,
        phoneNumber: user.phoneNumber,
        subscriptionType: user.subscriptionType,
        name: user.name,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        createdAt: user.createdAt,
        maxSessions: user.maxSessions,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    return res.status(200).json({ message: 'تم تسجيل الدخول بنجاح', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'خطأ في الخادم أثناء تسجيل الدخول' });
  }
};

// ====== فك تشفير التوكن (كما هو سابقاً) ====== //
export const verifyToken = (req: Request, res: Response, next: NextFunction): Response | void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'التوكين غير موجود' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    if (typeof decoded === 'string') {
      return res.status(401).json({ message: 'Invalid token payload (string).' });
    }

    const customPayload = decoded as MyJwtPayload;
    req.user = customPayload;

    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ message: 'التوكين غير صالح' });
  }
};
