// src/controllers/orderListingController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import * as sql from 'mssql'

/**
 * دالة لجلب الطلبات الجديدة (غير المؤكدة) بكل التفاصيل
 * شرط: o.status != 'CONFIRMED' (عدّل إن كنت تستخدم منطقًا آخر)
 */
export const getNewOrdersForUser = async (req: Request, res: Response) => {
  try {
    // استخراج userId من التوكن
    const userId = req.user && typeof req.user !== 'string' ? req.user.id : null
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized.' })
    }

    // جلب الجلسات المملوكة لهذا المستخدم
    const pool = await getConnection()
    const sessionsResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id
        FROM Sessions
        WHERE userId = @userId
      `)

    if (!sessionsResult.recordset.length) {
      // لا توجد جلسات => لا توجد طلبات
      return res.status(200).json([])
    }

    const sessionIds = sessionsResult.recordset.map((row: any) => row.id) as number[]
    if (!sessionIds.length) {
      return res.status(200).json([])
    }

    // حول المصفوفة إلى سلسلة مفصولة بفواصل لاستخدامها في استعلام IN (...)
    const inClause = sessionIds.join(',')

    // 1) جلب الطلبات نفسها (Orders)
    // اخترنا شرطي: الحالة != 'CONFIRMED' لجلب الطلبات الجديدة
    const ordersQuery = `
      SELECT
        o.*,
        s.phoneNumber AS sessionPhone
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.sessionId IN (${inClause})
        AND o.status != 'CONFIRMED'
      ORDER BY o.createdAt DESC
    `
    const ordersResult = await pool.request().query(ordersQuery)

    // لو لم نجد طلبات، نعيد مصفوفة فارغة
    if (!ordersResult.recordset.length) {
      return res.status(200).json([])
    }

    // 2) جلب عناصر الطلب (OrderItems) + ربط مع Products و Categories
    const orderIds = ordersResult.recordset.map((ord: any) => ord.id)
    const inOrders = orderIds.join(',')

    const itemsQuery = `
      SELECT 
        oi.orderId,
        oi.quantity,
        p.product_name,
        p.price,
        p.product_internal_code,
        c.id AS category_id,
        c.category_name,
        c.category_internal_code
      FROM OrderItems oi
      JOIN Products p ON p.id = oi.productId
      JOIN Categories c ON c.id = p.category_id
      WHERE oi.orderId IN (${inOrders})
    `
    const itemsResult = await pool.request().query(itemsQuery)

    // 3) بناء النتيجة النهائية: ربط كل Order بعناصره
    const newOrdersData = ordersResult.recordset.map((ord: any) => {
      const orderItems = itemsResult.recordset.filter((it: any) => it.orderId === ord.id)

      return {
        id: ord.id,
        sessionId: ord.sessionId,
        customerPhone: ord.customerPhoneNumber,
        customerName: ord.customerName,
        status: ord.status,
        deliveryAddress: ord.deliveryAddress,
        totalPrice: ord.totalPrice,
        createdAt: ord.createdAt,
        // بإمكانك إضافة حقول أخرى من جدول Orders
        items: orderItems.map((it: any) => ({
          productName: it.product_name,
          productInternalCode: it.product_internal_code,
          categoryId: it.category_id,
          categoryName: it.category_name,
          categoryInternalCode: it.category_internal_code,
          quantity: it.quantity,
          price: it.price
        }))
      }
    })

    return res.status(200).json(newOrdersData)
  } catch (error) {
    console.error('Error fetching new orders:', error)
    return res.status(500).json({ message: 'Error fetching new orders.' })
  }
}

/**
 * دالة لجلب جميع الطلبات (all orders) الخاصة بالمستخدم (بغض النظر عن الحالة)
 */
export const getAllOrdersForUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user && typeof req.user !== 'string' ? req.user.id : null
    if (!userId) {
      return res.status(401).json({ message: 'User not authorized.' })
    }

    const pool = await getConnection()
    // جلب جلسات المستخدم
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

    const sessionIds = sessionsResult.recordset.map((row: any) => row.id)
    if (!sessionIds.length) {
      return res.status(200).json([])
    }

    const inClause = sessionIds.join(',')

    // جلب كافة الطلبات دون قيد الحالة
    const ordersQuery = `
      SELECT
        o.*,
        s.phoneNumber AS sessionPhone
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.sessionId IN (${inClause})
      ORDER BY o.createdAt DESC
    `
    const ordersResult = await pool.request().query(ordersQuery)
    if (!ordersResult.recordset.length) {
      return res.status(200).json([])
    }

    // الآن جلب عناصر الطلب
    const orderIds = ordersResult.recordset.map((ord: any) => ord.id)
    const inOrders = orderIds.join(',')

    const itemsQuery = `
      SELECT 
        oi.orderId,
        oi.quantity,
        p.product_name,
        p.price,
        p.product_internal_code,
        c.id AS category_id,
        c.category_name,
        c.category_internal_code
      FROM OrderItems oi
      JOIN Products p ON p.id = oi.productId
      JOIN Categories c ON c.id = p.category_id
      WHERE oi.orderId IN (${inOrders})
    `
    const itemsResult = await pool.request().query(itemsQuery)

    // ربط الطلبات بعناصرها
    const allOrdersData = ordersResult.recordset.map((ord: any) => {
      const orderItems = itemsResult.recordset.filter((it: any) => it.orderId === ord.id)

      return {
        id: ord.id,
        sessionId: ord.sessionId,
        customerPhone: ord.customerPhoneNumber,
        customerName: ord.customerName,
        status: ord.status,
        deliveryAddress: ord.deliveryAddress,
        totalPrice: ord.totalPrice,
        createdAt: ord.createdAt,
        // وغيرها من حقول Orders
        items: orderItems.map((it: any) => ({
          productName: it.product_name,
          productInternalCode: it.product_internal_code,
          categoryId: it.category_id,
          categoryName: it.category_name,
          categoryInternalCode: it.category_internal_code,
          quantity: it.quantity,
          price: it.price
        }))
      }
    })

    return res.status(200).json(allOrdersData)
  } catch (error) {
    console.error('Error fetching all orders:', error)
    return res.status(500).json({ message: 'Error fetching all orders.' })
  }
}
