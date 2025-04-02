import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';

interface ShowCategoriesParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  phoneNumber: string;
}

export const handleShowCategories = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  phoneNumber
}: ShowCategoriesParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  // التأكد من وجود طلب مفتوح
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
  if (!openOrder.recordset.length) {
    await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*\nwa.me/${phoneNumber}?text=NEWORDER`);
    return true;
  }
  // جلب الأقسام النشطة
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
  let catMsg = bold('اختر الصنف لإضافة منتجات:') + '\n===========================\n';
  for (const cat of categories.recordset) {
    catMsg += bold(cat.category_name) + '\n';
    catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n`;
  }
  await client.sendMessage(msg.from, catMsg);
  return true;
};
