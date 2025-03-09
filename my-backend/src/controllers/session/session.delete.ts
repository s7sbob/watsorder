// src/controllers/session/session.delete.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { whatsappClients } from '../whatsappClients';
import { checkSessionOwnership } from './session.helpers';

export const deleteSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  try {
    const pool = await getConnection();
    await checkSessionOwnership(pool, sessionId, req.user);

    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query('DELETE FROM Sessions WHERE id = @sessionId');

    return res.status(200).json({ message: 'Session deleted successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error deleting session:', error)
    return res.status(500).json({ message: 'Error deleting session.' })
  }
};
