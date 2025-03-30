// controllers/session/bot.controller.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnership } from './helpers';
import { whatsappClients } from '../whatsappClients';

/**
 * إيقاف الجلسة قسريًا
 */
export const forcePauseSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();

    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT id FROM Sessions WHERE id = @sessionId');
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Stopped by Admin')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `);

    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }

    return res.status(200).json({ message: 'Session forcibly paused by admin.' });
  } catch (error) {
    console.error('Error forcing pause session:', error);
    return res.status(500).json({ message: 'Error forcing pause session.' });
  }
};

/**
 * تشغيل الجلسة قسريًا
 */
export const forceStartSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();

    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId');
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const sessionIdentifier = sessionResult.recordset[0].sessionIdentifier;

    // استيراد دالة الإنشاء (بحسب موقعها لديك)
    const { createWhatsAppClientForSession } = await import('../whatsappClients');
    // await createWhatsAppClientForSession(sessionId, sessionIdentifier);

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newStatus', sql.NVarChar, 'Ready')
      .query(`
        UPDATE Sessions
        SET status = @newStatus
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'Session forcibly started by admin.' });
  } catch (error) {
    console.error('Error forcing start session:', error);
    return res.status(500).json({ message: 'Error forcing start session.' });
  }
};

/**
 * تحديث حالة البوت (botActive)
 */
export const updateBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { botActive } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('botActive', sql.Bit, botActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET botActive = @botActive
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'Bot status updated successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error updating bot status:', error);
    return res.status(500).json({ message: 'Error updating bot status.' });
  }
};

/**
 * تفعيل أو إيقاف الـ Menu Bot
 */
export const updateMenuBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { menuBotActive } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('menuBotActive', sql.Bit, menuBotActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET menuBotActive = @menuBotActive
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'MenuBot status updated successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error updating menu bot status:', error);
    return res.status(500).json({ message: 'Error updating menu bot status.' });
  }
};
