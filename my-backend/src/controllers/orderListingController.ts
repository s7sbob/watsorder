// src/controllers/orderListingController.ts

import { Request, Response } from 'express'
import { poolPromise } from '../config/db'
import * as sql from 'mssql'

/**
 * دالة لجلب الطلبات الجديدة (غير المؤكدة) بكل التفاصيل
 * شرط: o.status != 'CONFIRMED' 
 */
export const getNewOrdersForUser = async (req: Request, res: Response) => {
  try {
    // 1) تأكد من وجود req.user (أي تحقق التوكن)
    if (!req.user) {
      return res.status(401).json({ message: 'User not authorized. No token or invalid token.' })
    }

    // لو أردت السماح للـ admin برؤية كل الطلبات الجديدة (بغضّ النظر عن userId):
    // if (req.user.subscriptionType === 'admin') {
    //   // اجلب كل الطلبات الجديدة من Orders 
    //   // return ...
    // }

    // 2) جلب الجلسات المملوكة لهذا المستخدم
    const userId = req.user.id
    const pool = await poolPromise;
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

    // 3) الآن استعلام الطلبات ذات الحالة != 'CONFIRMED'
    const inClause = sessionIds.join(',')
    const ordersQuery = `
      SELECT
        o.*,
        s.phoneNumber AS sessionPhone
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.sessionId IN (${inClause})
        AND o.status = 'CONFIRMED'
      ORDER BY o.createdAt DESC
    `
    const ordersResult = await pool.request().query(ordersQuery)

    if (!ordersResult.recordset.length) {
      return res.status(200).json([])
    }

    // 4) جلب عناصر الطلب وربطها
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

    // 5) بناء النتيجة النهائية
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
 * دالة لجلب جميع الطلبات الخاصة بالمستخدم (بغض النظر عن الحالة)
 */
export const getAllOrdersForUser = async (req: Request, res: Response) => {
  try {
    // 1) تأكد من وجود req.user
    if (!req.user) {
      return res.status(401).json({ message: 'User not authorized. No token or invalid token.' })
    }

    // إذا أردت السماح للـ admin برؤية كل الطلبات:
    // if (req.user.subscriptionType === 'admin') {
    //   // اجلب كل الطلبات من Orders
    // }

    const userId = req.user.id
    const pool = await poolPromise;

    // 2) جلب الجلسات المملوكة لهذا المستخدم
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

    // 3) جلب كافة الطلبات دون قيد الحالة
    const inClause = sessionIds.join(',')
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

    // 4) جلب عناصر الطلب وربطها
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

    // 5) ربط الطلبات بعناصرها
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



export const getOrdersByDateRange = async (req: Request, res: Response) => {
  try {
    // تأكد من وجود req.user
    if (!req.user) {
      return res.status(401).json({ message: 'User not authorized. No token or invalid token.' });
    }

    const userId = req.user.id;
    const pool = await poolPromise;

    // جلب الجلسات الخاصة بالمستخدم
    const sessionsResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT id
        FROM Sessions
        WHERE userId = @userId
      `);

    if (!sessionsResult.recordset.length) {
      return res.status(200).json([]);
    }

    const sessionIds = sessionsResult.recordset.map((row: any) => row.id);
    const inClause = sessionIds.join(',');

    // الحصول على startDate و endDate من الـ query params
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate query parameters are required' });
    }

    // جلب الطلبات التي تقع ضمن الفترة المحددة
    const ordersQuery = `
      SELECT
        o.*,
        s.phoneNumber AS sessionPhone
      FROM Orders o
      JOIN Sessions s ON s.id = o.sessionId
      WHERE o.sessionId IN (${inClause})
        AND o.createdAt BETWEEN @startDate AND @endDate
      ORDER BY o.createdAt DESC
    `;
    const ordersResult = await pool.request()
      .input('startDate', sql.DateTime, new Date(startDate as string))
      .input('endDate', sql.DateTime, new Date(endDate as string))
      .query(ordersQuery);

    if (!ordersResult.recordset.length) {
      return res.status(200).json([]);
    }

    // جلب عناصر الطلب وربطها بالطلبات
    const orderIds = ordersResult.recordset.map((ord: any) => ord.id);
    const inOrders = orderIds.join(',');
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
    `;
    const itemsResult = await pool.request().query(itemsQuery);

    const allOrdersData = ordersResult.recordset.map((ord: any) => {
      const orderItems = itemsResult.recordset.filter((it: any) => it.orderId === ord.id);
      return {
        id: ord.id,
        sessionId: ord.sessionId,
        customerPhone: ord.customerPhoneNumber,
        customerName: ord.customerName,
        status: ord.status,
        deliveryAddress: ord.deliveryAddress,
        totalPrice: ord.totalPrice,
        createdAt: ord.createdAt,
        items: orderItems.map((it: any) => ({
          productName: it.product_name,
          productInternalCode: it.product_internal_code,
          categoryId: it.category_id,
          categoryName: it.category_name,
          categoryInternalCode: it.category_internal_code,
          quantity: it.quantity,
          price: it.price
        }))
      };
    });

    return res.status(200).json(allOrdersData);
  } catch (error) {
    console.error('Error fetching orders by date range:', error);
    return res.status(500).json({ message: 'Error fetching orders by date range.' });
  }
};
