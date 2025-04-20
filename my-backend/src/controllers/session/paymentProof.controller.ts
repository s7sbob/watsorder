// src/controllers/session/paymentProof.controller.ts

import { Request, Response } from 'express'
import { poolPromise } from '../../config/db'
import * as sql from 'mssql'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { checkSessionOwnership } from '../../utils/sessionUserChecks';

// إعداد Multer لحفظ الملفات في مجلد "uploads/paymentProofs"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/paymentProofs')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

export const uploadPaymentProof = multer({ storage }).single('paymentProof')

/**
 * دالة للتعامل مع رفع ملف إثبات الدفع:
 * - يخزّنه في PaymentProofs كالعادة
 */
export const submitPaymentProof = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10)
    if (!sessionId) {
      return res.status(400).json({ message: 'Invalid session ID.' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No payment proof file provided.' })
    }

    const filePath = req.file.path
    const originalName = req.file.originalname

    const pool = await poolPromise
    await checkSessionOwnership(pool, sessionId, req.user);
    // حفظ التفاصيل في جدول PaymentProofs
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('filePath', sql.NVarChar, filePath)
      .input('fileName', sql.NVarChar, originalName)
      .query(`
        INSERT INTO PaymentProofs (sessionId, filePath, fileName)
        VALUES (@sessionId, @filePath, @fileName)
      `)

    return res.status(200).json({ message: 'Payment proof uploaded successfully.' })
  } catch (error) {
    console.error('Error submitting payment proof:', error)
    return res.status(500).json({ message: 'Error submitting payment proof.' })
  }
}

/**
 * جلب أحدث ملف إثبات دفع لجلسة
 */
export const getPaymentProof = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10)
    if (!sessionId) {
      return res.status(400).json({ message: 'Invalid session ID.' })
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT TOP 1 filePath, fileName
        FROM PaymentProofs
        WHERE sessionId = @sessionId
        ORDER BY uploadedAt DESC
      `)

    if (!result.recordset.length) {
      return res.status(200).json({ hasProof: false })
    }

    const row = result.recordset[0]
    return res.status(200).json({
      hasProof: true,
      filePath: row.filePath
    })
  } catch (error) {
    console.error('Error fetching payment proof:', error)
    return res.status(500).json({ message: 'Error fetching payment proof.' })
  }
}
