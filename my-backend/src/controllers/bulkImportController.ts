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
    // نفس منطقك السابق
    // ...
    // (هنا لم يتغير شيء في الكود الأساسي سوى أننا ضمنا التحقق بالأعلى)

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
