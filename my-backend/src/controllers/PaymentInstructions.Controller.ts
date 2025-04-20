import { Request, Response } from 'express';
import { poolPromise } from '../config/db';
import * as sql from 'mssql';

// جلب تعليمات الدفع (نفترض جدول PaymentInstructions يحتوي على عمود id, title, subTitle, vodafoneCash)
export const getPaymentInstructions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT TOP 1 * FROM PaymentInstructions ORDER BY id DESC`);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'تعليمات الدفع غير موجودة' });
    }
    return res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching payment instructions:', error);
    return res.status(500).json({ message: 'خطأ داخلي أثناء جلب تعليمات الدفع' });
  }
};

// إنشاء أو تحديث تعليمات الدفع
export const updatePaymentInstructions = async (req: Request, res: Response): Promise<Response> => {
  const { title, subTitle, vodafoneCash } = req.body;
  if (!title || !subTitle || !vodafoneCash) {
    return res.status(400).json({ message: 'يجب ملء الحقول: title, subTitle, vodafoneCash' });
  }
  try {
    const pool = await poolPromise;
    // نتحقق إذا كان يوجد سجل بالفعل
    const result = await pool.request()
      .query(`SELECT TOP 1 * FROM PaymentInstructions ORDER BY id DESC`);

    if (!result.recordset.length) {
      // إنشاء سجل جديد
      await pool.request()
        .input('title', sql.NVarChar, title)
        .input('subTitle', sql.NVarChar, subTitle)
        .input('vodafoneCash', sql.NVarChar, vodafoneCash)
        .query(`INSERT INTO PaymentInstructions (title, subTitle, vodafoneCash)
                VALUES (@title, @subTitle, @vodafoneCash)`);
      return res.status(201).json({ message: 'تم إنشاء تعليمات الدفع بنجاح' });
    } else {
      // تحديث السجل الحالي
      const existing = result.recordset[0];
      await pool.request()
        .input('id', sql.Int, existing.id)
        .input('title', sql.NVarChar, title)
        .input('subTitle', sql.NVarChar, subTitle)
        .input('vodafoneCash', sql.NVarChar, vodafoneCash)
        .query(`UPDATE PaymentInstructions 
                SET title = @title, subTitle = @subTitle, vodafoneCash = @vodafoneCash 
                WHERE id = @id`);
      return res.status(200).json({ message: 'تم تحديث تعليمات الدفع بنجاح' });
    }
  } catch (error) {
    console.error('Error updating payment instructions:', error);
    return res.status(500).json({ message: 'خطأ داخلي أثناء تحديث تعليمات الدفع' });
  }
};
