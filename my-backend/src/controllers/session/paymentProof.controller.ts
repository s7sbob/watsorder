// controllers/session/paymentProof.controller.ts (مثال)
// أو يمكنك وضعه في نفس الملف session.controller.ts

import { Request, Response } from 'express'
import { getConnection } from '../../config/db'
import * as sql from 'mssql'
import fs from 'fs'
import path from 'path'
import multer from 'multer'

/**
 * إعداد Multer لحفظ الملفات في مجلد "uploads/paymentProofs"
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // مجلد الحفظ
    cb(null, 'uploads/paymentProofs')
  },
  filename: (req, file, cb) => {
    // تسمية الملف: ربما بإمكانك إضافة sessionId لتسهيل الفرز
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) // امتداد الملف
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

export const uploadPaymentProof = multer({ storage }).single('paymentProof')

/**
 * دالة التعامل مع رفع ملف إثبات الدفع:
 */
export const submitPaymentProof = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10)
    if (!sessionId) {
      return res.status(400).json({ message: 'Invalid session ID.' })
    }

    // التأكد من وجود ملف
    if (!req.file) {
      return res.status(400).json({ message: 'No payment proof file provided.' })
    }

    const filePath = req.file.path // المسار النسبي للملف
    const originalName = req.file.originalname

    const pool = await getConnection()
    // احفظ التفاصيل في جدول PaymentProofs
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('filePath', sql.NVarChar, filePath)
      .input('fileName', sql.NVarChar, originalName)
      .query(`
        INSERT INTO PaymentProofs (sessionId, filePath, fileName)
        VALUES (@sessionId, @filePath, @fileName)
      `)

    // يمكن هنا تحديث الحالة إن أردت (مثلاً تحويل الجلسة من Waiting for Payment إلى Paid pending review)
    // مثال: 
    // await pool.request()
    //   .input('sessionId', sql.Int, sessionId)
    //   .query(`UPDATE Sessions SET status = 'Paid' WHERE id = @sessionId`)

    return res.status(200).json({ message: 'Payment proof uploaded successfully.' })
  } catch (error) {
    console.error('Error submitting payment proof:', error)
    return res.status(500).json({ message: 'Error submitting payment proof.' })
  }
}



/**
 * جلب أحدث ملف إثبات دفع لجلسة معينة
 */
export const getPaymentProof = async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10)
      if (!sessionId) {
        return res.status(400).json({ message: 'Invalid session ID.' })
      }
  
      const pool = await getConnection()
      // نجلب آخر إثبات (أو أول إثبات) – أو يمكنك جلب كل الإثباتات لو تسمح برفع أكثر من صورة.
      const result = await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
          SELECT TOP 1 filePath, fileName
          FROM PaymentProofs
          WHERE sessionId = @sessionId
          ORDER BY uploadedAt DESC
        `)
  
      if (result.recordset.length === 0) {
        return res.status(200).json({ hasProof: false })
      }
  
      const row = result.recordset[0]
      return res.status(200).json({
        hasProof: true,
        filePath: row.filePath // relative path, e.g. "uploads/paymentProofs/paymentProof-12345.jpg"
        // fileName: row.fileName, // اختياري
      })
    } catch (error) {
      console.error('Error fetching payment proof:', error)
      return res.status(500).json({ message: 'Error fetching payment proof.' })
    }
  }