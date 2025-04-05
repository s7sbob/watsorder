// src/controllers/orderController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import * as sql from 'mssql'
import { whatsappClients } from './whatsappClients'

/**
 * جلب الطلبات المؤكدة الخاصة بالمستخدم
 */
export const getConfirmedOrdersForUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user && typeof req.user !== 'string' ? req.user.id : null
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized.' })
    }

    const pool = await getConnection()

    // جلب الجلسات الخاصة بالمستخدم
    const sessionsResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id
        FROM Sessions
        WHERE userId = @userId
      `)
    if (!sessionsResult.recordset.length) {
      return res.status(200).json([])
    }

    const sessionIds = sessionsResult.recordset.map((row: any) => row.id) as number[]
    if (!sessionIds.length) {
      return res.status(200).json([])
    }

    const inClause = sessionIds.join(',')
    const ordersQuery = `
      SELECT 
        o.id,
        o.sessionId,
        o.customerPhoneNumber AS customerPhone,
        o.customerName,
        o.deliveryAddress,
        o.totalPrice,
        o.prepTime,
        o.deliveryFee,
        o.serviceFee,
        o.taxValue,
        o.finalConfirmed,
        o.createdAt,
        s.phoneNumber AS sessionPhone
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.sessionId IN (${inClause})
        AND o.status = 'CONFIRMED'
      ORDER BY o.createdAt DESC
    `

    const ordersResult = await pool.request().query(ordersQuery)

    const orderIds = ordersResult.recordset.map((r: any) => r.id)
    if (!orderIds.length) {
      return res.status(200).json([])
    }

    const inOrders = orderIds.join(',')
    const itemsQuery = `
      SELECT 
        oi.orderId, 
        oi.quantity, 
        p.product_name, 
        p.price
      FROM OrderItems oi
      JOIN Products p ON p.id = oi.productId
      WHERE oi.orderId IN (${inOrders})
    `
    const itemsResult = await pool.request().query(itemsQuery)

    const ordersData = ordersResult.recordset.map((ord: any) => {
      const orderItems = itemsResult.recordset.filter((it: any) => it.orderId === ord.id)
      return {
        id: ord.id,
        sessionId: ord.sessionId,
        customerPhone: ord.customerPhone, // alias من customerPhoneNumber
        customerName: ord.customerName,
        deliveryAddress: ord.deliveryAddress,
        totalPrice: ord.totalPrice,
        prepTime: ord.prepTime,
        deliveryFee: ord.deliveryFee,
        serviceFee: ord.serviceFee,
        taxValue: ord.taxValue,
        finalConfirmed: ord.finalConfirmed,
        createdAt: ord.createdAt,
        items: orderItems.map((it: any) => ({
          productName: it.product_name,
          quantity: it.quantity,
          price: it.price
        }))
      }
    })

    return res.status(200).json(ordersData)
  } catch (error) {
    console.error('Error fetching confirmed orders:', error)
    return res.status(500).json({ message: 'Error fetching confirmed orders.' })
  }
}

/**
 * تأكيد الطلب من قِبَل المالك (صاحب الجلسة) فقط
 */
export const confirmOrderByRestaurant = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId, 10)
    if (!orderId) {
      return res.status(400).json({ message: 'Invalid order ID.' })
    }

    if (!req.user) {
      return res.status(401).json({ message: 'No user payload found.' })
    }

    const { prepTime, deliveryFee, taxValue } = req.body
    const pool = await getConnection()

    // جلب بيانات الطلب مع بيانات الجلسة بشكل صريح مع عمل alias للأعمدة
    const orderRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          o.id,
          o.sessionId,
          o.customerPhoneNumber AS customerPhone,
          o.customerName,
          o.deliveryAddress,
          o.totalPrice,
          o.prepTime,
          o.deliveryFee,
          o.serviceFee,
          o.taxValue,
          o.finalConfirmed,
          o.createdAt,
          s.phoneNumber AS sessionPhone,
          s.userId AS sessionOwner,
          s.id AS sessionIdFromSession
        FROM Orders o
        JOIN Sessions s ON s.id = o.sessionId
        WHERE o.id = @orderId
      `)

    if (!orderRes.recordset.length) {
      return res.status(404).json({ message: 'Order not found.' })
    }
    const orderRow = orderRes.recordset[0]

    // السماح للمالك فقط (بدلاً من admin)
    if (req.user.id !== orderRow.sessionOwner) {
      return res.status(403).json({
        message: 'Forbidden: Only the session owner can confirm this order.'
      })
    }

    // تحديث معلومات الطلب لتأكيده
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('prepTime', sql.Int, prepTime || null)
      .input('deliveryFee', sql.Decimal(18, 2), deliveryFee || 0)
      .input('taxValue', sql.Decimal(18, 2), taxValue || 0)
      .query(`
        UPDATE Orders
        SET prepTime = @prepTime,
            deliveryFee = @deliveryFee,
            taxValue = @taxValue,
            finalConfirmed = 1
        WHERE id = @orderId
      `)

    // جلب عناصر الطلب لحساب الإجمالي وإنشاء نص الرسالة
    const itemsRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          oi.quantity, 
          p.product_name, 
          p.price
        FROM OrderItems oi
        JOIN Products p ON p.id = oi.productId
        WHERE oi.orderId = @orderId
      `)

    let itemsMessage = ''
    let total = 0
    for (const it of itemsRes.recordset) {
      const linePrice = (it.price || 0) * it.quantity
      total += linePrice
      itemsMessage += `(${it.quantity}) ${it.product_name} = ${linePrice}\n`
    }

    const finalTotal = total + (deliveryFee || 0) + (taxValue || 0)
    const invoiceNumber = orderRow.id
    const now = new Date().toLocaleString('ar-EG')

    const msgText = 
      `*تم إستلام الطلب*\n` +
      `*وهو الآن فى مرحلة التجهيز*\n` +
      `*الوقت المتوقع للإنتهاء:* ${prepTime || 30} دقيقة\n` +
      `*رقم الفاتورة:* ${invoiceNumber}\n` +
      `*التاريخ:* ${now}\n` +
      `=======================\n` +
      `${itemsMessage}` +
      `=======================\n` +
      `*قيمة التوصيل:* ${deliveryFee || 0}\n` +
      `=======================\n` +
      `*الإجمالى:* ${finalTotal}\n`

    // استخدام sessionId من بيانات الجلسة (العمود sessionIdFromSession) للبحث عن عميل الواتساب
    const client = whatsappClients[orderRow.sessionIdFromSession]
    if (!client) {
      console.error('WhatsApp client not found for sessionId:', orderRow.sessionIdFromSession)
      return res.status(200).json({
        message: 'Order confirmed, but WhatsApp client not found to send message.'
      })
    }

    // إرسال رسالة واتساب باستخدام رقم العميل (customerPhone) مع إضافة اللاحقة '@c.us'
    const finalRecipient = orderRow.customerPhone + '@c.us'
    await client.sendMessage(finalRecipient, msgText)

    return res.status(200).json({ message: 'Order confirmed and notification sent to customer.' })
  } catch (error) {
    console.error('Error confirming order by restaurant:', error)
    return res.status(500).json({ message: 'Error confirming order by restaurant.' })
  }
}

/**
 * جلب تفاصيل الطلب
 */
export const getOrderDetails = async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10)
  if (!orderId) return res.status(400).json({ message: 'Invalid order ID.' })

  try {
    const pool = await getConnection()
    const orderRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          o.id,
          o.sessionId,
          o.customerPhoneNumber AS customerPhone,
          o.customerName,
          o.deliveryAddress,
          o.totalPrice,
          o.prepTime,
          o.deliveryFee,
          o.serviceFee,
          o.taxValue,
          o.finalConfirmed,
          o.createdAt,
          s.phoneNumber AS sessionPhone,
          s.userId AS sessionOwner
        FROM Orders o
        JOIN Sessions s ON s.id = o.sessionId
        WHERE o.id = @orderId
      `)
    if (!orderRes.recordset.length) {
      return res.status(404).json({ message: 'Order not found.' })
    }
    const order = orderRes.recordset[0]

    if (!req.user) {
      return res.status(401).json({ message: 'No user payload found.' })
    }
    if (req.user.subscriptionType !== 'admin' && req.user.id !== order.sessionOwner) {
      return res.status(403).json({ message: 'Forbidden: You do not own this order.' })
    }

    const itemsRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          oi.quantity, 
          p.product_name, 
          p.price
        FROM OrderItems oi
        JOIN Products p ON p.id = oi.productId
        WHERE oi.orderId = @orderId
      `)

    const items = itemsRes.recordset.map((it: any) => ({
      productName: it.product_name,
      quantity: it.quantity,
      price: it.price
    }))

    const orderDetails = {
      ...order,
      items
    }

    return res.status(200).json(orderDetails)
  } catch (error) {
    console.error('Error fetching order details:', error)
    return res.status(500).json({ message: 'Error fetching order details.' })
  }
}
