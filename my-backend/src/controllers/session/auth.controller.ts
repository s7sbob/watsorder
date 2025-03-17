// controllers/session/auth.controller.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs-extra';
import { checkSessionOwnership } from './helpers';
import { whatsappClients } from '../whatsappClients';
import { createWhatsAppClientForSession } from '../whatsappClients';

/**
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

/**
 * تسجيل الخروج من الجلسة
 */
export const logoutSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId');

    const { sessionIdentifier } = result.recordset[0];

    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }

    const folderPath = `.wwebjs_auth/session-${sessionIdentifier.replace(/[^A-Za-z0-9_-]/g, '_')}`;
    if (fs.existsSync(folderPath)) {
      await fs.remove(folderPath);
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Terminated',
            qrCode = NULL,
            phoneNumber = NULL
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'Session logged out successfully (files removed).' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found in DB.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error logging out session:', error);
    return res.status(500).json({ message: 'Error logging out session.' });
  }
};

/**
 * تسجيل الدخول مجددًا (إعادة تهيئة)
 */
export const loginSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId');

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const { sessionIdentifier } = result.recordset[0];
    await createWhatsAppClientForSession(sessionId, sessionIdentifier);

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for QR Code', qrCode = NULL
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'Session login initiated. Please scan the QR code.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error logging in session:', error);
    return res.status(500).json({ message: 'Error logging in session.' });
  }
};
