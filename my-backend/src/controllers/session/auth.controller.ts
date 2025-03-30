// controllers/session/auth.controller.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs-extra';
import { checkSessionOwnership } from './helpers';
import { whatsappClients } from '../whatsappClients';
import { createWhatsAppClientForSession } from '../whatsappClients';

/*
 * استرجاع رمز QR لجلسة معينة
 */
export const getQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT qrCode FROM Sessions WHERE id = @sessionId');

    if (result.recordset.length) {
      res.status(200).json({ qr: result.recordset[0].qrCode });
    } else {
      res.status(404).json({ message: 'Session not found' });
    }
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error fetching QR:', error);
    res.status(500).json({ message: 'Error fetching QR.' });
  }
};

/* 
  ================================
   دوال تسجيل الخروج / تسجيل الدخول 
  ================================
*/

/**
 * تسجيل الخروج من جلسة -> Terminated
 */
export const logoutSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    // اجلب البيانات وتأكد أن الجلسة موجودة
    const sessionRow = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT id FROM Sessions WHERE id = @sessionId`);
    if (!sessionRow.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // دمّر عميل الواتساب (إن وجد) ثم حدث الحالة
    const { whatsappClients } = await import('../whatsappClients');
    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Terminated')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'Session logged out (Terminated).' });
  } catch (error) {
    console.error('Error logging out session:', error);
    return res.status(500).json({ message: 'Error logging out session.' });
  }
};

/**
 * تسجيل الدخول مجددًا -> Ready + تشغيل الجلسة
 */
export const loginSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    // نتحقق من أن الجلسة حالتها Terminated (منطقيًا)
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT sessionIdentifier
        FROM Sessions
        WHERE id = @sessionId
      `);
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const sessionIdentifier = sessionResult.recordset[0].sessionIdentifier;

    // تحويلها إلى Ready
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Ready')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `);

    // // استدعاء دالة إنشاء عميل واتساب
    // await createWhatsAppClientForSession(sessionId, sessionIdentifier);

    return res.status(200).json({ message: 'Session re-logged in successfully. Now Ready.' });
  } catch (error) {
    console.error('Error logging in session:', error);
    return res.status(500).json({ message: 'Error logging in session.' });
  }
};

/**
 * بدء عملية إنشاء عميل واتساب واسترجاع رمز QR
 * يتم استدعاء هذا الـ endpoint عند الضغط على زر "Show QR Code"
 */
export const startQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  
  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    // تحديث حالة الجلسة إلى "Waiting for QR Code" وحذف رمز الـ QR الحالي
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Waiting for QR Code')
      .query(`
        UPDATE Sessions
        SET status = @newStatus, qrCode = NULL
        WHERE id = @sessionId
      `);

    // استرجاع sessionIdentifier للجلسة
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`);
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    const sessionIdentifier = sessionResult.recordset[0].sessionIdentifier;

    // بدء إنشاء عميل واتساب والذي سيتولى لاحقاً توليد رمز الـ QR
    await createWhatsAppClientForSession(sessionId, sessionIdentifier);

    return res.status(200).json({ message: 'QR generation initiated.' });
  } catch (error) {
    console.error('Error initiating QR generation:', error);
    return res.status(500).json({ message: 'Error initiating QR generation.' });
  }
};

/**
 * إلغاء عملية توليد رمز QR وإيقاف الجلسة
 * يتم استدعاء هذا الـ endpoint عند إغلاق المستخدم للـ popup قبل إتمام المسح
 */
export const cancelQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  
  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);
    
    // إذا كان هناك عميل واتساب نشط، قم بتدميره
    const { whatsappClients } = await import('../whatsappClients');
    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }
    
    // تحديث حالة الجلسة إلى Terminated وإزالة رمز الـ QR
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET  qrCode = NULL
        WHERE id = @sessionId
      `);
      
    return res.status(200).json({ message: 'QR generation cancelled and session terminated.' });
  } catch (error) {
    console.error('Error cancelling QR generation:', error);
    return res.status(500).json({ message: 'Error cancelling QR generation.' });
  }
};
