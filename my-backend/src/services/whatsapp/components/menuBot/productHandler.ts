import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';
import { clearOrderTimeout, scheduleOrderTimeout } from '../../orderTimeouts';

interface ProductParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  upperText: string;
  phoneNumber: string;
}

export const handleProduct = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  upperText,
  phoneNumber
}: ProductParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  // استخدام البادئة المختصرة "P_" بدلاً من "PRODUCT_"
  const productId = parseInt(upperText.replace('P_', ''));
  const orderRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      SELECT TOP 1 id, status
      FROM Orders
      WHERE sessionId = @sessionId
        AND customerPhoneNumber = @custPhone
        AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
      ORDER BY id DESC
    `);
  if (!orderRow.recordset.length) {
    await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*\nwa.me/${phoneNumber}?text=NEWORDER`);
    return true;
  }
  const orderId = orderRow.recordset[0].id;
  await pool.request()
    .input('orderId', sql.Int, orderId)
    .input('tempProductId', sql.Int, productId)
    .input('status', sql.NVarChar, 'AWAITING_QUANTITY')
    .query(`
      UPDATE Orders
      SET tempProductId = @tempProductId,
          status = @status
      WHERE id = @orderId
    `);
  clearOrderTimeout(orderId);
  scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
  await client.sendMessage(msg.from, bold('برجاء إرسال الكمية'));
  return true;
};
