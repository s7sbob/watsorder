// src/services/whatsapp/messageHandler.ts
import { Client, Message } from 'whatsapp-web.js';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';

// ⭐ نستبدل استيراد fs من 'fs' إلى 'fs/promises' حتى نستخدم الدوال async
import fs from 'fs/promises';
import path from 'path';
import { io } from '../../server';

import { scheduleOrderTimeout, clearOrderTimeout } from './orderTimeouts';
import {
  getCustomerName,
  saveCustomerName,
  getCustomerAddresses,
  saveCustomerAddress
} from './customerInfo';
import { MessageMedia } from 'whatsapp-web.js'; // نضيف هذا الاستيراد المباشر بدلا من require()

export const registerMessageHandler = (client: Client, sessionId: number) => {
  // دالة تنسيق النص بالخط العريض
  const bold = (text: string) => `*${text}*`;

  client.on('message', async (msg: Message) => {
    try {
      const pool = await getConnection();
      const sessionRow = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive, menuBotActive, phoneNumber,
                 greetingActive, greetingMessage
          FROM Sessions
          WHERE id = @sessionId
        `);

      if (!sessionRow.recordset.length) {
        console.log('Session not found in DB for message handling.');
        return;
      }
      if (msg.from.endsWith('@g.us')) return;

      const {
        botActive,
        menuBotActive,
        phoneNumber,
        greetingActive,
        greetingMessage
      } = sessionRow.recordset[0];

      const text = msg.body.trim();
      const upperText = text.toUpperCase();
      // رقم العميل (المرسل)
      const customerPhone = msg.from.split('@')[0];

      // 1) البوت العادي (Keywords)
      if (botActive) {
        const keywordsRes = await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .query(`
            SELECT 
              k.keyword, 
              r.replyText,
              r.id AS replayId
            FROM Keywords k
            JOIN Replays r ON k.replay_id = r.id
            WHERE k.sessionId = @sessionId
          `);

        // البحث عن الكلمة الدلالية في نص الرسالة
        const foundKeywordRow = keywordsRes.recordset.find((row: any) =>
          text.toLowerCase().includes(row.keyword?.toLowerCase())
        );
        
        if (foundKeywordRow) {
          // قراءة الميديا الخاصة بالرد
          const mediaRes = await pool.request()
            .input('replayId', sql.Int, foundKeywordRow.replayId)
            .query(`
              SELECT filePath
              FROM ReplayMedia
              WHERE replayId = @replayId
            `);

          // إرسال النص (إن وجد)
          if (foundKeywordRow.replyText) {
            await client.sendMessage(msg.from, `*${foundKeywordRow.replyText}*`);
          }

          // هنا التعديل الأهم
          // بدل:   const fileData = fs.readFileSync(m.filePath);
          // نستخدم الدوال غير المتزامنة من fs/promises:

          for (const m of mediaRes.recordset) {
            try {
              const fileData = await fs.readFile(m.filePath); // لا متزامن
              const base64 = fileData.toString('base64');
              const mediaMsg = new MessageMedia(
                'image/jpeg',
                base64,
                path.basename(m.filePath)
              );
              await client.sendMessage(msg.from, mediaMsg);
            } catch (err) {
              console.error(`Failed to read or send file: ${m.filePath}`, err);
            }
          }
          return;
        }
      }

      // 2) المنيو بوت (Menu Bot)
      if (menuBotActive) {
        // معالجة الأمر NEWORDER
        if (upperText === 'NEWORDER') {
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
            await client.sendMessage(
              msg.from,
              bold('لديك طلب قائم بالفعل. برجاء إكماله أو تأكيده قبل إنشاء طلب جديد.')
            );
            return;
          }
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
          // هنا نستخدم رقم الجلسة (phoneNumber) وليس رقم العميل
          scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
          const categories = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT id, category_name
              FROM Categories
              WHERE sessionId = @sessionId
            `);
          if (!categories.recordset.length) {
            await client.sendMessage(msg.from, bold('لا توجد أصناف متاحة.'));
            return;
          }
          let catMsg = bold('برجاء اختيار القسم') + '\n===========================\n';
          for (const cat of categories.recordset) {
            catMsg += bold(cat.category_name) + '\n';
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`;
          }
          await client.sendMessage(msg.from, catMsg);
          return;
        }
        // معالجة SHOWCATEGORIES
        else if (upperText === 'SHOWCATEGORIES') {
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*`+`\n`+`wa.me/${phoneNumber}?text=NEWORDER`);
            return;
          }
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
            return;
          }
          let catMsg = bold('اختر الصنف لإضافة منتجات:') + '\n===========================\n';
          for (const cat of categories.recordset) {
            catMsg += bold(cat.category_name) + '\n';
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`;
          }
          await client.sendMessage(msg.from, catMsg);
          return;
        }
        // معالجة CATEGORY_
        else if (upperText.startsWith('CATEGORY_')) {
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
            return;
          }
          let prodMsg = bold('برجاء إختيار المنتج') + '\n===========================\n';
          for (const p of productsData.recordset) {
            prodMsg += bold(`${p.product_name} (${p.price}ج)`) + '\n';
            prodMsg += `wa.me/${phoneNumber}?text=PRODUCT_${p.id}\n\n`;
          }
          await client.sendMessage(msg.from, prodMsg);
          return;
        }
        // معالجة PRODUCT_
        else if (upperText.startsWith('PRODUCT_')) {
          const productId = parseInt(upperText.replace('PRODUCT_', ''));
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*`+`\n`+`wa.me/${phoneNumber}?text=NEWORDER`);
            return;
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
          return;
        }
        // معالجة REMOVEPRODUCT_
        else if (upperText.startsWith('REMOVEPRODUCT_')) {
          const productId = parseInt(upperText.replace('REMOVEPRODUCT_', ''));
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*`+`\n`+`wa.me/${phoneNumber}?text=NEWORDER`);
            return;
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
          return;
        }
        // معالجة VIEWCART
        else if (upperText === 'VIEWCART') {
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*`+`\n`+`wa.me/${phoneNumber}?text=NEWORDER`);
            return;
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
            return;
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
          cartMsg += bold('لتنفيذ الطلب:')+'\n';
          cartMsg += `wa.me/${phoneNumber}?text=CARTCONFIRM\n`;
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('totalPrice', sql.Decimal(18,2), total)
            .query(`
              UPDATE Orders
              SET totalPrice = @totalPrice
              WHERE id = @orderId
            `);
          await client.sendMessage(msg.from, cartMsg);
          return;
        }
        // معالجة CARTCONFIRM
        else if (upperText === 'CARTCONFIRM') {
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*`+`\n`+`wa.me/${phoneNumber}?text=NEWORDER`);
            return;
          }
          const orderId = orderRow.recordset[0].id;
          const customerName = await getCustomerName(customerPhone);
          // إذا لم يكن الاسم محفوظ، ننتقل لمرحلة طلب الاسم
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
            return; 
          }
          // إذا كان الاسم محفوظ، نتخطى مرحلة الاسم ونتوجه مباشرة لمرحلة العنوان
          else {
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
              let addrMsg = `مرحبا *${customerName}*.\n اختر احد العناوين المسجلة أو اضف عنوان جديد` + '\n===========================\n';
              addresses.forEach(addr => {
                addrMsg += `${addr.address}\n`;
                addrMsg += `wa.me/${phoneNumber}?text=ADDRESS_${addr.id}\n\n`;
              });
              addrMsg += `===========================\n*عنوان جديد*\nwa.me/${phoneNumber}?text=NEWADDRESS`;
              await client.sendMessage(msg.from, addrMsg);
            } else {
              await client.sendMessage(msg.from, bold('برجاء إرسال العنوان'));
            }
            return;
          }
        }
        // معالجة المراحل المتبقية (AWAITING_QUANTITY, AWAITING_NAME, AWAITING_ADDRESS, AWAITING_LOCATION)
        else {
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*`+`\n`+`wa.me/${phoneNumber}?text=NEWORDER`);
            return;
            } else {
            const { id: orderId, status, tempProductId } = orderRes.recordset[0];
            
            // حالة AWAITING_QUANTITY
            if (status === 'AWAITING_QUANTITY' && tempProductId) {
              const quantityNum = parseInt(upperText);
              if (isNaN(quantityNum) || quantityNum <= 0) {
                await client.sendMessage(msg.from, bold('من فضلك أدخل رقم صحيح للكمية.'));
                return;
              }
              // إضافة الصنف إلى OrderItems
              await pool.request()
                .input('orderId', sql.Int, orderId)
                .input('productId', sql.Int, tempProductId)
                .input('qty', sql.Int, quantityNum)
                .query(`
                  INSERT INTO OrderItems (orderId, productId, quantity)
                  VALUES (@orderId, @productId, @qty)
                `);

              // إعادة الحالة إلى IN_CART
              await pool.request()
                .input('orderId', sql.Int, orderId)
                .input('status', sql.NVarChar, 'IN_CART')
                .query(`
                  UPDATE Orders
                  SET status = @status, tempProductId = NULL
                  WHERE id = @orderId
                `);

              // حساب إجمالي عدد الوحدات وقيمتها
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

              // الرسالة الجديدة بعد إضافة المنتج للسلة
              let addedMsg = `*تم إضافة المنتج للسلة.*\n`;
              addedMsg += `===========================\n`;
              addedMsg += `*يوجد عدد (${totalQty}) صنف بقيمة (${totalPrice}) داخل سلة المشتريات*\n`;
              addedMsg += `*لعرض السلة وتنفيذ الطلب :*\n`;
              addedMsg += `wa.me/${phoneNumber}?text=VIEWCART\n\n`;
              addedMsg += `*لإضافة منتج آخر:*\n`;
              addedMsg += `wa.me/${phoneNumber}?text=SHOWCATEGORIES`;

              await client.sendMessage(msg.from, addedMsg);
              return;
            }

            // حالة AWAITING_NAME
            if (status === 'AWAITING_NAME') {
              const newName = msg.body.trim();
              await saveCustomerName(customerPhone, newName);
              await pool.request()
                .input('orderId', sql.Int, orderId)
                .input('customerName', sql.NVarChar, newName)
                .input('status', sql.NVarChar, 'AWAITING_ADDRESS')
                .query(
                  `UPDATE Orders
                  SET customerName = @customerName,
                      status = @status
                  WHERE id = @orderId`
                );
              clearOrderTimeout(orderId);
              scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
              const addresses = await getCustomerAddresses(customerPhone);
              const customerName = await getCustomerName(customerPhone);

              if (addresses.length > 0) {
                let addrMsg = `مرحبا *${customerName}*، اختر احد العناوين المسجلة أو اضف عنوان جديد` + '\n===========================\n';
                addresses.forEach(addr => {
                  addrMsg += `${addr.address}\n`;
                  addrMsg += `wa.me/${phoneNumber}?text=ADDRESS_${addr.id}\n\n`;
                });
                addrMsg += `===========================\n*عنوان جديد*\nwa.me/${phoneNumber}?text=NEWADDRESS`;
                await client.sendMessage(msg.from, addrMsg);
              } else {
                await client.sendMessage(msg.from, bold('برجاء إرسال العنوان'));
              }
              return;
            }

            // حالة AWAITING_ADDRESS
            if (status === 'AWAITING_ADDRESS') {
              // إذا أرسل العميل NEWADDRESS
              if (upperText === 'NEWADDRESS') {
                await client.sendMessage(msg.from, bold('برجاء إرسال العنوان الجديد'));
                return;
              }
              // إذا كانت الرسالة اختيار من العناوين المحفوظة
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
                return;
              } else {
                // اعتبار الرسالة عنوان جديد
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
                return;
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
                io.emit('newOrder', { orderId: orderId });

                // إعادة جدولة مؤقت (إذا أردت حذفه بعد مدة إن لم يتم متابعته)
                const sessionData = await pool.request()
                  .input('sessionId', sql.Int, sessionId)
                  .query(`
                    SELECT alternateWhatsAppNumber, phoneNumber
                    FROM Sessions
                    WHERE id = @sessionId
                  `);
                if (sessionData.recordset.length) {
                  const sessionPhone = sessionData.recordset[0].phoneNumber;
                  scheduleOrderTimeout(orderId, sessionId, client, sessionPhone);
                }

                // إرسال إشعار للرقم البديل إن وجد
                if (sessionData.recordset.length && sessionData.recordset[0].alternateWhatsAppNumber) {
                  const altNumber = sessionData.recordset[0].alternateWhatsAppNumber;
                  const altRecipient = altNumber + '@c.us';
                  const orderDetailsQuery = await pool.request()
                    .input('orderId', sql.Int, orderId)
                    .query(`
                      SELECT o.id, o.customerName, o.customerPhoneNumber, o.deliveryAddress, o.totalPrice, o.createdAt
                      FROM Orders o
                      WHERE o.id = @orderId
                    `);
                  let orderDetailsMsg = '';
                  if (orderDetailsQuery.recordset.length) {
                    const order = orderDetailsQuery.recordset[0];
                    const orderItemsQuery = await pool.request()
                      .input('orderId', sql.Int, orderId)
                      .query(`
                        SELECT oi.quantity, p.product_name, p.price
                        FROM OrderItems oi
                        JOIN Products p ON p.id = oi.productId
                        WHERE oi.orderId = @orderId
                      `);
                    orderDetailsMsg = `*تم استلام طلب جديد.*\n`
                      + `*رقم الطلب*: ${order.id}\n`
                      + `*اسم العميل*: ${order.customerName || 'غير متوفر'}\n`
                      + `*رقم العميل*: ${order.customerPhoneNumber || 'غير متوفر'}\n`
                      + `*العنوان*: ${order.deliveryAddress || 'غير متوفر'}\n`
                      + `*الإجمالي*: ${order.totalPrice || 0}\n`
                      + `*تفاصيل الطلب*:\n`;
                    orderItemsQuery.recordset.forEach((item: any) => {
                      orderDetailsMsg += `*${item.product_name}* x *${item.quantity}* = *${item.price * item.quantity}*\n`;
                    });
                  }
                  await client.sendMessage(altRecipient, orderDetailsMsg);
                }
                return;
              }
              else if (msg.type === 'location' && msg.location) {
                const { latitude, longitude } = msg.location;
                await pool.request()
                  .input('orderId', sql.Int, orderId)
                  .input('lat', sql.Decimal(9,6), latitude)
                  .input('lng', sql.Decimal(9,6), longitude)
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
                io.emit('newOrder', { orderId: orderId });

                const sessionData = await pool.request()
                  .input('sessionId', sql.Int, sessionId)
                  .query(`
                    SELECT alternateWhatsAppNumber, phoneNumber
                    FROM Sessions
                    WHERE id = @sessionId
                  `);
                // إرسال إشعار للرقم البديل إن وجد
                if (sessionData.recordset.length && sessionData.recordset[0].alternateWhatsAppNumber) {
                  const altNumber = sessionData.recordset[0].alternateWhatsAppNumber;
                  const altRecipient = altNumber + '@c.us';
                  const orderDetailsQuery = await pool.request()
                    .input('orderId', sql.Int, orderId)
                    .query(`
                      SELECT o.id, o.customerName, o.customerPhoneNumber, o.deliveryAddress, o.totalPrice, o.createdAt
                      FROM Orders o
                      WHERE o.id = @orderId
                    `);
                  let orderDetailsMsg = '';
                  if (orderDetailsQuery.recordset.length) {
                    const order = orderDetailsQuery.recordset[0];
                    const orderItemsQuery = await pool.request()
                      .input('orderId', sql.Int, orderId)
                      .query(`
                        SELECT oi.quantity, p.product_name, p.price
                        FROM OrderItems oi
                        JOIN Products p ON p.id = oi.productId
                        WHERE oi.orderId = @orderId
                      `);
                    orderDetailsMsg = `تم استلام طلب جديد.\n`
                      + `رقم الطلب: ${order.id}\n`
                      + `اسم العميل: ${order.customerName || 'غير متوفر'}\n`
                      + `رقم العميل: ${order.customerPhoneNumber || 'غير متوفر'}\n`
                      + `العنوان: ${order.deliveryAddress || 'غير متوفر'}\n`
                      + `الإجمالي: ${order.totalPrice || 0}\n`
                      + `التفاصيل:\n`;
                    orderItemsQuery.recordset.forEach((item: any) => {
                      orderDetailsMsg += `*${item.quantity} x ${item.product_name} = ${item.price * item.quantity}\n`;
                    });
                  } else {
                    orderDetailsMsg = `تم استلام طلب جديد.\n`
                      + `رقم الطلب: ${orderId}\n`
                      + `يرجى مراجعة التفاصيل.`;
                  }
                  await client.sendMessage(altRecipient, orderDetailsMsg);
                }
                return;
              }
              else {
                await client.sendMessage(
                  msg.from,
                  bold("من فضلك أرسل الموقع أو اضغط على الرابط للتخطي:") + "\n" + `wa.me/${phoneNumber}?text=SKIP_LOCATION`
                );
                return;
              }
            }
          }
        }
      }

      // ================== (3) منطق الرسائل الدورية (Greeting) ==================
      // ------------- أولاً: اكتشاف ما إذا كانت الرسالة أمر Menu Bot أم لا -------------
      const isCommand =
        ['NEWORDER', 'SHOWCATEGORIES', 'VIEWCART', 'CARTCONFIRM'].some(cmd => upperText === cmd) ||
        upperText.startsWith('CATEGORY_') ||
        upperText.startsWith('PRODUCT_') ||
        upperText.startsWith('REMOVEPRODUCT_');

      // ------------- (A) إرسال Greeting (إن وجد) قبل رسالة الملاحظة -------------
      if (greetingActive && !isCommand) {
        const existingOrder = await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('custPhone', sql.NVarChar, customerPhone)
          .query(`
            SELECT TOP 1 id 
            FROM Orders 
            WHERE sessionId = @sessionId 
              AND customerPhoneNumber = @custPhone
              AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
          `);
        if (existingOrder.recordset.length === 0) {
          const now = new Date();
          const greetingLogRow = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('custPhone', sql.NVarChar, customerPhone)
            .query(`
              SELECT lastSentAt
              FROM GreetingLog
              WHERE sessionId = @sessionId
                AND phoneNumber = @custPhone
            `);
          let canSendGreeting = false;
          if (!greetingLogRow.recordset.length) {
            canSendGreeting = true;
          } else {
            const lastSent = new Date(greetingLogRow.recordset[0].lastSentAt);
            const diffMs = new Date().getTime() - lastSent.getTime();
            const diffMinutes = diffMs / 1000 / 60;
            if (diffMinutes >= 60) {
              canSendGreeting = true;
            }
          }
          if (canSendGreeting && greetingMessage) {
            await client.sendMessage(msg.from, greetingMessage);
            if (!greetingLogRow.recordset.length) {
              await pool.request()
                .input('sessionId', sql.Int, sessionId)
                .input('custPhone', sql.NVarChar, customerPhone)
                .input('now', sql.DateTime, now)
                .query(`
                  INSERT INTO GreetingLog (sessionId, phoneNumber, lastSentAt)
                  VALUES (@sessionId, @custPhone, @now)
                `);
            } else {
              await pool.request()
                .input('sessionId', sql.Int, sessionId)
                .input('custPhone', sql.NVarChar, customerPhone)
                .input('now', sql.DateTime, now)
                .query(`
                  UPDATE GreetingLog
                  SET lastSentAt = @now
                  WHERE sessionId = @sessionId
                    AND phoneNumber = @custPhone
                `);
            }
          }
        }
      }

      // ------------- (B) إرسال الرسالة التوضيحية للـ Menu Bot (ملاحظة يرجى الضغط...) -------------
      if (
        menuBotActive &&
        (await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('custPhone', sql.NVarChar, customerPhone)
          .query(`
            SELECT TOP 1 id 
            FROM Orders 
            WHERE sessionId = @sessionId 
              AND customerPhoneNumber = @custPhone
              AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
          `)).recordset.length === 0 &&
        !isCommand
      ) {

        const specialPhoneForMenuBot = customerPhone + '-menubot';
        const now = new Date();
        const menuBotLogRow = await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('specialPhone', sql.NVarChar, specialPhoneForMenuBot)
          .query(`
            SELECT lastSentAt
            FROM GreetingLog
            WHERE sessionId = @sessionId
              AND phoneNumber = @specialPhone
          `);

        let canSendMenuBot = false;
        if (!menuBotLogRow.recordset.length) {
          canSendMenuBot = true;
        } else {
          const lastSent = new Date(menuBotLogRow.recordset[0].lastSentAt);
          const diffMs = now.getTime() - lastSent.getTime();
          const diffMinutes = diffMs / 1000 / 60;
          if (diffMinutes >= 60) {
            canSendMenuBot = true;
          }
        }

        if (canSendMenuBot) {
          const menuBotGuide = `*ملاحظة* يرجى الضغط على الرابط المراد اختياره ثم الضغط على زر الإرسال

*لتسجيل طلب جديد*
wa.me/${phoneNumber}?text=NEWORDER
`;
          await client.sendMessage(msg.from, menuBotGuide);

          if (!menuBotLogRow.recordset.length) {
            await pool.request()
              .input('sessionId', sql.Int, sessionId)
              .input('specialPhone', sql.NVarChar, specialPhoneForMenuBot)
              .input('now', sql.DateTime, now)
              .query(`
                INSERT INTO GreetingLog (sessionId, phoneNumber, lastSentAt)
                VALUES (@sessionId, @specialPhone, @now)
              `);
          } else {
            await pool.request()
              .input('sessionId', sql.Int, sessionId)
              .input('specialPhone', sql.NVarChar, specialPhoneForMenuBot)
              .input('now', sql.DateTime, now)
              .query(`
                UPDATE GreetingLog
                SET lastSentAt = @now
                WHERE sessionId = @sessionId
                  AND phoneNumber = @specialPhone
              `);
          }
        }
      }

    } catch (error) {
      console.error('Error handling menuBot message:', error);
    }
  });
};
