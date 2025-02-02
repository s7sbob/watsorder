// src/controllers/whatsappClients.ts

import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js'
import { getConnection } from '../config/db'
import * as sql from 'mssql'
import { io } from '../server'
import { Request, Response } from 'express'

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

  // دالة بسيطة لعمل Bold للنص
  const bold = (text: string) => `*${text}*`

  client.on('message', async (msg: Message) => {
    try {
      const pool = await getConnection()
      // جلب إعدادات البوت لهذه الجلسة
      const sessionRow = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive, menuBotActive, phoneNumber,
                 greetingActive, greetingMessage
          FROM Sessions
          WHERE id = @sessionId
        `)

      if (!sessionRow.recordset.length) {
        console.log('Session not found in DB for message handling.')
        return
      }

      // إذا كانت الرسالة من جروب => تجاهلها
      if (msg.from.endsWith('@g.us')) {
        return
      }

      const {
        botActive,
        menuBotActive,
        phoneNumber,
        greetingActive,
        greetingMessage
      } = sessionRow.recordset[0]

      // إذا لا يوجد أي بوت مفعّل => لا تفعل شيئاً
      if (!botActive && !menuBotActive) return

      const text = msg.body.trim()
      const upperText = text.toUpperCase()
      const customerPhone = msg.from.split('@')[0]

      // =========== [Greeting Message Logic] ===========
      if (greetingActive && greetingMessage) {
        const isCommand =
          [
            'NEWORDER',
            'SHOWCATEGORIES',
            'VIEWCART',
            'CARTCONFIRM'
          ].some(cmd => upperText === cmd) ||
          upperText.startsWith('CATEGORY_') ||
          upperText.startsWith('PRODUCT_') ||
          upperText.startsWith('REMOVEPRODUCT_')

        if (!isCommand) {
          const existingOrder = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('custPhone', sql.NVarChar, customerPhone)
            .query(`
              SELECT TOP 1 id 
              FROM Orders 
              WHERE sessionId = @sessionId 
                AND customerPhoneNumber = @custPhone
                AND status IN (
                  'IN_CART',
                  'AWAITING_ADDRESS',
                  'AWAITING_LOCATION',
                  'AWAITING_QUANTITY',
                  'AWAITING_NAME'
                )
            `)

          if (existingOrder.recordset.length === 0) {
            // رسالة ترحيب بالـ Bold
            await client.sendMessage(msg.from, bold(greetingMessage))
            return
          }
        }
      }

      // =========== (1) البوت العادي (Keywords) ===========
      if (botActive) {
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
          await client.sendMessage(msg.from, bold(foundKeyword.replyText))
          return
        }
      }

      // =========== (2) المنيو بوت (Menu Bot) ===========
      if (menuBotActive) {
        // ========== [NEWORDER] ==========
        if (upperText === 'NEWORDER') {
          const openOrder = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .input('custPhone', sql.NVarChar, customerPhone)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND customerPhoneNumber = @custPhone
                AND status IN (
                  'IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME'
                )
              ORDER BY id DESC
            `)
          if (openOrder.recordset.length > 0) {
            await client.sendMessage(
              msg.from,
              bold('لديك طلب قائم بالفعل. برجاء إكماله أو تأكيده قبل إنشاء طلب جديد.')
            )
            return
          }

          // إنشاء طلب جديد
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

          // جلب الأصناف
          const categories = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT id, category_name
              FROM Categories
              WHERE sessionId = @sessionId
            `)
          if (!categories.recordset.length) {
            await client.sendMessage(msg.from, bold('لا توجد أصناف متاحة.'))
            return
          }

          // Example: عنوان بالـ Bold، والفاصل خارج النجوم
          // وأسم كل صنف بالـ Bold، والرابط بسطر منفصل.
          let catMsg = bold('أقسامنا المتاحة:') + '\n'
          catMsg += '===========================\n'
          for (const cat of categories.recordset) {
            catMsg += bold(cat.category_name) + '\n'
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`
          }

          await client.sendMessage(msg.from, catMsg)
          return
        }

        // ========== [SHOWCATEGORIES] ==========
        else if (upperText === 'SHOWCATEGORIES') {
          const openOrder = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
              ORDER BY id DESC
            `)
          if (!openOrder.recordset.length) {
            await client.sendMessage(msg.from, bold('لا يوجد طلب مفتوح. استخدم NEWORDER لفتح طلب جديد.'))
            return
          }

          const categories = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT id, category_name
              FROM Categories
              WHERE sessionId = @sessionId
            `)
          if (!categories.recordset.length) {
            await client.sendMessage(msg.from, bold('لا توجد أصناف متاحة.'))
            return
          }

          let catMsg = bold('اختر الصنف لإضافة منتجات:') + '\n'
          catMsg += '===========================\n'
          for (const cat of categories.recordset) {
            catMsg += bold(cat.category_name) + '\n'
            catMsg += `wa.me/${phoneNumber}?text=CATEGORY_${cat.id}\n\n`
          }
          await client.sendMessage(msg.from, catMsg)
          return
        }

        // ========== [CATEGORY_x] ==========
        else if (upperText.startsWith('CATEGORY_')) {
          const catId = parseInt(upperText.replace('CATEGORY_', ''))
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
            await client.sendMessage(msg.from, bold('لا توجد منتجات في هذا التصنيف.'))
            return
          }

          let prodMsg = bold('برجاء اختيار المنتج:') + '\n'
          prodMsg += '===========================\n'
          for (const p of productsData.recordset) {
            prodMsg += bold(`${p.product_name} (${p.price}ج)`) + '\n'
            prodMsg += `wa.me/${phoneNumber}?text=PRODUCT_${p.id}\n\n`
          }
          await client.sendMessage(msg.from, prodMsg)
          return
        }

        // ========== [PRODUCT_x] ==========
        else if (upperText.startsWith('PRODUCT_')) {
          const productId = parseInt(upperText.replace('PRODUCT_', ''))
          const orderRow = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id, status
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, bold('لا يوجد طلب مفتوح. استخدم NEWORDER أولاً.'))
            return
          }
          const orderId = orderRow.recordset[0].id

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

          await client.sendMessage(msg.from, bold('كمية هذا المنتج؟'))
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
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, bold('لا يوجد طلب مفتوح.'))
            return
          }
          const orderId = orderRow.recordset[0].id

          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('productId', sql.Int, productId)
            .query(`
              DELETE FROM OrderItems
              WHERE orderId = @orderId
                AND productId = @productId
            `)

          await client.sendMessage(msg.from, bold('تم حذف المنتج من السلة.'))
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
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, bold('لا يوجد طلب مفتوح.'))
            return
          }
          const orderId = orderRow.recordset[0].id

          const itemsRes = await pool.request()
            .input('orderId', sql.Int, orderId)
            .query(`
              SELECT oi.productId, oi.quantity, p.product_name, p.price
              FROM OrderItems oi
              JOIN Products p ON oi.productId = p.id
              WHERE oi.orderId = @orderId
            `)
          if (!itemsRes.recordset.length) {
            await client.sendMessage(msg.from, bold('سلتك فارغة.'))
            return
          }

          let total = 0
          let cartMsg = bold('سلة المشتريات:') + '\n'
          cartMsg += '===========================\n'
          for (const row of itemsRes.recordset) {
            const linePrice = (row.price || 0) * row.quantity
            total += linePrice
            cartMsg += bold(`${row.quantity} x ${row.product_name} => ${linePrice} ج`) + '\n'
            cartMsg += `للحذف: wa.me/${phoneNumber}?text=REMOVEPRODUCT_${row.productId}\n\n`
          }
          cartMsg += bold(`الإجمالي: ${total} ج`) +'\n'
          cartMsg += '===========================\n'
          cartMsg += bold('لتنفيذ الطلب:')+'\n'
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
                AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
              ORDER BY id DESC
            `)
          if (!orderRow.recordset.length) {
            await client.sendMessage(msg.from, bold('لا يوجد طلب مفتوح.'))
            return
          }
          const orderId = orderRow.recordset[0].id

          // الوضع الجديد => AWAITING_NAME
          await pool.request()
            .input('orderId', sql.Int, orderId)
            .input('status', sql.NVarChar, 'AWAITING_NAME')
            .query(`
              UPDATE Orders
              SET status = @status, tempProductId = NULL
              WHERE id = @orderId
            `)

          await client.sendMessage(msg.from, bold('من فضلك اكتب اسمك ثلاثي أو الاسم الذى سيُسجل بالطلب.'))
          return
        }

        // ========== [حالات أخرى: الكمية/الاسم/العنوان/الموقع] ==========
        else {
          const orderRes = await pool.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`
              SELECT TOP 1 id, status, tempProductId
              FROM Orders
              WHERE sessionId = @sessionId
                AND status IN (
                  'AWAITING_QUANTITY',
                  'AWAITING_NAME',
                  'AWAITING_ADDRESS',
                  'AWAITING_LOCATION'
                )
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
              await client.sendMessage(msg.from, bold('من فضلك أدخل رقم صحيح للكمية.'))
              return
            }

            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('productId', sql.Int, tempProductId)
              .input('qty', sql.Int, quantityNum)
              .query(`
                INSERT INTO OrderItems (orderId, productId, quantity)
                VALUES (@orderId, @productId, @qty)
              `)

            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('status', sql.NVarChar, 'IN_CART')
              .query(`
                UPDATE Orders
                SET status = @status, tempProductId = NULL
                WHERE id = @orderId
              `)

            let addedMsg = bold('تم إضافة المنتج للسلة.') + '\n'
            addedMsg += '===========================\n'
            addedMsg += bold('عرض السلة:')+'\n'
            addedMsg += `wa.me/${phoneNumber}?text=VIEWCART\n\n`
            addedMsg += bold('لإضافة منتج آخر:') + '\n'
            addedMsg += `wa.me/${phoneNumber}?text=SHOWCATEGORIES` + '\n'
            await client.sendMessage(msg.from, addedMsg)
            return
          }

          // ----- [AWAITING_NAME] -----
          if (status === 'AWAITING_NAME') {
            const customerName = msg.body.trim()
            await pool.request()
              .input('orderId', sql.Int, orderId)
              .input('customerName', sql.NVarChar, customerName)
              .input('status', sql.NVarChar, 'AWAITING_ADDRESS')
              .query(`
                UPDATE Orders
                SET customerName = @customerName,
                    status = @status
                WHERE id = @orderId
              `)

            await client.sendMessage(msg.from, bold('برجاء إدخال العنوان.'))
            return
          }

          // ----- [AWAITING_ADDRESS] -----
          if (status === 'AWAITING_ADDRESS') {
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

            await client.sendMessage(msg.from, bold('برجاء إرسال الموقع (Location).'))
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

            await client.sendMessage(msg.from, bold('تم إرسال الطلب بنجاح!'))

            io.emit('newOrder', { orderId: orderId })
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

/**
 * دالة البث الأساسية
 */
export const broadcastMessage = async (req: Request, res: Response, sessionId: number) => {
  const { phoneNumbers, message, randomNumbers, media } = req.body

  if (!phoneNumbers?.length || !randomNumbers?.length) {
    return res.status(400).json({ message: 'Invalid input data' })
  }

  try {
    const pool = await getConnection()
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, status
        FROM Sessions
        WHERE id = @sessionId
      `)

    if (!sessionResult.recordset.length) {
      return res.status(404).json({ message: 'No session found with the provided ID' })
    }
    if (sessionResult.recordset[0].status !== 'Connected') {
      return res.status(400).json({ message: 'Session is not in Connected status.' })
    }

    const client = whatsappClients[sessionId]
    if (!client) {
      return res.status(404).json({ message: 'WhatsApp client not found for this session.' })
    }

    // بدء البث
    for (const phoneNumber of phoneNumbers) {
      const randomDelay = randomNumbers[Math.floor(Math.random() * randomNumbers.length)]

      if (media && Array.isArray(media) && media.length > 0) {
        for (const singleMedia of media) {
          const mediaMsg = new MessageMedia(singleMedia.mimetype, singleMedia.base64, singleMedia.filename)
          // نجعل caption = "** **" فارغ بالـ Bold إن شئت؛ أو اتركه فراغ بدون bold
          await sendMessageWithDelay(client, phoneNumber, '* *', randomDelay, mediaMsg)
        }
        if (message && message.trim()) {
          // إذا احتجت روابط، ضَعها بسطر منفصل بلا نجوم
          await sendMessageWithDelay(client, phoneNumber, `*${message}*`, randomDelay)
        }
      } else {
        await sendMessageWithDelay(client, phoneNumber, `*${message}*`, randomDelay)
      }
    }

    res.status(200).json({ message: 'Broadcast started successfully' })
  } catch (error) {
    console.error('Broadcast error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// دالة مساعدة لإرسال رسالة (نصية/ميديا) بعد تأخير
const sendMessageWithDelay = async (
  client: Client,
  phoneNumber: string,
  textMessage: string,
  delay: number,
  media?: MessageMedia
) => {
  return new Promise<void>(resolve => {
    setTimeout(async () => {
      try {
        const chatId = `${phoneNumber}@c.us`
        if (media) {
          await client.sendMessage(chatId, media, { caption: textMessage || '' })
        } else {
          await client.sendMessage(chatId, textMessage)
        }
        console.log(`Broadcast sent to ${phoneNumber}`)
        resolve()
      } catch (error) {
        console.error(`Broadcast failed for ${phoneNumber}:`, error)
        resolve()
      }
    }, delay * 1000)
  })
}



