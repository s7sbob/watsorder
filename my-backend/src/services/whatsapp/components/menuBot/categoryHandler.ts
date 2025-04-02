import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';

interface CategoryParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  upperText: string;
  phoneNumber: string;
}

export const handleCategory = async ({
  client,
  msg,
  pool,
  sessionId,
  upperText,
  phoneNumber
}: CategoryParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  // استخراج معرف القسم
  const catId = parseInt(upperText.replace('CATEGORY_', ''));
  const productsData = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('catId', sql.Int, catId)
    .query(`
      SELECT id, product_name, price
      FROM Products
      WHERE sessionId = @sessionId 
        AND category_id = @catId
        AND isActive = 1
      ORDER BY [order] ASC
    `);
  if (!productsData.recordset.length) {
    await client.sendMessage(msg.from, bold('لا توجد منتجات في هذا التصنيف.'));
    return true;
  }
  let prodMsg = bold('برجاء إختيار المنتج') + '\n===========================\n';
  for (const p of productsData.recordset) {
    prodMsg += bold(`${p.product_name} (${p.price}ج)`) + '\n';
    prodMsg += `wa.me/${phoneNumber}?text=PRODUCT_${p.id}\n`;
  }
  await client.sendMessage(msg.from, prodMsg);
  return true;
};
