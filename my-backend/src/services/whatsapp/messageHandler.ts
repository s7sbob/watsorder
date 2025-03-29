// src/services/whatsapp/messageHandler.ts
import { Client, Message, MessageMedia } from 'whatsapp-web.js';
import { poolPromise } from '../../config/db2'; // استخدمنا poolPromise للاتصال المجمع
import * as sql from 'mssql';

import fs from 'fs/promises'; // استخدام الدوال غير المتزامنة من fs/promises
import path from 'path';
import { io } from '../../server';

import { scheduleOrderTimeout, clearOrderTimeout } from './orderTimeouts';
import {
  getCustomerName,
  saveCustomerName,
  getCustomerAddresses,
  saveCustomerAddress
} from './customerInfo';

// دالة تسجيل معالج الرسائل لجلسة معينة
export const registerMessageHandler = (client: Client, sessionId: number) => {
  // دالة تنسيق النص بالخط العريض
  const bold = (text: string) => `*${text}*`;

  client.on('message', async (msg: Message) => {
    console.log(`\n[${new Date().toISOString()}] Received message from ${msg.from}: ${msg.body}`);
    try {
      console.log(`[${new Date().toISOString()}] Acquiring DB connection...`);
      const pool = await poolPromise;
      console.log(`[${new Date().toISOString()}] DB connection acquired.`);

      console.log(`[${new Date().toISOString()}] Querying session info for sessionId=${sessionId}`);
      const sessionRow = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive, menuBotActive, phoneNumber,
                 greetingActive, greetingMessage
          FROM Sessions
          WHERE id = @sessionId
        `);
      console.log(`[${new Date().toISOString()}] Session query result:`, sessionRow.recordset);

      if (!sessionRow.recordset.length) {
        console.log(`[${new Date().toISOString()}] Session not found in DB for message handling.`);
        return;
      }
      if (msg.from.endsWith('@g.us')) {
        console.log(`[${new Date().toISOString()}] Message from group ignored.`);
        return;
      }

      const {
        botActive,
        menuBotActive,
        phoneNumber,
        greetingActive,
        greetingMessage
      } = sessionRow.recordset[0];

      const text = msg.body.trim();
      const upperText = text.toUpperCase();
      const customerPhone = msg.from.split('@')[0];
      console.log(`[${new Date().toISOString()}] Customer phone: ${customerPhone}`);
      
      // ===================== (1) البوت العادي (Keywords) =====================
      if (botActive) {
        console.log(`[${new Date().toISOString()}] BotActive is ON, processing keywords...`);
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
        console.log(`[${new Date().toISOString()}] Keywords query returned ${keywordsRes.recordset.length} rows.`);

        const foundKeywordRow = keywordsRes.recordset.find((row: any) =>
          text.toLowerCase().includes(row.keyword?.toLowerCase())
        );
        
        if (foundKeywordRow) {
          console.log(`[${new Date().toISOString()}] Found matching keyword: ${foundKeywordRow.keyword}`);
          const mediaRes = await pool.request()
            .input('replayId', sql.Int, foundKeywordRow.replayId)
            .query(`
              SELECT filePath
              FROM ReplayMedia
              WHERE replayId = @replayId
            `);
          console.log(`[${new Date().toISOString()}] Media query returned ${mediaRes.recordset.length} rows.`);

          if (foundKeywordRow.replyText) {
            console.log(`[${new Date().toISOString()}] Sending text reply: ${foundKeywordRow.replyText}`);
            await client.sendMessage(msg.from, `*${foundKeywordRow.replyText}*`);
          }

          for (const m of mediaRes.recordset) {
            try {
              console.log(`[${new Date().toISOString()}] Reading file from path: ${m.filePath}`);
              const fileData = await fs.readFile(m.filePath);
              const base64 = fileData.toString('base64');
              const mediaMsg = new MessageMedia(
                'image/jpeg',
                base64,
                path.basename(m.filePath)
              );
              console.log(`[${new Date().toISOString()}] Sending media message for file: ${m.filePath}`);
              await client.sendMessage(msg.from, mediaMsg);
            } catch (err) {
              console.error(`[${new Date().toISOString()}] Failed to read or send file: ${m.filePath}`, err);
            }
          }
          console.log(`[${new Date().toISOString()}] Finished processing bot keywords.`);
          return;
        }
      }

      // ===================== (2) المنيو بوت (Menu Bot) =====================
      if (menuBotActive) {
        console.log(`[${new Date().toISOString()}] MenuBot is active.`);
        if (upperText === 'NEWORDER') {
          console.log(`[${new Date().toISOString()}] Processing NEWORDER command.`);
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
          console.log(`[${new Date().toISOString()}] Open order query returned ${openOrder.recordset.length} rows.`);
          if (openOrder.recordset.length > 0) {
            console.log(`[${new Date().toISOString()}] An open order already exists. Not creating new order.`);
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
          console.log(`[${new Date().toISOString()}] New order created with id: ${orderId}`);
          scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
          const categories = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT id, category_name
              FROM Categories
              WHERE sessionId = @sessionId
            `);
          console.log(`[${new Date().toISOString()}] Categories query returned ${categories.recordset.length} rows.`);
          if (!categories.recordset.length) {
            console.log(`[${new Date().toISOString()}] No categories available.`);
            await client.sendMessage(msg.from, bold('لا توجد أصناف متاحة.'));
            return;
          }
          let catMsg = bold('برجاء اختيار القسم') + '\n===========================\n';
          for (const cat of categories.recordset) {
            catMsg += bold(cat.category_name) + '\n';
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`;
          }
          console.log(`[${new Date().toISOString()}] Sending categories message.`);
          await client.sendMessage(msg.from, catMsg);
          return;
        }
        else if (upperText === 'SHOWCATEGORIES') {
          console.log(`[${new Date().toISOString()}] Processing SHOWCATEGORIES command.`);
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
            console.log(`[${new Date().toISOString()}] No open order exists for SHOWCATEGORIES.`);
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*\nwa.me/${phoneNumber}?text=NEWORDER`);
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
          console.log(`[${new Date().toISOString()}] Active categories returned: ${categories.recordset.length}`);
          if (!categories.recordset.length) {
            await client.sendMessage(msg.from, bold('لا توجد أصناف متاحة.'));
            return;
          }
          let catMsg = bold('اختر الصنف لإضافة منتجات:') + '\n===========================\n';
          for (const cat of categories.recordset) {
            catMsg += bold(cat.category_name) + '\n';
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`;
          }
          console.log(`[${new Date().toISOString()}] Sending categories message for SHOWCATEGORIES.`);
          await client.sendMessage(msg.from, catMsg);
          return;
        }
        else if (upperText.startsWith('CATEGORY_')) {
          console.log(`[${new Date().toISOString()}] Processing CATEGORY_ command.`);
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
          console.log(`[${new Date().toISOString()}] Products query returned ${productsData.recordset.length} rows for category ${catId}`);
          if (!productsData.recordset.length) {
            await client.sendMessage(msg.from, bold('لا توجد منتجات في هذا التصنيف.'));
            return;
          }
          let prodMsg = bold('برجاء إختيار المنتج') + '\n===========================\n';
          for (const p of productsData.recordset) {
            prodMsg += bold(`${p.product_name} (${p.price}ج)`) + '\n';
            prodMsg += `wa.me/${phoneNumber}?text=PRODUCT_${p.id}\n\n`;
          }
          console.log(`[${new Date().toISOString()}] Sending products list message.`);
          await client.sendMessage(msg.from, prodMsg);
          return;
        }
        else if (upperText.startsWith('PRODUCT_')) {
          console.log(`[${new Date().toISOString()}] Processing PRODUCT_ command.`);
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
          console.log(`[${new Date().toISOString()}] Order query returned ${orderRow.recordset.length} rows for PRODUCT_ command.`);
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*\nwa.me/${phoneNumber}?text=NEWORDER`);
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
          console.log(`[${new Date().toISOString()}] Updated order ${orderId} with tempProductId ${productId} and set status AWAITING_QUANTITY.`);
          clearOrderTimeout(orderId);
          scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
          await client.sendMessage(msg.from, bold('برجاء إرسال الكمية'));
          return;
        }
        else if (upperText.startsWith('REMOVEPRODUCT_')) {
          console.log(`[${new Date().toISOString()}] Processing REMOVEPRODUCT_ command.`);
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
            await client.sendMessage(msg.from, `*لا يوجد طلب مفتوح. أبدأ طلب جديد أولا*\nwa.me/${phoneNumber}?text=NEWORDER`);
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
          console.log(`[${new Date().toISOString()}] Removed product ${productId} from order ${orderId}.`);
          await client.sendMessage(msg.from, bold('تم حذف المنتج من السلة.'));
          return;
        }
        else if (upperText === 'VIEWCART') {
          console.log(`[${new Date().toISOString()}] Processing VIEWCART command.`);
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
          console.log(`[${new Date().toISOString()}] Sending cart summary for order ${orderId}.`);
          await client.sendMessage(msg.from, cartMsg);
          return;
        }
        else if (upperText === 'CARTCONFIRM') {
          console.log(`[${new Date().toISOString()}] Processing CARTCONFIRM command.`);
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
            return;
          }
          const orderId = orderRow.recordset[0].id;
          const customerName = await getCustomerName(customerPhone);
          console.log(`[${new Date().toISOString()}] Retrieved customer name: ${customerName}`);
          if (customerName == null) {
            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('status', sql.NVarChar, 'AWAITING_NAME')
              .query(`
                UPDATE Orders
                SET status = @status, tempProductId = NULL
                WHERE id = @orderId
              `);
            console.log(`[${new Date().toISOString()}] Order ${orderId} updated to AWAITING_NAME.`);
            clearOrderTimeout(orderId);
            scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
            await client.sendMessage(msg.from, bold('من فضلك قم بإرسال اسم صاحب الطلب'));
            return; 
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
            console.log(`[${new Date().toISOString()}] Order ${orderId} updated to AWAITING_ADDRESS with customer name ${customerName}.`);
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
              console.log(`[${new Date().toISOString()}] Sending addresses list for customer ${customerPhone}.`);
              await client.sendMessage(msg.from, addrMsg);
            } else {
              console.log(`[${new Date().toISOString()}] No addresses found for customer ${customerPhone}. Requesting new address.`);
              await client.sendMessage(msg.from, bold('برجاء إرسال العنوان'));
            }
            return;
          }
        }
        else {
          console.log(`[${new Date().toISOString()}] Processing remaining order stages.`);
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
            console.log(`[${new Date().toISOString()}] No active order in pending stages.`);
          } else {
            const { id: orderId, status, tempProductId } = orderRes.recordset[0];
            console.log(`[${new Date().toISOString()}] Active order found: id=${orderId}, status=${status}`);
            
            // حالة AWAITING_QUANTITY
            if (status === 'AWAITING_QUANTITY' && tempProductId) {
              const quantityNum = parseInt(upperText);
              if (isNaN(quantityNum) || quantityNum <= 0) {
                console.log(`[${new Date().toISOString()}] Invalid quantity input: ${upperText}`);
                await client.sendMessage(msg.from, bold('من فضلك أدخل رقم صحيح للكمية.'));
                return;
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
              console.log(`[${new Date().toISOString()}] Cart summary for order ${orderId}: ${totalQty} items, total price ${totalPrice}.`);
              clearOrderTimeout(orderId);
              scheduleOrderTimeout(orderId, sessionId, client, phoneNumber);
              let addedMsg = `*تم إضافة المنتج للسلة.*\n===========================\n`;
              addedMsg += `*يوجد عدد (${totalQty}) صنف بقيمة (${totalPrice}) داخل سلة المشتريات*\n`;
              addedMsg += `*لعرض السلة وتنفيذ الطلب :*\n`;
              addedMsg += `wa.me/${phoneNumber}?text=VIEWCART\n\n`;
              addedMsg += `*لإضافة منتج آخر:*\n`;
              addedMsg += `wa.me/${phoneNumber}?text=SHOWCATEGORIES`;
              console.log(`[${new Date().toISOString()}] Sending cart update message.`);
              await client.sendMessage(msg.from, addedMsg);
              return;
            }
            // حالة AWAITING_NAME
            if (status === 'AWAITING_NAME') {
              const newName = msg.body.trim();
              console.log(`[${new Date().toISOString()}] Received name input: ${newName}`);
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
              console.log(`[${new Date().toISOString()}] Retrieved ${addresses.length} addresses for customer ${customerPhone}.`);
              const customerName = await getCustomerName(customerPhone);
              if (addresses.length > 0) {
                let addrMsg = `مرحبا *${customerName}*، اختر احد العناوين المسجلة أو اضف عنوان جديد` + '\n===========================\n';
                addresses.forEach(addr => {
                  addrMsg += `${addr.address}\n`;
                  addrMsg += `wa.me/${phoneNumber}?text=ADDRESS_${addr.id}\n\n`;
                });
                addrMsg += `===========================\n*عنوان جديد*\nwa.me/${phoneNumber}?text=NEWADDRESS`;
                console.log(`[${new Date().toISOString()}] Sending addresses selection message.`);
                await client.sendMessage(msg.from, addrMsg);
              } else {
                console.log(`[${new Date().toISOString()}] No addresses found, requesting new address.`);
                await client.sendMessage(msg.from, bold('برجاء إرسال العنوان'));
              }
              return;
            }
            // حالة AWAITING_ADDRESS
            if (status === 'AWAITING_ADDRESS') {
              if (upperText === 'NEWADDRESS') {
                console.log(`[${new Date().toISOString()}] Customer requested new address.`);
                await client.sendMessage(msg.from, bold('برجاء إرسال العنوان الجديد'));
                return;
              }
              if (upperText.startsWith('ADDRESS_')) {
                const addrId = parseInt(upperText.replace('ADDRESS_', ''));
                const addresses = await getCustomerAddresses(customerPhone);
                const selected = addresses.find(addr => addr.id === addrId);
                if (selected) {
                  console.log(`[${new Date().toISOString()}] Customer selected address: ${selected.address}`);
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
                  console.log(`[${new Date().toISOString()}] Selected address id ${addrId} not found.`);
                  await client.sendMessage(msg.from, bold('العنوان المختار غير موجود.'));
                }
                return;
              } else {
                const newAddress = msg.body.trim();
                console.log(`[${new Date().toISOString()}] Received new address: ${newAddress}`);
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
                console.log(`[${new Date().toISOString()}] Customer skipped location input.`);
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
                const sessionData = await pool.request()
                  .input('sessionId', sql.Int, sessionId)
                  .query(`
                    SELECT alternateWhatsAppNumber, phoneNumber
                    FROM Sessions
                    WHERE id = @sessionId
                  `);
                if (sessionData.recordset.length) {
                  const sessionPhoneDB = sessionData.recordset[0].phoneNumber;
                  scheduleOrderTimeout(orderId, sessionId, client, sessionPhoneDB);
                }
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
                  console.log(`[${new Date().toISOString()}] Sending alternate notification to ${sessionData.recordset[0].alternateWhatsAppNumber}`);
                  await client.sendMessage(altRecipient, orderDetailsMsg);
                }
                return;
              }
              else if (msg.type === 'location' && msg.location) {
                console.log(`[${new Date().toISOString()}] Received location message.`);
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
                      + `يرجى مراجعة التفاصيل.`;
                  } else {
                    orderDetailsMsg = `تم استلام طلب جديد.\nرقم الطلب: ${orderId}\nيرجى مراجعة التفاصيل.`;
                  }
                  console.log(`[${new Date().toISOString()}] Sending alternate notification for location message.`);
                  await client.sendMessage(altRecipient, orderDetailsMsg);
                }
                return;
              }
              else {
                console.log(`[${new Date().toISOString()}] Location not provided properly. Prompting customer.`);
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

      // ===================== (3) منطق الرسائل الدورية (Greeting) =====================
      console.log(`[${new Date().toISOString()}] Processing Greeting logic...`);
      const isCommand =
        ['NEWORDER', 'SHOWCATEGORIES', 'VIEWCART', 'CARTCONFIRM'].some(cmd => upperText === cmd) ||
        upperText.startsWith('CATEGORY_') ||
        upperText.startsWith('PRODUCT_') ||
        upperText.startsWith('REMOVEPRODUCT_');

      if (greetingActive && !isCommand) {
        console.log(`[${new Date().toISOString()}] Greeting is active and message is not a command.`);
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
        console.log(`[${new Date().toISOString()}] Existing order for greeting: ${existingOrder.recordset.length}`);
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
            console.log(`[${new Date().toISOString()}] No previous greeting found; can send greeting.`);
          } else {
            const lastSent = new Date(greetingLogRow.recordset[0].lastSentAt);
            const diffMs = new Date().getTime() - lastSent.getTime();
            const diffMinutes = diffMs / 1000 / 60;
            console.log(`[${new Date().toISOString()}] Last greeting sent ${diffMinutes.toFixed(2)} minutes ago.`);
            if (diffMinutes >= 60) {
              canSendGreeting = true;
            }
          }
          if (canSendGreeting && greetingMessage) {
            console.log(`[${new Date().toISOString()}] Sending greeting message.`);
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
        console.log(`[${new Date().toISOString()}] Processing MenuBot greeting for new order.`);
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
          console.log(`[${new Date().toISOString()}] No previous MenuBot greeting found.`);
        } else {
          const lastSent = new Date(menuBotLogRow.recordset[0].lastSentAt);
          const diffMs = now.getTime() - lastSent.getTime();
          const diffMinutes = diffMs / 1000 / 60;
          console.log(`[${new Date().toISOString()}] Last MenuBot greeting sent ${diffMinutes.toFixed(2)} minutes ago.`);
          if (diffMinutes >= 60) {
            canSendMenuBot = true;
          }
        }

        if (canSendMenuBot) {
          const menuBotGuide = `*ملاحظة* يرجى الضغط على الرابط المراد اختياره ثم الضغط على زر الإرسال

*لتسجيل طلب جديد*
wa.me/${phoneNumber}?text=NEWORDER
`;
          console.log(`[${new Date().toISOString()}] Sending MenuBot guidance message.`);
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

      console.log(`[${new Date().toISOString()}] Finished processing message from ${msg.from}.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error handling message:`, error);
    }
  });
};
