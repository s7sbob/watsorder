// src/controllers/bulkImportController.ts

import { Request, Response } from 'express'
import { getConnection } from '../config/db'
import * as sql from 'mssql'

// دالة لإضافة مجموعات من الأصناف والمنتجات مع الأكواد الداخلية
export const bulkAddCategoriesAndProducts = async (req: Request, res: Response) => {
  // نتوقع في الرابط شيئاً مثل: POST /api/bulk-import/:sessionId
  // بالتالي نأخذ sessionId من req.params
  const sessionId = parseInt(req.params.sessionId, 10)

  // منطقياً، نريد في جسم الطلب:
  // {
  //   "categories": [
  //     { "category_name": "Cat One", "category_internal_code": "C001" },
  //     { "category_name": "Cat Two", "category_internal_code": "C002" }
  //   ],
  //   "products": [
  //     { "product_name": "Product A", "price": 10, "category_id": 1, "product_internal_code": "PA10" },
  //     ...
  //   ]
  // }
  const { categories, products } = req.body

  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' })
  }

  try {
    const pool = await getConnection()

    // =========== [ إدخال الأصناف ] ===========
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat.category_name) {
          // يمكنك إما تجاهل هذا الصنف أو إرسال خطأ
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

    // =========== [ إدخال المنتجات ] ===========
    if (Array.isArray(products)) {
      for (const prod of products) {
        // تحقق من وجود الحقول الأساسية
        if (!prod.product_name || !prod.category_id) {
          continue
        }

        await pool.request()
          .input('sessionId', sql.Int, sessionId)
          .input('category_id', sql.Int, prod.category_id)
          .input('product_name', sql.NVarChar, prod.product_name)
          .input('price', sql.Decimal(18,2), prod.price ?? null)
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
  } catch (error) {
    console.error('Error in bulkAddCategoriesAndProducts:', error)
    return res.status(500).json({
      message: 'Error in bulk adding categories/products.'
    })
  }
}
