// src/controllers/otpController.ts

import { Request, Response } from 'express'
import { poolPromise } from '../config/db'
import { whatsappClients } from './whatsappClients'
import * as sql from 'mssql'

/**
 * توليد كود مكوّن من 4 أرقام عشوائية
 */
const generate4DigitOTP = (): string => {
  // نضمن أن يكون بين 1000 و 9999
  const otp = Math.floor(1000 + Math.random() * 9000)
  return otp.toString()
}

/**
 * دالة لإرسال OTP عبر واتساب
 */
export const sendOtpViaWhatsApp = async (req: Request, res: Response) => {
  try {
    // 1) استخراج userId من التوكن
    const userId = req.user && typeof req.user !== 'string' ? req.user.id : null
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized.' })
    }

    // 2) قراءة sessionId, phoneNumber من جسم الطلب
    const { sessionId, phoneNumber } = req.body
    if (!sessionId || !phoneNumber) {
      return res.status(400).json({ message: 'sessionId and phoneNumber are required.' })
    }

    // 3) تحقّق أنّ هذه الجلسة مملوكة لنفس user
    const pool = await poolPromise;
    const sessionRes = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id, status
        FROM Sessions
        WHERE id = @sessionId
          AND userId = @userId
      `)

    if (!sessionRes.recordset.length) {
      return res.status(404).json({ message: 'Session not found or not owned by this user.' })
    }

    const sessionRow = sessionRes.recordset[0]
    // بإمكانك التحقق من الحالة لو رغبت
    if (sessionRow.status !== 'Connected') {
      return res.status(400).json({ message: 'Session is not in Connected status.' })
    }

    // 4) ابحث عن الـ client
    const client = whatsappClients[sessionId]
    if (!client) {
      return res.status(404).json({ message: 'WhatsApp client not found or not initialized.' })
    }

    // 5) أنشئ كود الـ OTP
    const otpCode = generate4DigitOTP()

    // 6) أرسل الرسالة
    const chatId = `${phoneNumber}@c.us` // الصيغة المعروفة للرقم في واتساب
    const msgText = `رمز التحقق الخاص بك هو: ${otpCode}`

    await client.sendMessage(chatId, msgText)

    // 7) أعد الكود في الاستجابة
    return res.status(200).json({ otpCode })
  } catch (error) {
    console.error('Error sending OTP:', error)
    return res.status(500).json({ message: 'Internal server error while sending OTP.' })
  }
}


// سنستخدم دائماً sessionId=1 لإرسال OTP حسب رغبتك.
// أو يمكنك جعله ثابتاً في الكود:

/**
 * إرسال OTP عبر واتساب للمستخدم في خطوة التسجيل
 */
export const sendRegistrationOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'phoneNumber is required.' });
    }

    // تحقق إن كان الرقم مستخدمًا في جدول Users
    const pool = await poolPromise;
    const checkUser = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query('SELECT * FROM Users WHERE phoneNumber = @phoneNumber');

    if (checkUser.recordset.length > 0) {
      // الرقم موجود
      return res.status(400).json({
        message: 'This phone number is already registered and cannot be used for new registration.'
      });
    }

    // ابحث عن واتساب sessionId=1
    const FIXED_SESSION_ID = Number(process.env.FIXED_SESSION_ID );
    const client = whatsappClients[FIXED_SESSION_ID];
    if (!client) {
      return res.status(400).json({ message: `WhatsApp session with ID=${FIXED_SESSION_ID} is not initialized.` });
    }

    // أنشئ الكود
    const otpCode = generate4DigitOTP();

    // أرسل للمستخدم
    const chatId = phoneNumber.replace(/\D/g, '') + '@c.us'; // إزالة أي رموز غير رقمية
    const msgText = `Your verification code is: ${otpCode}`;
    await client.sendMessage(chatId, msgText);

    // خزّن الكود في جدول OtpCodes بصلاحية 5 دقائق
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
    console.error('Error sending registration OTP:', error);
    return res.status(500).json({ message: 'Internal server error while sending OTP.' });
  }
};

/**
 * التحقق من الـ OTP (يمكن استخدامه منفصلاً لو أردت)
 */
export const verifyRegistrationOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ message: 'phoneNumber and otpCode are required.' });
    }

    const pool = await poolPromise;
    const now = new Date();
    // ابحث عن سجل الـ OTP الذي لم يُستخدم بعد، ونفس رقم الموبايل، ونفس الكود، ولم ينتهِ بعد
    const result = await pool.request()
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

    if (!result.recordset.length) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // علّم السجل بأنه تم استخدامه
    const otpRow = result.recordset[0];
    await pool.request()
      .input('id', sql.Int, otpRow.id)
      .query(`
        UPDATE OtpCodes
        SET isUsed = 1
        WHERE id = @id
      `);

    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: 'Internal server error while verifying OTP.' });
  }
};