// src/cron/expireSessions.ts
import cron from 'node-cron';
import { getConnection } from '../config/db';
import * as sql from 'mssql';
import { whatsappClients } from '../controllers/whatsappClients';

// تحقق كل دقيقة
cron.schedule('* * * * *', async () => {
  try {
    const pool = await getConnection();
    const now = new Date();
    // تحديد الجلسات التي وصل expireDate لها ولم تُحدث حالتها بعد إلى "Expired"
    const result = await pool.request()
      .input('currentDate', sql.DateTime, now)
      .query(`
        SELECT id FROM Sessions
        WHERE expireDate IS NOT NULL
          AND expireDate <= @currentDate
          AND status <> 'Expired'
      `);

    if (result.recordset.length > 0) {
      for (const record of result.recordset) {
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
    console.log(`Expire check run at ${now}`);
  } catch (error) {
    console.error('Error updating expired sessions:', error);
  }
});
