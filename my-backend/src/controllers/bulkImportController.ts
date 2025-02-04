// src/controllers/bulkImportController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import * as sql from 'mssql'

async function checkSessionOwnership(pool: sql.ConnectionPool, sessionId: number, user: any) {
  const sessionRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query('SELECT userId FROM Sessions WHERE id = @sessionId')
  if (!sessionRow.recordset.length) {
    throw new Error('SessionNotFound')
  }
  const ownerId = sessionRow.recordset[0].userId
  if (user.subscriptionType !== 'admin' && user.id !== ownerId) {
    throw new Error('Forbidden')
  }
}

export const bulkAddCategoriesAndProducts = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { categories, products } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()

    // التحقق من الملكية أو الإدارة
    await checkSessionOwnership(pool, sessionId, req.user)

    // =========== [ إدخال الأصناف ] ===========
// 1) إدخال الأصناف (Categories)
if (Array.isArray(categories)) {
  for (const cat of categories) {
    if (!cat.category_name) {
      // لو الصنف يفتقد الاسم، يمكنك تجاهله أو إرسال خطأ
      continue
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_name', sql.NVarChar, cat.category_name)
      .input('category_internal_code', sql.NVarChar, cat.category_internal_code || null)
      .query(`
        INSERT INTO [dbo].[Categories]
          (sessionId, category_name, category_internal_code)
        VALUES (@sessionId, @category_name, @category_internal_code)
      `)
  }
}

// 2) إدخال المنتجات (Products)
if (Array.isArray(products)) {
  for (const prod of products) {
    if (!prod.product_name || !prod.category_id) {
      // لو المنتج يفتقد الاسم أو category_id، يمكنك تجاهله أو إرسال خطأ
      continue
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_id', sql.Int, prod.category_id)
      .input('product_name', sql.NVarChar, prod.product_name)
      .input('price', sql.Decimal(18, 2), prod.price ?? null)
      .input('product_internal_code', sql.NVarChar, prod.product_internal_code || null)
      .query(`
        INSERT INTO [dbo].[Products]
          (sessionId, category_id, product_name, price, product_internal_code)
        VALUES (@sessionId, @category_id, @product_name, @price, @product_internal_code)
      `)
  }
}
    return res.status(201).json({
      message: 'Bulk add for categories and products successful.'
    })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Error in bulk adding categories/products.' })
  }
}
