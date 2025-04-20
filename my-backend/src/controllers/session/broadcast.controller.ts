// controllers/session/broadcast.controller.ts
import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';
import { broadcastMessage } from '../whatsappClients';

export const broadcastMessageAPI = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);

    await broadcastMessage(req, res, sessionId);
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Error broadcasting message.' });
  }
};
