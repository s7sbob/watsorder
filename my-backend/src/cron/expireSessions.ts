// src/cron/expireSessions.ts
import cron from 'node-cron';
import { getConnection } from '../config/db';
import * as sql from 'mssql';
import { whatsappClients } from '../controllers/whatsappClients';

// الرقم الثابت المأخوذ من متغيرات البيئة
const FIXED_SESSION_ID = Number(process.env.FIXED_SESSION_ID);
const FIXED_CONTACT_NUMBER = Number(process.env.FIXED_CONTACT_NUMBER);

// تُنفّذ العملية يوميًا عند منتصف الليل
cron.schedule(' * * * * *', async () => {
  try {
    const pool = await getConnection();
    const now = new Date();

    // 1. معالجة الجلسات المنتهية:
    // استعلام عن الجلسات التي وصل expireDate لها ولم تُحدث حالتها بعد إلى "Expired"
    const resultExpired = await pool.request()
      .input('currentDate', sql.DateTime, now)
      .query(`
        SELECT id FROM Sessions
        WHERE expireDate IS NOT NULL
          AND expireDate <= @currentDate
          AND status <> 'Expired'
      `);

    if (resultExpired.recordset.length > 0) {
      for (const record of resultExpired.recordset) {
        const sessionId = record.id;
        // تحديث الحالة إلى "Expired"
        await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .query(`
            UPDATE Sessions
            SET status = 'Expired'
            WHERE id = @sessionId
          `);
        console.log(`Session ${sessionId} status updated to Expired.`);
        // إذا كان عميل الواتساب نشط للجلسة، قم بإيقافه وحذفه من الكائن
        if (whatsappClients[sessionId]) {
          await whatsappClients[sessionId].destroy();
          delete whatsappClients[sessionId];
          console.log(`WhatsApp client for session ${sessionId} destroyed due to expiration.`);
        }
      }
    }

    // 2. معالجة الجلسات التي ستنتهي خلال 3 أيام:
    // استعلام عن الجلسات التي تبقى لها 3 أيام قبل انتهاء صلاحيتها
    const resultExpiring = await pool.request()
      .input('currentDate', sql.DateTime, now)
      .query(`
        SELECT id, phoneNumber, alternateWhatsAppNumber, expireDate 
        FROM Sessions
        WHERE expireDate IS NOT NULL
          AND DATEDIFF(day, @currentDate, expireDate) = 3
          AND status <> 'Expired'
      `);

    if (resultExpiring.recordset.length > 0) {
      for (const record of resultExpiring.recordset) {
        const sessionId = FIXED_SESSION_ID;
        // تكوين رسالة التنبيه
        // الرسالة تُعلم العميل بأنه تبقى 3 أيام فقط على انتهاء الجلسة،
        // وتطلب منه التواصل مع الرقم الثابت (FIXED_SESSION_ID) ومن الرقم الذي فتح منه الجلسة (phoneNumber)
        const message = `تنبيه: لقد اوشكت جلستك المربوطة برقم  ${record.phoneNumber}  على الانتهاء برجاء التواصل مع ${FIXED_CONTACT_NUMBER} للتجديد لتجنب اقاف الجلسة`
        // إرسال الرسالة باستخدام عميل الواتساب الخاص بالجلسة إذا كان متاحاً
        if (whatsappClients[sessionId]) {
          const chatId = `${record.phoneNumber}@c.us`;
          await whatsappClients[sessionId].sendMessage(chatId, message);   
           console.log(`Expiry warning sent for session ${sessionId}.`);
        } else {
          // في حال عدم وجود عميل واتساب نشط للجلسة، يمكنك هنا تنفيذ منطق بديل (مثلاً استخدام API خارجي)
          console.log(`No active WhatsApp client for session ${sessionId} to send expiry warning.`);
        }
      }
    }

    console.log(`Expire check and expiry warnings run at ${now}`);
  } catch (error) {
    console.error('Error in scheduled job:', error);
  }
});
