// src/controllers/session/session.bot.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnership } from './session.helpers';

// تحديث حالة البوت (botActive)
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
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating bot status:', error)
    return res.status(500).json({ message: 'Error updating bot status.' })
  }
};

// تفعيل أو إيقاف الـ Menu Bot
export const updateMenuBotStatus = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { menuBotActive } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('menuBotActive', sql.Bit, menuBotActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET menuBotActive = @menuBotActive
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'MenuBot status updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating menu bot status:', error)
    return res.status(500).json({ message: 'Error updating menu bot status.' })
  }
};

// تحديث رسالة الترحيب
export const updateGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  const { greetingMessage, greetingActive } = req.body
  try {
    const pool = await getConnection()
    await checkSessionOwnership(pool, sessionId, req.user)

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('greetingMessage', sql.NVarChar(sql.MAX), greetingMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET greetingMessage = @greetingMessage, greetingActive = @greetingActive
        WHERE id = @sessionId
      `)
    res.status(200).json({ message: 'Greeting updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating greeting:', error)
    res.status(500).json({ message: 'Error updating greeting.' })
  }
};

// جلب رسالة الترحيب
export const getGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT greetingMessage, greetingActive
        FROM Sessions
        WHERE id = @sessionId
      `)

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    const row = result.recordset[0]
    return res.status(200).json({
      greetingMessage: row.greetingMessage || '',
      greetingActive: row.greetingActive === true
    })
  } catch (error) {
    console.error('Error fetching greeting:', error)
    return res.status(500).json({ message: 'Error fetching greeting.' })
  }
};
