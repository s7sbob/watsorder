import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';
import { clearOrderTimeout, scheduleOrderTimeout } from '../../orderTimeouts';
import { getCustomerName, getCustomerAddresses } from '../../customerInfo';

interface CartConfirmParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  phoneNumber: string;
}

export const handleCartConfirm = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  phoneNumber
}: CartConfirmParams): Promise<boolean> => {
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
  const customerName = await getCustomerName(customerPhone);
  if (customerName == null) {
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('status', sql.NVarChar, 'AWAITING_NAME')
      .query(`
        UPDATE Orders
        SET status = @status, tempProductId = NULL
        WHERE id = @orderId
      `);
    clearOrderTimeout(orderId);
    scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
    await client.sendMessage(msg.from, bold('من فضلك قم بإرسال اسم صاحب الطلب'));
    return true;
  } else {
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('customerName', sql.NVarChar, customerName)
      .input('status', sql.NVarChar, 'AWAITING_ADDRESS')
      .query(`
        UPDATE Orders
        SET customerName = @customerName,
            status = @status,
            tempProductId = NULL
        WHERE id = @orderId
      `);
    clearOrderTimeout(orderId);
    scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
    const addresses = await getCustomerAddresses(customerPhone);
    if (addresses.length > 0) {
      let addrMsg = bold(`مرحبا ${customerName}. اختر احد العناوين المسجلة أو اضف عنوان جديد`) + '\n===========================\n';
      addresses.forEach(addr => {
        addrMsg += `${addr.address}\n`;
        addrMsg += `wa.me/${phoneNumber}?text=ADDRESS_${addr.id}\n\n`;
      });
      addrMsg += `===========================\n*عنوان جديد*\nwa.me/${phoneNumber}?text=NEWADDRESS`;
      await client.sendMessage(msg.from, addrMsg);
    } else {
      await client.sendMessage(msg.from, bold('برجاء إرسال العنوان'));
    }
    return true;
  }
};
