// src/controllers/whatsappClients.ts
import { Client, LocalAuth } from 'whatsapp-web.js'
import { getConnection } from '../config/db'
import * as sql from 'mssql'
import { io } from '../server'

interface WhatsAppClientMap {
  [sessionId: number]: Client
}

export const whatsappClients: WhatsAppClientMap = {}

/**
 * إنشاء عميل واتساب جديد لجلسة معيّنة
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

    // جلب رقم الهاتف وتخزينه
    try {
      const fullWhatsAppID = client.info?.wid?._serialized
      if (!fullWhatsAppID) {
        console.log('Could not retrieve WhatsApp ID.')
      } else {
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
      }
    } catch (error) {
      console.error('Error storing phone number in DB:', error)
    }
  })

  client.on('disconnected', reason => {
    console.log(`Session ${sessionId} was logged out`, reason)
    // إرسال تحديثات إن احتجت
  })

  /**
   * استقبال الرسائل
   * 1) نتأكد أن botActive = true
   * 2) نبحث في جدول Keywords عن row يطابق الرسالة (keyword)
   * 3) نجد replay_id الخاص به ونذهب لجدول Replays لجلب replyText
   * 4) نرسل الرد
   */
  client.on('message', async msg => {
    try {
      const pool = await getConnection()
      // جلب حالة الـ botActive من Sessions
      const sessionResult = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT botActive
          FROM Sessions
          WHERE id = @sessionId
        `)

      if (!sessionResult.recordset.length) {
        console.log('Session not found in DB for message handling.')
        return
      }

      const { botActive } = sessionResult.recordset[0]
      if (!botActive) return // إذا كان البوت غير مفعَّل، لا نرد

      // (1) قراءة النص المستلم
      const receivedText = msg.body.toLowerCase().trim()

      // (2) ابحث في جدول Keywords
      // ملاحظة: نحن نفترض وجود حقل sessionId في جدول Keywords
      const keywordResult = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .input('receivedText', sql.NVarChar, receivedText)
        .query(`
          SELECT TOP 1 k.replay_id
          FROM Keywords k
          WHERE k.sessionId = @sessionId
            AND k.keyword = @receivedText
        `)

      if (!keywordResult.recordset.length) {
        // لا يوجد keyword مطابق
        return
      }

      const replayId = keywordResult.recordset[0].replay_id

      // (3) ابحث عن replyText من جدول Replays
      const replayResult = await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`
          SELECT replyText
          FROM Replays
          WHERE id = @replayId
        `)

      if (!replayResult.recordset.length) {
        // لا يوجد رد مسجل
        return
      }

      const { replyText } = replayResult.recordset[0]

      // (4) أرسل الرد للمستخدم
      await client.sendMessage(msg.from, replyText)
    } catch (error) {
      console.error('Error handling incoming message:', error)
    }
  })
  

  // أخيرًا: initialize client
  client.initialize()
  whatsappClients[sessionId] = client
}
