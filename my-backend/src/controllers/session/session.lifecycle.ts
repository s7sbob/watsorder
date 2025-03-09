// src/controllers/session/session.lifecycle.ts
import { getConnection } from '../../config/db';
import { createWhatsAppClientForSession } from '../whatsappClients';
import * as sql from 'mssql';
import { Request, Response } from 'express';
import { whatsappClients } from '../whatsappClients';

export const initializeExistingSessions = async () => {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT id, sessionIdentifier
    FROM Sessions
    WHERE status IN ('Connected', 'Waiting for QR Code')
  `);
  for (const record of result.recordset) {
    await createWhatsAppClientForSession(record.id, record.sessionIdentifier);
  }
};

export const forcePauseSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()

    // تحقق من وجود الجلسة
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT id FROM Sessions WHERE id = @sessionId')
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    // تحديث الحالة في قاعدة البيانات
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Stopped by Admin')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `)

    // إيقاف عميل الواتساب فعليًا
    const client = whatsappClients[sessionId]
    if (client) {
      await client.destroy()
      delete whatsappClients[sessionId]
    }

    return res.status(200).json({ message: 'Session forcibly paused by admin.' })
  } catch (error) {
    console.error('Error forcing pause session:', error)
    return res.status(500).json({ message: 'Error forcing pause session.' })
  }
};

export const forceStartSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()

    // تحقق من وجود الجلسة
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId')
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    const sessionIdentifier = sessionResult.recordset[0].sessionIdentifier

    // إعادة إنشاء عميل الواتساب
    await createWhatsAppClientForSession(sessionId, sessionIdentifier)

    // يمكنك إما ضبط الحالة مباشرة على "Connected" أو "Ready"
    // أو مبدئيًا "Waiting for QR Code" إذا لم تعد ملف التوثيق
    // وفي حال كان الملف موجود من قبل، غالبًا سترتبط الحالة بـ "Connected" إن تمت المصادقة فوراً
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Ready') // أو "Waiting for QR Code"
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Session forcibly started by admin.' })
  } catch (error) {
    console.error('Error forcing start session:', error)
    return res.status(500).json({ message: 'Error forcing start session.' })
  }
};
