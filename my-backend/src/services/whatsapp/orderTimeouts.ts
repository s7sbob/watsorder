// src/services/whatsapp/orderTimeouts.ts
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { Client } from 'whatsapp-web.js';
import { whatsappClients } from './whatsappClientsStore';

/**
 * خريطة لتخزين مؤقتات الطلبات المفتوحة
 */
const orderTimeoutMap: { [orderId: number]: NodeJS.Timeout } = {};

/**
 * دالة جدولة حذف الطلب في حال عدم اتخاذ إجراء خلال 5 دقائق
 */
export const scheduleOrderTimeout = async (
  orderId: number,
  sessionId: number,
  client: Client,
  sessionPhone: string
) => {
  const delay = 5 * 60 * 1000; // 5 دقائق بالمللي ثانية
  const timeout = setTimeout(async () => {
    try {
      const pool = await getConnection();
      // استعلام يشمل رقم العميل الذي تحدث مع البوت
      const orderRes = await pool.request()
        .input('orderId', sql.Int, orderId)
        .query(`SELECT status, customerPhoneNumber FROM Orders WHERE id = @orderId`);
      
      if (orderRes.recordset.length) {
        const currentStatus = orderRes.recordset[0].status;
        if (['IN_CART', 'AWAITING_QUANTITY', 'AWAITING_NAME', 'AWAITING_ADDRESS', 'AWAITING_LOCATION'].includes(currentStatus)) {
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .query(`DELETE FROM Orders WHERE id = @orderId`);
          
          // نستخدم رقم العميل لتحديد chatId (الذي هو الشخص الذي كان يتحدث مع البوت)
          const customerPhone = orderRes.recordset[0].customerPhoneNumber;
          if (customerPhone) {
            const chatId = `${customerPhone}@c.us`;
            // هنا نعرض sessionPhone في نص الرسالة
            const notificationMsg = `تم الغاء طلبك لعدم الاستكمال
*يمكنك الآن بدء طلب جديد*
wa.me/${sessionPhone}?text=NEWORDER`;
            await client.sendMessage(chatId, notificationMsg);
            console.log(`Order ${orderId} deleted due to inactivity.`);
          } else {
            console.log(`لم يتم العثور على رقم هاتف العميل للطلب ${orderId}.`);
          }
        }
      }
    } catch (error) {
      console.error(`Error in order timeout for order ${orderId}:`, error);
    } finally {
      delete orderTimeoutMap[orderId];
    }
  }, delay);

  orderTimeoutMap[orderId] = timeout;
};

/**
 * دالة لإلغاء المؤقت الخاص بالطلب
 */
export const clearOrderTimeout = (orderId: number) => {
  if (orderTimeoutMap[orderId]) {
    clearTimeout(orderTimeoutMap[orderId]);
    delete orderTimeoutMap[orderId];
    console.log(`Timeout for order ${orderId} cleared.`);
  }
};
