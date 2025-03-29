import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';

interface ViewCartParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  phoneNumber: string;
}

export const handleViewCart = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  phoneNumber
}: ViewCartParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  const orderRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      SELECT TOP 1 id
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
  const itemsRes = await pool.request()
    .input('orderId', sql.Int, orderId)
    .query(`
      SELECT oi.productId, oi.quantity, p.product_name, p.price
      FROM OrderItems oi
      JOIN Products p ON oi.productId = p.id
      WHERE oi.orderId = @orderId
    `);
  if (!itemsRes.recordset.length) {
    await client.sendMessage(msg.from, bold('سلتك فارغة.'));
    return true;
  }
  let total = 0;
  let cartMsg = bold('سلة المشتريات:') + '\n===========================\n';
  for (const row of itemsRes.recordset) {
    const linePrice = (row.price || 0) * row.quantity;
    total += linePrice;
    cartMsg += bold(`${row.quantity} x ${row.product_name} => ${linePrice} ج`) + '\n';
    cartMsg += `للحذف: wa.me/${phoneNumber}?text=REMOVEPRODUCT_${row.productId}\n\n`;
  }
  cartMsg += bold(`الإجمالي: ${total} ج`) + '\n===========================\n';
  cartMsg += bold('لتنفيذ الطلب:') + '\n';
  cartMsg += `wa.me/${phoneNumber}?text=CARTCONFIRM\n`;
  await pool.request()
    .input('orderId', sql.Int, orderId)
    .input('totalPrice', sql.Decimal(18, 2), total)
    .query(`
      UPDATE Orders
      SET totalPrice = @totalPrice
      WHERE id = @orderId
    `);
  await client.sendMessage(msg.from, cartMsg);
  return true;
};
