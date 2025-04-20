// controllers/session/alternateNumber.controller.ts
import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';

export const updateAlternateWhatsAppNumber = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    const { alternateWhatsAppNumber } = req.body;

    if (!sessionId || !alternateWhatsAppNumber) {
      return res.status(400).json({ message: 'Invalid session ID or WhatsApp number.' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('alternateWhatsAppNumber', sql.NVarChar, alternateWhatsAppNumber)
      .query(`
        UPDATE Sessions
        SET alternateWhatsAppNumber = @alternateWhatsAppNumber
        WHERE id = @sessionId
      `);

    return res.status(200).json({ message: 'Alternate WhatsApp number updated successfully.' });
  } catch (error) {
    console.error('Error updating alternate WhatsApp number:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
