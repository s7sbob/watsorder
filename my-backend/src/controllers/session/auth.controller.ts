// src/controllers/session/auth.controller.ts

import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs-extra';
import path from 'path';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';
import { whatsappClients } from '../whatsappClients';
import { createWhatsAppClientForSession } from '../whatsappClients';

/*
 * استرجاع رمز QR لجلسة معينة
 */
export const getQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await poolPromise;
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
  ======================================
   دوال تسجيل الخروج / تسجيل الدخول 
  ======================================
*/

/**
 * تسجيل الخروج -> Terminated + حذف LocalAuth
 */
export const logoutSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);

    // جلب بيانات الجلسة
    const sessionRow = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, sessionIdentifier
        FROM Sessions
        WHERE id = @sessionId
      `);

    if (!sessionRow.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const { sessionIdentifier } = sessionRow.recordset[0];

    // 1) تدمير عميل الواتساب (إن وجد)
    const client = whatsappClients[sessionId];
    if (client) {
      try {
        await client.destroy();
      } catch (err) {
        // لو الخطأ بسبب "Target closed", نتجاهله:
        if (String(err).includes('Target closed')) {
          console.warn('Ignoring Puppeteer "Target closed" error on destroy()');
        } else {
          console.warn('Ignoring other destroy() error =>', err);
        }
      }
      delete whatsappClients[sessionId];
    }

    // 2) حذف مجلد LocalAuth لمنع إعادة استعمال الجلسة
    const baseAuthPath = 'C:\\inetpub\\vhosts\\watsorder.com\\api.watsorder.com\\dist\\.wwebjs_auth';
    const authPath = path.join(baseAuthPath, `session-${sessionIdentifier}`);
    
    console.log('[logoutSession] Attempting to remove auth folder =>', authPath);
    
    if (fs.existsSync(authPath)) {
      console.log('[logoutSession] Auth folder exists. Removing now...');
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('[logoutSession] Successfully removed folder =>', authPath);
    } else {
      console.log('[logoutSession] Auth folder does NOT exist =>', authPath);
    }
    

    // 3) تغيير حالة الجلسة إلى Terminated
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Terminated')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `);

    return res.status(200).json({
      message: 'Session logged out (Terminated) and local auth removed.'
    });
  } catch (error) {
    console.error('Error logging out session:', error);
    return res.status(500).json({ message: 'Error logging out session.' });
  }
};

/**
 * تسجيل الدخول مجددًا -> Ready (من دون إنشاء عميل واتساب)
 */
export const loginSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);

    // تحقق من وجود الجلسة
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

    // فقط نجعلها Ready
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Ready')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `);

    // **لا** ننشئ عميل واتساب الآن. المستخدم عليه الضغط على "Show QR Code"
    // إذا أراد فعليًا إعادة تشغيل الواتساب.

    return res.status(200).json({
      message: 'Session re-logged in (status=Ready).'
    });
  } catch (error) {
    console.error('Error logging in session:', error);
    return res.status(500).json({ message: 'Error logging in session.' });
  }
};

/**
 * بدء عملية إنشاء عميل واتساب -> status = "Waiting for QR Code" + create client
 */
export const startQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);

    // set status=Waiting for QR Code, qrCode=NULL
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Waiting for QR Code')
      .query(`
        UPDATE Sessions
        SET status = @newStatus,
            qrCode = NULL
        WHERE id = @sessionId
      `);

    // جلب sessionIdentifier
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

    // أنشئ عميل واتساب. سيولّد الـ QR في حدث client.on('qr')
    await createWhatsAppClientForSession(sessionId, sessionIdentifier);

    return res.status(200).json({ message: 'QR generation initiated.' });
  } catch (error) {
    console.error('Error initiating QR generation:', error);
    return res.status(500).json({ message: 'Error initiating QR generation.' });
  }
};

/**
 * إلغاء عملية توليد QR -> تدمير العميل + الحالة Ready
 */
export const cancelQrForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  
  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);
    
    const client = whatsappClients[sessionId];
    if (client) {
      try {
        await client.destroy();
      } catch (err) {
        if (String(err).includes('Target closed')) {
          console.warn('Ignoring Puppeteer "Target closed" error on destroy()');
        } else {
          console.warn('Ignoring other destroy() error =>', err);
        }
      }
      delete whatsappClients[sessionId];
    }
    
    // إذا أردت أيضًا حذف localAuth، يمكنك فعل نفس الشيء كما في logoutSession:
    // const sessionRow = await pool.request()
    //   .input('sessionId', sql.Int, sessionId)
    //   .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`);
    // if (sessionRow.recordset.length) {
    //   const { sessionIdentifier } = sessionRow.recordset[0];
    //   const authPath = path.join(process.cwd(), '.wwebjs_auth', `session-${sessionIdentifier}`);
    //   if (fs.existsSync(authPath)) {
    //     fs.rmSync(authPath, { recursive: true, force: true });
    //   }
    // }

    // هنا نعيد الحالة إلى Ready
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET qrCode = NULL,
            status = 'Ready'
        WHERE id = @sessionId
      `);

    return res.status(200).json({
      message: 'QR generation cancelled, client destroyed, session is now Ready.'
    });
  } catch (error) {
    console.error('Error cancelling QR generation:', error);
    return res.status(500).json({ message: 'Error cancelling QR generation.' });
  }
};
