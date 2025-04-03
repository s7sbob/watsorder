import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';

interface RemoveProductParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  upperText: string;
  phoneNumber: string;
}

export const handleRemoveProduct = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  upperText,
  phoneNumber
}: RemoveProductParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  // استخدام البادئة المختصرة "RP_" بدلاً من "REMOVEPRODUCT_"
  const productId = parseInt(upperText.replace('RP_', ''));
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
  await pool.request()
    .input('orderId', sql.Int, orderId)
    .input('productId', sql.Int, productId)
    .query(`
      DELETE FROM OrderItems
      WHERE orderId = @orderId
        AND productId = @productId
    `);
  await client.sendMessage(msg.from, bold('تم حذف المنتج من السلة.'));
  return true;
};
