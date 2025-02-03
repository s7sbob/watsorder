// src/controllers/orderController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import * as sql from 'mssql'
import { whatsappClients } from './whatsappClients'


// ===================================================================
// دوال مساعدة
// ===================================================================

// إذا أردت السماح فقط للـ admin بتأكيد الطلب
// أو السماح للمالك (الجلسة) بتأكيده. اختر ما يناسبك.
// هنا نفترض: Admin فقط من يقوم بـ confirmOrderByRestaurant
const isAdminUser = (req: Request) => {
  return req.user && req.user.subscriptionType === 'admin'
}

// هذه الدالة تساعدنا في التحقق من ملكية الطلب. 
// سنجلب الـ sessionOwner من جدول Sessions.
async function checkOrderOwnership(pool: sql.ConnectionPool, orderId: number, currentUser: any) {
  // 1) ابحث عن ال order
  const orderRes = await pool.request()
    .input('orderId', sql.Int, orderId)
    .query(`
      SELECT o.id, s.userId AS sessionOwner
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.id = @orderId
    `)

  if (!orderRes.recordset.length) {
    throw new Error('OrderNotFound')
  }

  const { sessionOwner } = orderRes.recordset[0]
  
  // 2) إن لم يكن Admin وتختلف الملكية => منع
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== sessionOwner) {
    throw new Error('Forbidden')
  }

  return orderRes.recordset[0] // نعيد بيانات مفيدة إن أردنا
}

// ===================================================================
// الدوال الرئيسية
// ===================================================================

export const getConfirmedOrdersForUser = async (req: Request, res: Response) => {
  try {
    // استخراج userId من التوكن
    const userId = req.user && typeof req.user !== 'string' ? req.user.id : null
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized.' })
    }

    const pool = await getConnection()

    // جلب جلسات هذا المستخدم
    // (لو أردت admin يرى جميع الطلبات المؤكدة، يمكنك تعديل الشرط لو كان admin => ignore userId.)
    // حالياً: حتى admin لا يرى جلسات الآخرين (حسب كلامك).
    const sessionsResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id
        FROM Sessions
        WHERE userId = @userId
      `)
    if (!sessionsResult.recordset.length) {
      return res.status(200).json([]) // لا توجد جلسات
    }

    const sessionIds = sessionsResult.recordset.map((row: any) => row.id) as number[]
    if (!sessionIds.length) {
      return res.status(200).json([])
    }

    // جلب الطلبات المؤكدة لتلك الجلسات
    const inClause = sessionIds.join(',')
    const ordersQuery = `
      SELECT o.*,
            s.phoneNumber as sessionPhone
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.sessionId IN (${inClause})
        AND o.status = 'CONFIRMED'
      ORDER BY o.createdAt DESC
    `

    const ordersResult = await pool.request().query(ordersQuery)

    // جلب عناصر الطلبات
    const orderIds = ordersResult.recordset.map((r: any) => r.id)
    if (!orderIds.length) {
      return res.status(200).json([])
    }

    const inOrders = orderIds.join(',')
    const itemsQuery = `
      SELECT oi.orderId, oi.quantity, p.product_name, p.price
      FROM OrderItems oi
      JOIN Products p ON p.id = oi.productId
      WHERE oi.orderId IN (${inOrders})
    `
    const itemsResult = await pool.request().query(itemsQuery)

    // تنظيم بيانات الطلبات مع عناصرها
    const ordersData = ordersResult.recordset.map((ord: any) => {
      const orderItems = itemsResult.recordset.filter((it: any) => it.orderId === ord.id)
      return {
        id: ord.id,
        sessionId: ord.sessionId,
        customerPhone: ord.customerPhoneNumber,
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

export const confirmOrderByRestaurant = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId, 10)
    if (!orderId) {
      return res.status(400).json({ message: 'Invalid order ID.' })
    }

    // نفترض أنه لا يسمح إلا للـadmin بفعل هذا:
    if (!req.user || req.user.subscriptionType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin only can confirm orders.' })
    }

    const { prepTime, deliveryFee, taxValue } = req.body
    const pool = await getConnection()

    // جلب الطلب من قاعدة البيانات
    // (لا حاجة لفحص ملكية لأننا قلنا admin فقط, 
    //  لكن إن أردت السماح أيضاً للمالك, يمكنك استخدام checkOrderOwnership)
    const orderRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT o.*, s.phoneNumber AS sessionPhone
        FROM Orders o
        JOIN Sessions s ON s.id = o.sessionId
        WHERE o.id = @orderId
      `)

    if (!orderRes.recordset.length) {
      return res.status(404).json({ message: 'Order not found.' })
    }
    const orderRow = orderRes.recordset[0]

    // تحديث معلومات الطلب
    await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('prepTime', sql.Int, prepTime || null)
      .input('deliveryFee', sql.Decimal(18,2), deliveryFee || 0)
      .input('taxValue', sql.Decimal(18,2), taxValue || 0)
      .query(`
        UPDATE Orders
        SET prepTime = @prepTime,
            deliveryFee = @deliveryFee,
            taxValue = @taxValue,
            finalConfirmed = 1
        WHERE id = @orderId
      `)

    // جلب عناصر الطلب لتفصيل الرسالة
    const itemsRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT oi.quantity, p.product_name, p.price
        FROM OrderItems oi
        JOIN Products p ON p.id = oi.productId
        WHERE oi.orderId = @orderId
      `)

    let itemsMessage = ''
    let total = 0
    for (const it of itemsRes.recordset) {
      const linePrice = (it.price || 0) * it.quantity
      total += linePrice
      itemsMessage += `(${it.quantity}) ${it.product_name}   = ${linePrice}\n`
    }

    const finalTotal = total + (deliveryFee || 0) + (taxValue || 0)

    const invoiceNumber = orderRow.id
    const now = new Date().toLocaleString('ar-EG')

    const msgText = `
تم إستلام الطلب من: ${orderRow.customerName || 'عميل'}
وهو الآن فى مرحلة التجهيز
الوقت المتوقع للإنتهاء: ${prepTime || 30} دقيقة
رقم الفاتورة : ${invoiceNumber}
التاريخ : ${now}
=======================
${itemsMessage}
=======================
قيمة التوصيل: ${deliveryFee || 0}
=======================
الإجمالى : ${finalTotal}
`

    // إرسال الرسالة عبر واتساب
    const client = whatsappClients[orderRow.sessionId]
    if (!client) {
      return res.status(200).json({
        message: 'Order confirmed, but WhatsApp client not found to send message.'
      })
    }

    const finalRecipient = orderRow.customerPhoneNumber + '@c.us'
    await client.sendMessage(finalRecipient, msgText)

    return res.status(200).json({ message: 'Order confirmed and notification sent to customer.' })
  } catch (error) {
    console.error('Error confirming order by restaurant:', error)
    return res.status(500).json({ message: 'Error confirming order by restaurant.' })
  }
}


export const getOrderDetails = async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10)
  if (!orderId) return res.status(400).json({ message: 'Invalid order ID.' })

  try {
    const pool = await getConnection()
    const orderRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT o.*, s.phoneNumber AS sessionPhone, s.userId AS sessionOwner
        FROM Orders o
        JOIN Sessions s ON s.id = o.sessionId
        WHERE o.id = @orderId
      `)
    if (!orderRes.recordset.length) {
      return res.status(404).json({ message: 'Order not found.' })
    }
    const order = orderRes.recordset[0]

    // تحقق الملكية:
    if (!req.user) {
      return res.status(401).json({ message: 'No user payload found.' })
    }
    if (req.user.subscriptionType !== 'admin' && req.user.id !== order.sessionOwner) {
      return res.status(403).json({ message: 'Forbidden: You do not own this order.' })
    }

    // بعد التحقق:
    const itemsRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT oi.quantity, p.product_name, p.price
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
