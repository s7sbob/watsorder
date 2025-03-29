import { Client, Message } from 'whatsapp-web.js';
import { poolPromise } from '../../config/db2';
import * as sql from 'mssql';
import { io } from '../../server';

// استيراد المكونات الفرعية
import { handleKeywords } from './components/keywordsHandler';
import { handleMenuBot } from './components/menuBotHandler';
import { handleGreeting } from './components/greetingHandler';

export const registerMessageHandler = (client: Client, sessionId: number) => {
  client.on('message', async (msg: Message) => {
    console.log(`[${new Date().toISOString()}] Received message from ${msg.from}: ${msg.body}`);
    try {
      // الحصول على اتصال قاعدة البيانات
      const pool = await poolPromise;
      const sessionRow = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive, menuBotActive, phoneNumber, greetingActive, greetingMessage
          FROM Sessions
          WHERE id = @sessionId
        `);
      if (!sessionRow.recordset.length) {
        console.log(`Session not found in DB for message handling.`);
        return;
      }
      if (msg.from.endsWith('@g.us')) {
        console.log(`Message from group ignored.`);
        return;
      }
      const { botActive, menuBotActive, phoneNumber, greetingActive, greetingMessage } = sessionRow.recordset[0];
      const text = msg.body.trim();
      const upperText = text.toUpperCase();
      const customerPhone = msg.from.split('@')[0];

      // (1) معالجة كلمات البوت (Keywords) إذا كان البوت مفعل
      if (botActive) {
        const handled = await handleKeywords({ client, msg, text, pool, sessionId, customerPhone });
        if (handled) return;
      }

      // (2) معالجة أوامر المنيو بوت
      if (menuBotActive) {
        const handled = await handleMenuBot({ client, msg, text, upperText, pool, sessionId, customerPhone, phoneNumber });
        if (handled) return;
      }

      // (3) معالجة رسائل الترحيب
      await handleGreeting({ client, msg, upperText, pool, sessionId, customerPhone, greetingActive, greetingMessage, phoneNumber, menuBotActive });

      console.log(`[${new Date().toISOString()}] Finished processing message from ${msg.from}.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error handling message:`, error);
    }
  });
};
