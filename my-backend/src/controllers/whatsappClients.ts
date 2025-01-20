// src/controllers/whatsappClients.ts

import { Client, LocalAuth, Message } from 'whatsapp-web.js'
import { getConnection } from '../config/db'
import * as sql from 'mssql'
import { io } from '../server'

// خريطة للاحتفاظ بالعملاء المفتوحين
interface WhatsAppClientMap {
  [sessionId: number]: Client
}

export const whatsappClients: WhatsAppClientMap = {}

/**
 * إنشاء عميل واتساب جديد لجلسة معيّنة
 */
export const createWhatsAppClientForSession = async (sessionId: number, sessionIdentifier: string) => {
  // تنقية clientId
  const sanitizedClientId = sessionIdentifier.replace(/[^A-Za-z0-9_-]/g, '_')

  // تهيئة عميل الواتساب
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sanitizedClientId }),
    puppeteer: { headless: true }
  })

  // =========== [ Events: QR / Auth / Ready / Disconnected ] ===========

  client.on('qr', async qr => {
    console.log(`QR Code for session ${sessionId}:`, qr)
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('qr', sql.NVarChar, qr)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for QR Code', qrCode = @qr
        WHERE id = @sessionId
      `)

    io.emit('sessionUpdate', { sessionId, status: 'Waiting for QR Code', qrCode: qr })
  })

  client.on('authenticated', async () => {
    console.log(`Session ${sessionId} authenticated.`)
    const pool = await getConnection()
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Connected'
        WHERE id = @sessionId
      `)

    io.emit('sessionUpdate', { sessionId, status: 'Connected' })
  })

  client.on('ready', async () => {
    console.log(`Session ${sessionId} is ready and connected.`)
    // حفظ رقم الهاتف في Sessions.phoneNumber
    try {
      const fullWhatsAppID = client.info?.wid?._serialized
      if (fullWhatsAppID) {
        const purePhoneNumber = fullWhatsAppID.replace('@c.us', '')
        const pool = await getConnection()
        await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('phoneNumber', sql.NVarChar, purePhoneNumber)
          .query(`
            UPDATE Sessions
            SET phoneNumber = @phoneNumber
            WHERE id = @sessionId
          `)

        console.log(`Phone number ${purePhoneNumber} stored for session ${sessionId}`)
      } else {
        console.log('Could not retrieve WhatsApp ID.')
      }
    } catch (error) {
      console.error('Error storing phone number in DB:', error)
    }
  })

  client.on('disconnected', reason => {
    console.log(`Session ${sessionId} was logged out`, reason)
    // بث تحديث إن لزم الأمر
  })

  // =========== [ Handling Messages: Bot + Menu Bot ] ===========

  client.on('message', async (msg: Message) => {
    try {
      const pool = await getConnection()
      // جلب إعدادات البوت لهذه الجلسة
      const sessionRow = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive, menuBotActive, phoneNumber
          FROM Sessions
          WHERE id = @sessionId
        `)

      if (!sessionRow.recordset.length) {
        console.log('Session not found in DB for message handling.')
        return
      }

      const { botActive, menuBotActive, phoneNumber } = sessionRow.recordset[0]
      // إذا لا يوجد أي بوت مفعّل
      if (!botActive && !menuBotActive) return

      const text = msg.body.trim()              // نص الرسالة
      const upperText = text.toUpperCase()
      const customerPhone = msg.from.split('@')[0] // رقم العميل الذي يرسل الرسالة

      // =========== (1) البوت العادي (Keywords) ===========
      if (botActive) {
        // ابحث عن Keyword
        const keywordsRes = await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .query(`
            SELECT k.keyword, r.replyText
            FROM Keywords k
            JOIN Replays r ON k.replay_id = r.id
            WHERE k.sessionId = @sessionId
          `)
        const foundKeyword = keywordsRes.recordset.find((row: any) =>
          row.keyword?.toLowerCase() === text.toLowerCase()
        )
        if (foundKeyword) {
          await client.sendMessage(msg.from, foundKeyword.replyText)
          return
        }
      }

      // =========== (2) المنيو بوت (Menu Bot) ===========
      if (menuBotActive) {
        // ========== [NEWORDER] ==========
        if (upperText === 'NEWORDER') {
          // تحقق إن كان هناك طلب مفتوح بالفعل لنفس (sessionId + customerPhoneNumber)
          const openOrder = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('custPhone', sql.NVarChar, customerPhone)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND customerPhoneNumber = @custPhone
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY')
              ORDER BY id DESC
            `)
        
          if (openOrder.recordset.length > 0) {
            // لدى هذا الرقم بالفعل طلب قائم
            await client.sendMessage(msg.from,
              'لديك طلب قائم بالفعل. برجاء إكماله أو تأكيده قبل إنشاء طلب جديد.'
            )
            return
          }
        
          // لا يوجد طلب مفتوح لهذا العميل، أنشئ طلبًا جديدًا
          const insertOrder = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('status', sql.NVarChar, 'IN_CART')
            .input('custPhone', sql.NVarChar, customerPhone)
            .query(`
              INSERT INTO Orders (sessionId, status, customerPhoneNumber)
              OUTPUT INSERTED.id
              VALUES (@sessionId, @status, @custPhone)
            `)
          const newOrderId = insertOrder.recordset[0].id

          // اعرض الأصناف
          const categories = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT id, category_name
              FROM Categories
              WHERE sessionId = @sessionId
            `)
          if (!categories.recordset.length) {
            await client.sendMessage(msg.from, 'لا توجد أصناف متاحة.')
            return
          }

          let catMsg = `اختر الصنف\n =========================== \n`
          for (const cat of categories.recordset) {
            catMsg += `${cat.category_name}\n`
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`
          }
          await client.sendMessage(msg.from, catMsg)
          return
        }

        // ========== [SHOWCATEGORIES] ==========
        else if (upperText === 'SHOWCATEGORIES') {
          // لإعادة عرض الأصناف بهدف إضافة منتج آخر
          const openOrder = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY')
              ORDER BY id DESC
            `)
          if (!openOrder.recordset.length) {
            await client.sendMessage(msg.from, 'لا يوجد طلب مفتوح. استخدم NEWORDER لفتح طلب جديد.')
            return
          }

          // عرض الأصناف
          const categories = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT id, category_name
              FROM Categories
              WHERE sessionId = @sessionId
            `)
          if (!categories.recordset.length) {
            await client.sendMessage(msg.from, 'لا توجد أصناف متاحة.')
            return
          }

          let catMsg = 'اختر الصنف لإضافة منتجات:\n =========================== \n'
          for (const cat of categories.recordset) {
            catMsg += `${cat.category_name}\n`
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`
          }
          await client.sendMessage(msg.from, catMsg)
          return
        }

        // ========== [CATEGORY_x] ==========
        else if (upperText.startsWith('CATEGORY_')) {
          const catId = parseInt(upperText.replace('CATEGORY_', ''))
          // جلب المنتجات
          const productsData = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('catId', sql.Int, catId)
            .query(`
              SELECT id, product_name, price
              FROM Products
              WHERE sessionId = @sessionId
                AND category_id = @catId
            `)
          if (!productsData.recordset.length) {
            await client.sendMessage(msg.from, 'لا توجد منتجات في هذا التصنيف.')
            return
          }

          let prodMsg = `اختر المنتج:\n=========================== \n`
          for (const p of productsData.recordset) {
            prodMsg += `${p.product_name} (${p.price} ج)\n`
            prodMsg += `wa.me/${phoneNumber}?text=PRODUCT_${p.id}\n\n`
          }
          await client.sendMessage(msg.from, prodMsg)
          return
        }

        // ========== [PRODUCT_x] ==========
        else if (upperText.startsWith('PRODUCT_')) {
          const productId = parseInt(upperText.replace('PRODUCT_', ''))

          // جلب آخر طلب مفتوح
          const orderRow = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id, status
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, 'لا يوجد طلب مفتوح. استخدم NEWORDER أولاً.')
            return
          }
          const orderId = orderRow.recordset[0].id

          // اجعل status = AWAITING_QUANTITY واحفظ productId في tempProductId
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('tempProductId', sql.Int, productId)
            .input('status', sql.NVarChar, 'AWAITING_QUANTITY')
            .query(`
              UPDATE Orders
              SET tempProductId = @tempProductId,
                  status = @status
              WHERE id = @orderId
            `)

          await client.sendMessage(msg.from, 'كمية هذا المنتج؟')
          return
        }

        // ========== [REMOVEPRODUCT_x] ==========
        else if (upperText.startsWith('REMOVEPRODUCT_')) {
          const productId = parseInt(upperText.replace('REMOVEPRODUCT_', ''))

          const orderRow = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, 'لا يوجد طلب مفتوح.')
            return
          }
          const orderId = orderRow.recordset[0].id

          // احذف من OrderItems
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('productId', sql.Int, productId)
            .query(`
              DELETE FROM OrderItems
              WHERE orderId = @orderId
                AND productId = @productId
            `)

          await client.sendMessage(msg.from, 'تم حذف المنتج من السلة.')
          return
        }

        // ========== [VIEWCART] ==========
        else if (upperText === 'VIEWCART') {
          const orderRow = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, 'لا يوجد طلب مفتوح.')
            return
          }
          const orderId = orderRow.recordset[0].id

          // جلب العناصر
          const itemsRes = await pool.request()
            .input('orderId', sql.Int, orderId)
            .query(`
              SELECT oi.productId, oi.quantity, p.product_name, p.price
              FROM OrderItems oi
              JOIN Products p ON oi.productId = p.id
              WHERE oi.orderId = @orderId
            `)
          if (!itemsRes.recordset.length) {
            await client.sendMessage(msg.from, 'سلتك فارغة.')
            return
          }

          let total = 0
          let cartMsg = 'سلة المشتريات:\n===========================\n'
          for (const row of itemsRes.recordset) {
            const linePrice = (row.price || 0) * row.quantity
            total += linePrice
            cartMsg += `${row.quantity} x ${row.product_name} => ${linePrice} ج\n`
            cartMsg += `للحذف: wa.me/${phoneNumber}?text=REMOVEPRODUCT_${row.productId}\n\n`
          }
          cartMsg += `الإجمالي: ${total} ج\n===========================\n`
          cartMsg += `لتنفيذ الطلب:\n`
          cartMsg += `wa.me/${phoneNumber}?text=CARTCONFIRM\n`

          // حدِّث totalPrice
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('totalPrice', sql.Decimal(18,2), total)
            .query(`
              UPDATE Orders
              SET totalPrice = @totalPrice
              WHERE id = @orderId
            `)

          await client.sendMessage(msg.from, cartMsg)
          return
        }

        // ========== [CARTCONFIRM] ==========
        else if (upperText === 'CARTCONFIRM') {
          const orderRow = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, 'لا يوجد طلب مفتوح.')
            return
          }
          const orderId = orderRow.recordset[0].id

          // تغيير الحالة إلى AWAITING_ADDRESS
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('status', sql.NVarChar, 'AWAITING_ADDRESS')
            .query(`
              UPDATE Orders
              SET status = @status, tempProductId = NULL
              WHERE id = @orderId
            `)

          await client.sendMessage(msg.from, 'برجاء إدخال العنوان.')
          return
        }

        // ========== [غير ذلك: الكمية / العنوان / الموقع] ==========
        else {
          const orderRes = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id, status, tempProductId
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('AWAITING_QUANTITY','AWAITING_ADDRESS','AWAITING_LOCATION')
              ORDER BY id DESC
            `)
          if (!orderRes.recordset.length) {
            return
          }
          const { id: orderId, status, tempProductId } = orderRes.recordset[0]

          // ----- [AWAITING_QUANTITY] -----
          if (status === 'AWAITING_QUANTITY' && tempProductId) {
            const quantityNum = parseInt(upperText)
            if (isNaN(quantityNum) || quantityNum <= 0) {
              await client.sendMessage(msg.from, 'من فضلك أدخل عدد صحيح للكمية.')
              return
            }

            // أضف المنتج في OrderItems
            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('productId', sql.Int, tempProductId)
              .input('qty', sql.Int, quantityNum)
              .query(`
                INSERT INTO OrderItems (orderId, productId, quantity)
                VALUES (@orderId, @productId, @qty)
              `)

            // أعد الحالة إلى IN_CART
            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('status', sql.NVarChar, 'IN_CART')
              .query(`
                UPDATE Orders
                SET status = @status, tempProductId = NULL
                WHERE id = @orderId
              `)

            // أخبر المستخدم بنجاح الإضافة
            let addedMsg = `تم إضافة المنتج للسلة.\n===========================\n`
            addedMsg += `عرض السلة:\n`
            addedMsg += `wa.me/${phoneNumber}?text=VIEWCART\n\n`
            // إضافة منتجات أخرى:
            addedMsg += `لإضافة منتج آخر:\n`
            // يمكنك جعله SHOWCATEGORIES مثلاً
            addedMsg += `wa.me/${phoneNumber}?text=SHOWCATEGORIES\n`

            await client.sendMessage(msg.from, addedMsg)
            return
          }

          // ----- [AWAITING_ADDRESS] -----
          if (status === 'AWAITING_ADDRESS') {
            // اعتبر الرسالة = العنوان
            const address = msg.body.trim()
            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('address', sql.NVarChar, address)
              .input('status', sql.NVarChar, 'AWAITING_LOCATION')
              .query(`
                UPDATE Orders
                SET deliveryAddress = @address,
                    status = @status
                WHERE id = @orderId
              `)

            await client.sendMessage(msg.from, 'برجاء إرسال الموقع (Location).')
            return
          }

          // ----- [AWAITING_LOCATION] -----
          if (status === 'AWAITING_LOCATION' && msg.type === 'location' && msg.location) {
            const { latitude, longitude } = msg.location
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
              `)

            await client.sendMessage(msg.from, 'تم إرسال الطلب بنجاح!')
            return
          }
        }
      }

    } catch (error) {
      console.error('Error handling menuBot message:', error)
    }
  })

  // Initialize client
  client.initialize()
  whatsappClients[sessionId] = client
}
