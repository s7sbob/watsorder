// src/cron/cronJobs.ts
import cron from 'node-cron';
import { getConnection } from '../config/db';
import * as sql from 'mssql';

// كرون كل منتصف الليل
cron.schedule('0 0 * * *', async () => {
  console.log('Running subscription expiration job...');

  try {
    const pool = await getConnection();

    // 1) تعطيل الميزات المنتهية: إذا endDate < اليوم => isActive = 0
    await pool.request().query(`
      UPDATE UserFeatures
      SET isActive = 0,
          updatedAt = GETDATE()
      WHERE endDate IS NOT NULL
        AND endDate < GETDATE()
        AND isActive = 1
    `);

    // 2) لو تريد جعل user.subscriptionType = 'Expired' لو كل الميزات انقضت
    //   هذا مثال فقط، عدّله حسب منطقك:
    await pool.request().query(`
      UPDATE Users
      SET subscriptionType = 'Expired'
      WHERE ID IN (
        SELECT u.ID
        FROM Users u
        LEFT JOIN UserFeatures uf ON uf.userId = u.ID
        WHERE uf.isActive = 1  -- عنده ميزة فعالة
        GROUP BY u.ID
        HAVING COUNT(uf.id) = 0  -- لا يوجد أي ميزة مفعلة
      )
    `);

    console.log('Subscription expiration job done.');
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});
