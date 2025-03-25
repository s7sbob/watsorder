// src/controllers/authController.ts
import { NextFunction, Request, Response } from 'express';
import { getConnection } from '../config/db';
import bcrypt from 'bcrypt';
import * as sql from 'mssql';
import jwt from 'jsonwebtoken';
import { MyJwtPayload } from '../types/MyJwtPayload';
import { whatsappClients } from './whatsappClients';

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

/**
 * توليد كود مكوّن من 4 أرقام عشوائية
 */
const generate4DigitOTP = (): string => {
  // نضمن أن يكون بين 1000 و 9999
  const otp = Math.floor(1000 + Math.random() * 9000)
  return otp.toString()
}

/**
 * Endpoint لإرسال OTP لاستعادة كلمة المرور.
 * يتحقق أولاً مما إذا كان رقم الهاتف مسجلاً، ثم يُرسل OTP.
 */
export const sendForgotPasswordOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: 'phoneNumber is required.' });
    }
    
    // Check if the phone number is registered (for forgot password, it must exist)
    const pool = await getConnection();
    const userResult = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query('SELECT * FROM Users WHERE phoneNumber = @phoneNumber');
      
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'This phone number is not registered. Please sign up instead.' });
    }
    
    // Use the same fixed WhatsApp session (e.g., sessionId = 2)
    const FIXED_SESSION_ID = Number(process.env.FIXED_SESSION_ID );
    const client = whatsappClients[FIXED_SESSION_ID];
    if (!client) {
      return res.status(400).json({ message: `WhatsApp session with ID=${FIXED_SESSION_ID} is not initialized.` });
    }
    
    // Generate a 4-digit OTP
    const otpCode = generate4DigitOTP();
    
    // Send the OTP to the user via WhatsApp
    const chatId = phoneNumber.replace(/\D/g, '') + '@c.us';
    const msgText = `Your password reset OTP is: ${otpCode}`;
    await client.sendMessage(chatId, msgText);
    
    // Store the OTP in the OtpCodes table with a 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .input('otpCode', sql.NVarChar, otpCode)
      .input('expiresAt', sql.DateTime, expiresAt)
      .query(`
        INSERT INTO OtpCodes (phoneNumber, otpCode, expiresAt)
        VALUES (@phoneNumber, @otpCode, @expiresAt)
      `);
      
    return res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Error sending forgot password OTP:', error);
    return res.status(500).json({ message: 'Internal server error while sending OTP.' });
  }
};

/**
 * Endpoint لإعادة تعيين كلمة المرور بعد التحقق من OTP.
 */
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  const { phoneNumber, otpCode, newPassword } = req.body;
  try {
    const pool = await getConnection();
    // تحقق من OTP (في التطبيق الحقيقي استخدم خدمة OTP للتحقق)
    if (otpCode !== '1234') { // هنا مجرد مثال؛ استبدله بمنطق التحقق الفعلي
      return res.status(400).json({ message: 'رمز التحقق غير صحيح.' });
    }
    // التأكد من وجود المستخدم
    const userResult = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query(`SELECT * FROM Users WHERE phoneNumber = @phoneNumber`);
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'رقم الهاتف غير مسجل.' });
    }
    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // تحديث كلمة المرور للمستخدم
    await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .input('password', sql.NVarChar, hashedPassword)
      .query(`UPDATE Users SET password = @password WHERE phoneNumber = @phoneNumber`);
    return res.status(200).json({ message: 'تم إعادة تعيين كلمة المرور بنجاح.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'حدث خطأ أثناء إعادة تعيين كلمة المرور.' });
  }
};


/**
 * Endpoint to verify OTP for forgot password flow.
 * Expects { phoneNumber, otpCode } in the request body.
 */
export const verifyForgotPasswordOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phoneNumber, otpCode } = req.body;
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ message: 'phoneNumber and otpCode are required.' });
    }
    
    const pool = await getConnection();
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
      
    if (otpResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    
    // Mark the OTP as used
    const otpRow = otpResult.recordset[0];
    await pool.request()
      .input('id', sql.Int, otpRow.id)
      .query(`UPDATE OtpCodes SET isUsed = 1 WHERE id = @id`);
      
    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: 'Internal server error while verifying OTP.' });
  }
};