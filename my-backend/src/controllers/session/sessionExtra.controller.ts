// controllers/session/sessionExtra.controller.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs-extra';
import { checkSessionOwnership } from './helpers';
import { whatsappClients } from '../whatsappClients';

/**
 * تحديث رسالة الترحيب
 */
export const updateGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { greetingMessage, greetingActive } = req.body;
  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('greetingMessage', sql.NVarChar(sql.MAX), greetingMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET greetingMessage = @greetingMessage, greetingActive = @greetingActive
        WHERE id = @sessionId
      `);
    res.status(200).json({ message: 'Greeting updated successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error updating greeting:', error);
    res.status(500).json({ message: 'Error updating greeting.' });
  }
};

/**
 * جلب رسالة الترحيب
 */
export const getGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT greetingMessage, greetingActive
        FROM Sessions
        WHERE id = @sessionId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const row = result.recordset[0];
    return res.status(200).json({
      greetingMessage: row.greetingMessage || '',
      greetingActive: row.greetingActive === true
    });
  } catch (error) {
    console.error('Error fetching greeting:', error);
    return res.status(500).json({ message: 'Error fetching greeting.' });
  }
};

/**
 * حذف جلسة
 */
export const deleteSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  try {
    const pool = await getConnection();

    // التحقق من الملكية (كما في السابق)
    await checkSessionOwnership(pool, sessionId, req.user);

    // لو العميل واتساب شغّال، ندمّره
    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }

    // 1) حذف الجلسة فعلياً من Sessions
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Sessions
        WHERE id = @sessionId
      `);

    // 2) تحديث SubscriptionRenewals وربطها بالـ isActive=0 (لو تريد أرشفتها)
    //    أو يمكنك تركها نشطة isActive=1 لو تحب.
    //    هنا نفترض أنك أضفت عمود isActive=bit في SubscriptionRenewals
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE SubscriptionRenewals
        SET isActive = 0
        WHERE sessionId = @sessionId
      `);

    return res.status(200).json({ message: 'Session deleted and subscription renewals archived.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error deleting session:', error);
    return res.status(500).json({ message: 'Error deleting session.' });
  }
};
