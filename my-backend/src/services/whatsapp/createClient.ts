// src/services/whatsapp/createClient.ts
import { Client, LocalAuth } from 'whatsapp-web.js';
import { poolPromise } from '../../config/db2';
import * as sql from 'mssql';
import { io } from '../../server';
import { whatsappClients } from './whatsappClientsStore';
import { registerMessageHandler } from './messageHandler';

/**
 * إنشاء عميل واتساب جديد لجلسة معيّنة
 */
export const createWhatsAppClientForSession = async (sessionId: number, sessionIdentifier: string) => {
  const sanitizedClientId = sessionIdentifier.replace(/[^A-Za-z0-9_-]/g, '_');
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sanitizedClientId }),
    puppeteer: { headless: true }
  });

  client.on('qr', async (qr) => {
    console.log(`QR Code for session ${sessionId}:`, qr);
    const pool = await poolPromise;
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('qr', sql.NVarChar, qr)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for QR Code', qrCode = @qr
        WHERE id = @sessionId
      `);
    io.emit('sessionUpdate', { sessionId, status: 'Waiting for QR Code', qrCode: qr });
  });

  client.on('authenticated', async () => {
    console.log(`Session ${sessionId} authenticated.`);
    const pool = await poolPromise;
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Connected'
        WHERE id = @sessionId
      `);
    io.emit('sessionUpdate', { sessionId, status: 'Connected' });
  });

  client.on('ready', async () => {
    console.log(`Session ${sessionId} is ready and connected.`);
    try {
      const fullWhatsAppID = client.info?.wid?._serialized;
      if (fullWhatsAppID) {
        const purePhoneNumber = fullWhatsAppID.replace('@c.us', '');
        const pool = await poolPromise;
        await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('phoneNumber', sql.NVarChar, purePhoneNumber)
          .query(`
            UPDATE Sessions
            SET phoneNumber = @phoneNumber
            WHERE id = @sessionId
          `);
        console.log(`Phone number ${purePhoneNumber} stored for session ${sessionId}`);
      } else {
        console.log('Could not retrieve WhatsApp ID.');
      }
    } catch (error) {
      console.error('Error storing phone number in DB:', error);
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`Session ${sessionId} was logged out`, reason);
  });

  // تسجيل الأحداث الخاصة بالرسائل
  registerMessageHandler(client, sessionId);

  // بدء تشغيل العميل
  client.initialize();

  // تخزين العميل في الخريطة
  whatsappClients[sessionId] = client;
};
