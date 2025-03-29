import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';
import { clearOrderTimeout, scheduleOrderTimeout } from '../../orderTimeouts';
import { saveCustomerName, saveCustomerAddress, getCustomerAddresses } from '../../customerInfo';

interface OrderStagesParams {
  client: Client;
  msg: Message;
  pool: any;
  sessionId: number;
  customerPhone: string;
  upperText: string;
  phoneNumber: string;
}

export const handleOrderStages = async ({
  client,
  msg,
  pool,
  sessionId,
  customerPhone,
  upperText,
  phoneNumber
}: OrderStagesParams): Promise<boolean> => {
  const bold = (txt: string) => `*${txt}*`;
  const orderRes = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      SELECT TOP 1 id, status, tempProductId
      FROM Orders
      WHERE sessionId = @sessionId
        AND customerPhoneNumber = @custPhone
        AND status IN ('AWAITING_QUANTITY','AWAITING_NAME','AWAITING_ADDRESS','AWAITING_LOCATION')
      ORDER BY id DESC
    `);
  if (!orderRes.recordset.length) {
    return false;
  }
  const { id: orderId, status, tempProductId } = orderRes.recordset[0];

  // حالة AWAITING_QUANTITY
  if (status === 'AWAITING_QUANTITY' && tempProductId) {
    const quantityNum = parseInt(upperText);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      await client.sendMessage(msg.from, bold('من فضلك أدخل رقم صحيح للكمية.'));
      return true;
    }
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('productId', sql.Int, tempProductId)
      .input('qty', sql.Int, quantityNum)
      .query(`
        INSERT INTO OrderItems (orderId, productId, quantity)
        VALUES (@orderId, @productId, @qty)
      `);
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('status', sql.NVarChar, 'IN_CART')
      .query(`
        UPDATE Orders
        SET status = @status, tempProductId = NULL
        WHERE id = @orderId
      `);
    const cartSummaryRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          SUM(oi.quantity) as totalQty,
          SUM(oi.quantity * p.price) as totalPrice
        FROM OrderItems oi
        JOIN Products p ON oi.productId = p.id
        WHERE oi.orderId = @orderId
      `);
    const totalQty = cartSummaryRes.recordset[0].totalQty || 0;
    const totalPrice = cartSummaryRes.recordset[0].totalPrice || 0;
    clearOrderTimeout(orderId);
    scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
    let addedMsg = `*تم إضافة المنتج للسلة.*\n===========================\n`;
    addedMsg += `*يوجد عدد (${totalQty}) صنف بقيمة (${totalPrice}) داخل سلة المشتريات*\n`;
    addedMsg += `*لعرض السلة وتنفيذ الطلب :*\n`;
    addedMsg += `wa.me/${phoneNumber}?text=VIEWCART\n\n`;
    addedMsg += `*لإضافة منتج آخر:*\n`;
    addedMsg += `wa.me/${phoneNumber}?text=SHOWCATEGORIES`;
    await client.sendMessage(msg.from, addedMsg);
    return true;
  }

  // حالة AWAITING_NAME
  if (status === 'AWAITING_NAME') {
    const newName = msg.body.trim();
    await saveCustomerName(customerPhone, newName);
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('customerName', sql.NVarChar, newName)
      .input('status', sql.NVarChar, 'AWAITING_ADDRESS')
      .query(`
        UPDATE Orders
        SET customerName = @customerName,
            status = @status
        WHERE id = @orderId
      `);
    clearOrderTimeout(orderId);
    scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
    const addresses = await getCustomerAddresses(customerPhone);
    if (addresses.length > 0) {
      let addrMsg = `مرحبا *${newName}*، اختر احد العناوين المسجلة أو اضف عنوان جديد` + '\n===========================\n';
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

  // حالة AWAITING_ADDRESS
  if (status === 'AWAITING_ADDRESS') {
    if (upperText === 'NEWADDRESS') {
      await client.sendMessage(msg.from, bold('برجاء إرسال العنوان الجديد'));
      return true;
    }
    if (upperText.startsWith('ADDRESS_')) {
      const addrId = parseInt(upperText.replace('ADDRESS_', ''));
      const addresses = await getCustomerAddresses(customerPhone);
      const selected = addresses.find(addr => addr.id === addrId);
      if (selected) {
        await pool.request()
          .input('orderId', sql.Int, orderId)
          .input('address', sql.NVarChar, selected.address)
          .input('status', sql.NVarChar, 'AWAITING_LOCATION')
          .query(`
            UPDATE Orders
            SET deliveryAddress = @address,
                status = @status
            WHERE id = @orderId
          `);
        clearOrderTimeout(orderId);
        scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
        await client.sendMessage(
          msg.from,
          (`*تم اختيار العنوان*:\n${selected.address}\n===========================\nبرجاء إرسال الموقع *(أو اضغط على الرابط للتخطي)*: wa.me/${phoneNumber}?text=SKIP_LOCATION`)
        );
      } else {
        await client.sendMessage(msg.from, bold('العنوان المختار غير موجود.'));
      }
      return true;
    } else {
      const newAddress = msg.body.trim();
      await saveCustomerAddress(customerPhone, newAddress);
      await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('address', sql.NVarChar, newAddress)
        .input('status', sql.NVarChar, 'AWAITING_LOCATION')
        .query(`
          UPDATE Orders
          SET deliveryAddress = @address,
              status = @status
          WHERE id = @orderId
        `);
      clearOrderTimeout(orderId);
      scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
      await client.sendMessage(
        msg.from,
        (`*تم حفظ عنوانك الجديد*:\n${newAddress}\n===========================\nبرجاء إرسال الموقع *(أو اضغط على الرابط للتخطي)*: wa.me/${phoneNumber}?text=SKIP_LOCATION`)
      );
      return true;
    }
  }

  // حالة AWAITING_LOCATION
  if (status === 'AWAITING_LOCATION') {
    const upperTextLocation = msg.body.trim().toUpperCase();
    if (upperTextLocation === 'SKIP_LOCATION') {
      await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('status', sql.NVarChar, 'CONFIRMED')
        .query(`
          UPDATE Orders
          SET status = @status
          WHERE id = @orderId
        `);
      clearOrderTimeout(orderId);
      await client.sendMessage(msg.from, bold('تم تأكيد الطلب بنجاح بدون الموقع!'));
      return true;
    } else if (msg.type === 'location' && msg.location) {
      const { latitude, longitude } = msg.location;
      await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('lat', sql.Decimal(9, 6), latitude)
        .input('lng', sql.Decimal(9, 6), longitude)
        .input('status', sql.NVarChar, 'CONFIRMED')
        .query(`
          UPDATE Orders
          SET deliveryLat = @lat,
              deliveryLng = @lng,
              status = @status
          WHERE id = @orderId
        `);
      clearOrderTimeout(orderId);
      await client.sendMessage(msg.from, bold('تم إرسال الطلب بنجاح!'));
      return true;
    } else {
      await client.sendMessage(
        msg.from,
        bold("من فضلك أرسل الموقع أو اضغط على الرابط للتخطي:") + "\n" + `wa.me/${phoneNumber}?text=SKIP_LOCATION`
      );
      return true;
    }
  }
  return false;
};
