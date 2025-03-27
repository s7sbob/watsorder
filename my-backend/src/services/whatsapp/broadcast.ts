// src/services/whatsapp/broadcast.ts
import { Client, MessageMedia } from 'whatsapp-web.js';
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { whatsappClients } from './whatsappClientsStore';

/**
 * دالة البث
 */
export const broadcastMessage = async (req: Request, res: Response, sessionId: number) => {
  const { phoneNumbers, message, randomNumbers, media } = req.body;
  if (!phoneNumbers?.length || !randomNumbers?.length) {
    return res.status(400).json({ message: 'Invalid input data' });
  }
  try {
    const pool = await getConnection();
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, status
        FROM Sessions
        WHERE id = @sessionId
      `);
    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'No session found with the provided ID' });
    }
    if (sessionResult.recordset[0].status !== 'Connected') {
      return res.status(400).json({ message: 'Session is not in Connected status.' });
    }
    const client = whatsappClients[sessionId];
    if (!client) {
      return res.status(404).json({ message: 'WhatsApp client not found for this session.' });
    }
    for (const phoneNumber of phoneNumbers) {
      const randomDelay = randomNumbers[Math.floor(Math.random() * randomNumbers.length)];
    
      if (media && media.length > 0) {
        // أرسل كل ميديا بكابشن فارغ:
        for (const singleMedia of media) {
          const mediaMsg = new MessageMedia(singleMedia.mimetype, singleMedia.base64, singleMedia.filename);
          await sendMessageWithDelay(client, phoneNumber, '', randomDelay, mediaMsg);
        }
        // ثم أرسل رسالة نصية واحدة:
        if (message?.trim()) {
          await sendMessageWithDelay(client, phoneNumber, message.trim(), randomDelay);
        }
      } else {
        // لا توجد ميديا => أرسل نص فقط
        if (message?.trim()) {
          await sendMessageWithDelay(client, phoneNumber, message.trim(), randomDelay);
        }
      }
    }
    res.status(200).json({ message: 'Broadcast started successfully' });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * تابع الإرسال مع تأخير
 */
export const sendMessageWithDelay = async (
  client: Client,
  phoneNumber: string,
  textMessage: string,
  delay: number,
  media?: MessageMedia
) => {
  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      try {
        const chatId = `${phoneNumber}@c.us`;
        if (media) {
          await client.sendMessage(chatId, media, { caption: textMessage || '' });
        } else {
          await client.sendMessage(chatId, textMessage);
        }
        console.log(`Broadcast sent to ${phoneNumber}`);
        resolve();
      } catch (error) {
        console.error(`Broadcast failed for ${phoneNumber}:`, error);
        resolve();
      }
    }, delay * 1000);
  });
};
