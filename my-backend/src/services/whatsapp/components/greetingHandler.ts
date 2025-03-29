import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';

interface GreetingHandlerParams {
  client: Client;
  msg: Message;
  upperText: string;
  pool: any;
  sessionId: number;
  customerPhone: string;
  greetingActive: boolean;
  greetingMessage: string;
  phoneNumber: string;
  menuBotActive: boolean;
}

export const handleGreeting = async ({
  client,
  msg,
  upperText,
  pool,
  sessionId,
  customerPhone,
  greetingActive,
  greetingMessage,
  phoneNumber,
  menuBotActive
}: GreetingHandlerParams): Promise<void> => {
  const bold = (txt: string) => `*${txt}*`;

  // تعريف ما إذا كانت الرسالة عبارة عن أمر
  const isCommand =
    ['NEWORDER', 'SHOWCATEGORIES', 'VIEWCART', 'CARTCONFIRM'].some(cmd => upperText === cmd) ||
    upperText.startsWith('CATEGORY_') ||
    upperText.startsWith('PRODUCT_') ||
    upperText.startsWith('REMOVEPRODUCT_');

  // حالة الترحيب العامة (عند عدم كون الرسالة أمر)
  if (greetingActive && !isCommand) {
    const existingOrder = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('custPhone', sql.NVarChar, customerPhone)
      .query(`
        SELECT TOP 1 id 
        FROM Orders 
        WHERE sessionId = @sessionId 
          AND customerPhoneNumber = @custPhone
          AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
      `);
    if (existingOrder.recordset.length === 0) {
      const now = new Date();
      const greetingLogRow = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .input('custPhone', sql.NVarChar, customerPhone)
        .query(`
          SELECT lastSentAt
          FROM GreetingLog
          WHERE sessionId = @sessionId
            AND phoneNumber = @custPhone
        `);
      let canSendGreeting = false;
      if (!greetingLogRow.recordset.length) {
        canSendGreeting = true;
      } else {
        const lastSent = new Date(greetingLogRow.recordset[0].lastSentAt);
        const diffMinutes = (new Date().getTime() - lastSent.getTime()) / 1000 / 60;
        if (diffMinutes >= 60) {
          canSendGreeting = true;
        }
      }
      if (canSendGreeting && greetingMessage) {
        await client.sendMessage(msg.from, greetingMessage);
        if (!greetingLogRow.recordset.length) {
          await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('custPhone', sql.NVarChar, customerPhone)
            .input('now', sql.DateTime, now)
            .query(`
              INSERT INTO GreetingLog (sessionId, phoneNumber, lastSentAt)
              VALUES (@sessionId, @custPhone, @now)
            `);
        } else {
          await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('custPhone', sql.NVarChar, customerPhone)
            .input('now', sql.DateTime, now)
            .query(`
              UPDATE GreetingLog
              SET lastSentAt = @now
              WHERE sessionId = @sessionId
                AND phoneNumber = @custPhone
            `);
        }
      }
    }
  }

  // حالة ترحيب خاصة بمنيو بوت في حالة عدم وجود طلب مفتوح
  if (
    menuBotActive &&
    (await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('custPhone', sql.NVarChar, customerPhone)
      .query(`
        SELECT TOP 1 id 
        FROM Orders 
        WHERE sessionId = @sessionId 
          AND customerPhoneNumber = @custPhone
          AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
      `)).recordset.length === 0 &&
    !isCommand
  ) {
    const specialPhoneForMenuBot = customerPhone + '-menubot';
    const now = new Date();
    const menuBotLogRow = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('specialPhone', sql.NVarChar, specialPhoneForMenuBot)
      .query(`
        SELECT lastSentAt
        FROM GreetingLog
        WHERE sessionId = @sessionId
          AND phoneNumber = @specialPhone
      `);
    let canSendMenuBot = false;
    if (!menuBotLogRow.recordset.length) {
      canSendMenuBot = true;
    } else {
      const lastSent = new Date(menuBotLogRow.recordset[0].lastSentAt);
      const diffMinutes = (now.getTime() - lastSent.getTime()) / 1000 / 60;
      if (diffMinutes >= 60) {
        canSendMenuBot = true;
      }
    }
    if (canSendMenuBot) {
      const menuBotGuide = `*ملاحظة* يرجى الضغط على الرابط المراد اختياره ثم الضغط على زر الإرسال

*لتسجيل طلب جديد*
wa.me/${phoneNumber}?text=NEWORDER
`;
      await client.sendMessage(msg.from, menuBotGuide);
      if (!menuBotLogRow.recordset.length) {
        await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('specialPhone', sql.NVarChar, specialPhoneForMenuBot)
          .input('now', sql.DateTime, now)
          .query(`
            INSERT INTO GreetingLog (sessionId, phoneNumber, lastSentAt)
            VALUES (@sessionId, @specialPhone, @now)
          `);
      } else {
        await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('specialPhone', sql.NVarChar, specialPhoneForMenuBot)
          .input('now', sql.DateTime, now)
          .query(`
            UPDATE GreetingLog
            SET lastSentAt = @now
            WHERE sessionId = @sessionId
              AND phoneNumber = @specialPhone
          `);
      }
    }
  }
};
