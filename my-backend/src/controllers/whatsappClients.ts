// whatsappClients.ts
import { Client, LocalAuth } from 'whatsapp-web.js'
import { getConnection } from '../config/db'
import * as sql from 'mssql'
import { io } from '../server' // استيراد io من ملف الخادم

interface WhatsAppClientMap {
  [sessionId: number]: Client
}

export const whatsappClients: WhatsAppClientMap = {}

/**
 * إنشاء عميل واتساب جديد لجلسة معينة
 */
export const createWhatsAppClientForSession = async (sessionId: number, sessionIdentifier: string) => {
  // تنقية clientId لإزالة الأحرف غير المسموح بها
  const sanitizedClientId = sessionIdentifier.replace(/[^A-Za-z0-9_-]/g, '_')

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sanitizedClientId }),
    puppeteer: { headless: true }
  })

  client.on('qr', async qr => {
    console.log(`QR Code for session ${sessionId}:`, qr)
    const pool = await getConnection()
    await pool
      .request()
      .input('sessionId', sql.Int, sessionId)
      .input('qr', sql.NVarChar, qr)
      .query(`UPDATE Sessions SET status = 'Waiting for QR Code', qrCode = @qr WHERE id = @sessionId`)

    // بث تحديث حالة الجلسة مع رمز QR عبر Socket.IO
    io.emit('sessionUpdate', { sessionId, status: 'Waiting for QR Code', qrCode: qr })
  })

  client.on('authenticated', async () => {
    console.log(`Session ${sessionId} authenticated.`)
    const pool = await getConnection()
    await pool
      .request()
      .input('sessionId', sql.Int, sessionId)
      .query(`UPDATE Sessions SET status = 'Connected' WHERE id = @sessionId`)

    // بث تحديث حالة الجلسة Connected عبر Socket.IO
    io.emit('sessionUpdate', { sessionId, status: 'Connected' })
  })

  client.on('ready', async () => {
    console.log(`Session ${sessionId} is ready and connected.`)

    // الخطوات المطلوبة لجلب رقم الهاتف وتخزينه في جدول Sessions
    try {
      // 1. الحصول على الـ WhatsApp ID الكامل مثل "20123456789@c.us"
      const fullWhatsAppID = client.info?.wid?._serialized
      if (!fullWhatsAppID) {
        console.log('Could not retrieve WhatsApp ID.')
      } else {
        // 2. تنقية الرقم (إزالة "@c.us")
        const purePhoneNumber = fullWhatsAppID.replace('@c.us', '')

        // 3. تخزين الرقم في قاعدة البيانات
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
      }
    } catch (error) {
      console.error('Error storing phone number in DB:', error)
    }
  })

  client.on('disconnected', reason => {
    console.log(`Session ${sessionId} was logged out`, reason)
    // يمكن إضافة بث تحديث حالة هنا إذا لزم الأمر
  })

  /**
   * استقبال الرسائل
   * إذا كان الـ botActive = true في قاعدة البيانات، يتم البحث عن الـ keyword في جدول الكلمات والرد بالـ reply
   */
  client.on('message', async msg => {
    try {
      const pool = await getConnection()
      // جلب حالة الـ botActive + اسم جدول الـ keywords من جدول Sessions
      const sessionResult = await pool
        .request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive, keywords
          FROM Sessions
          WHERE id = @sessionId
        `)

      if (!sessionResult.recordset.length) {
        console.log('Session not found in DB for message handling.')
        return
      }

      const { botActive, keywords } = sessionResult.recordset[0]

      // إذا كان الـ Bot غير مفعّل، لا يقوم بالرد
      if (!botActive) {
        return
      }

      // إذا كان الـ Bot مفعّل: ابحث عن الـ keyword في جدول الـ keywords
      // تأكد أن حقل "keywords" في Sessions يتضمن الاسم الكامل للجدول (مثلاً "Keywords_123_3")
      const keywordsTableName = `[dbo].[${keywords}]`

      const keywordsResult = await pool.request().query(`
        SELECT keyword, reply
        FROM ${keywordsTableName}
      `)

      // البحث عن keyword يطابق نص الرسالة
      const receivedText = msg.body.toLowerCase().trim()
      const foundKeywordRow = keywordsResult.recordset.find((row: any) => {
        return row.keyword?.toLowerCase() === receivedText
      })

      if (foundKeywordRow) {
        // الرد على الرسالة بالرد المخصص
        await client.sendMessage(msg.from, foundKeywordRow.reply || 'No reply found.')
      }
    } catch (error) {
      console.error('Error handling incoming message:', error)
    }
  })

  client.initialize()
  whatsappClients[sessionId] = client
}
