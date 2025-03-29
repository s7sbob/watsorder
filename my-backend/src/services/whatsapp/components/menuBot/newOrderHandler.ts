import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';
import { scheduleOrderTimeout } from '../../orderTimeouts';

interface NewOrderParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  phoneNumber: string;
}

export const handleNewOrder = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  phoneNumber
}: NewOrderParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  // التحقق من وجود طلب مفتوح مسبقًا
  const openOrder = await pool.request()
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
  if (openOrder.recordset.length > 0) {
    await client.sendMessage(msg.from, bold('لديك طلب قائم بالفعل. برجاء إكماله أو تأكيده قبل إنشاء طلب جديد.'));
    return true;
  }
  // إنشاء طلب جديد
  const orderInsertResult = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('status', sql.NVarChar, 'IN_CART')
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      INSERT INTO Orders (sessionId, status, customerPhoneNumber)
      OUTPUT INSERTED.id
      VALUES (@sessionId, @status, @custPhone)
    `);
  const orderId = orderInsertResult.recordset[0].id;
  scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
  // جلب الأقسام
  const categories = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`
      SELECT id, category_name
      FROM Categories
      WHERE sessionId = @sessionId AND isActive = 1
      ORDER BY [order] ASC
    `);
  if (!categories.recordset.length) {
    await client.sendMessage(msg.from, bold('لا توجد أصناف متاحة.'));
    return true;
  }
  let catMsg = bold('برجاء اختيار القسم') + '\n===========================\n';
  for (const cat of categories.recordset) {
    catMsg += bold(cat.category_name) + '\n';
    catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`;
  }
  await client.sendMessage(msg.from, catMsg);
  return true;
};
