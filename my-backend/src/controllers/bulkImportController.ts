// src/controllers/bulkImportController.ts

import { Request, Response } from 'express'
import { poolPromise } from '../config/db'
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
  const categories = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await poolPromise;

    // التحقق من الملكية أو الإدارة
    await checkSessionOwnership(pool, sessionId, req.user)

    if (Array.isArray(categories)) {
      for (const category of categories) {
        if (!category.categoryName) continue

        const result = await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('category_name', sql.NVarChar, category.categoryName)
          .input('category_internal_code', sql.NVarChar, category.CategoryInternalID || null)
          .query(`
            INSERT INTO [dbo].[Categories]
              (sessionId, category_name, category_internal_code)
            OUTPUT Inserted.id
            VALUES (@sessionId, @category_name, @category_internal_code)
          `)

        const categoryId = result.recordset[0].id

        if (Array.isArray(category.Products)) {
          for (const product of category.Products) {
            if (!product.ProductName) continue

            await pool.request()
              .input('sessionId', sql.Int, sessionId)
              .input('category_id', sql.Int, categoryId)
              .input('product_name', sql.NVarChar, product.ProductName)
              .input('price', sql.Decimal(18, 2), product.Price ?? null)
              .input('product_internal_code', sql.NVarChar, product.ProductInternalID || null)
              .query(`
                INSERT INTO [dbo].[Products]
                  (sessionId, category_id, product_name, price, product_internal_code)
                VALUES (@sessionId, @category_id, @product_name, @price, @product_internal_code)
              `)
          }
        }
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
