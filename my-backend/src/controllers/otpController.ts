// src/controllers/otpController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
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
    const pool = await getConnection()
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
