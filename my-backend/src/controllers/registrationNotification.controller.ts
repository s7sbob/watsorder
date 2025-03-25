// src/controllers/registrationNotification.controller.ts
import { Router, Request, Response } from 'express';
import { getConnection } from '../config/db'; // تأكد من تعديل المسار إذا لزم الأمر
import { sendWhatsAppMessage } from '../helpers/whatsAppService';

const router = Router();
const FIXED_SESSION_ID = Number(process.env.FIXED_SESSION_ID);

/**
 * GET endpoint لجلب إعدادات تنبيه التسجيل للجلسة الثابتة.
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const pool = await getConnection();
    const query = `
      SELECT isActive, notificationPhoneNumber, notificationMessage
      FROM RegistrationNotificationSettings
      WHERE sessionId = @sessionId
    `;
    const result = await pool.request()
      .input('sessionId', FIXED_SESSION_ID)
      .query(query);
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      // في حالة عدم وجود إعدادات مسجلة، يتم إرجاع قيم افتراضية
      res.json({
        isActive: false,
        notificationPhoneNumber: '',
        notificationMessage: ''
      });
    }
  } catch (error) {
    console.error('Error fetching registration notification settings:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب إعدادات تنبيه التسجيل.', error });
  }
});

/**
 * POST endpoint لتحديث إعدادات تنبيه التسجيل.
 * يسمح بتعديل:
 * - isActive: تفعيل/تعطيل الخاصية.
 * - notificationPhoneNumber: رقم الواتساب الذي ستُرسل عليه التنبيهات.
 * - notificationMessage: نص الرسالة المُخصصة.
 */
router.post('/settings', async (req: Request, res: Response) => {
  const { isActive, notificationPhoneNumber, notificationMessage } = req.body;
  try {
    const pool = await getConnection();
    // التحقق من وجود إعدادات مسجلة مسبقاً للجلسة الثابتة في جدول RegistrationNotificationSettings
    const checkQuery = 'SELECT * FROM RegistrationNotificationSettings WHERE sessionId = @sessionId';
    const checkResult = await pool.request()
      .input('sessionId', FIXED_SESSION_ID)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      // تحديث الإعدادات الموجودة
      const updateQuery = `
        UPDATE RegistrationNotificationSettings
        SET isActive = @isActive,
            notificationPhoneNumber = @notificationPhoneNumber,
            notificationMessage = @notificationMessage
        WHERE sessionId = @sessionId
      `;
      await pool.request()
        .input('isActive', isActive)
        .input('notificationPhoneNumber', notificationPhoneNumber)
        .input('notificationMessage', notificationMessage)
        .input('sessionId', FIXED_SESSION_ID)
        .query(updateQuery);
    } else {
      // إدخال إعدادات جديدة للجلسة الثابتة
      const insertQuery = `
        INSERT INTO RegistrationNotificationSettings (sessionId, isActive, notificationPhoneNumber, notificationMessage)
        VALUES (@sessionId, @isActive, @notificationPhoneNumber, @notificationMessage)
      `;
      await pool.request()
        .input('sessionId', FIXED_SESSION_ID)
        .input('isActive', isActive)
        .input('notificationPhoneNumber', notificationPhoneNumber)
        .input('notificationMessage', notificationMessage)
        .query(insertQuery);
    }

    res.json({ success: true, message: 'تم تحديث إعدادات تنبيه التسجيل بنجاح.' });
  } catch (error) {
    console.error('Error updating registration notification settings:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث إعدادات تنبيه التسجيل.', error });
  }
});

/**
 * POST endpoint لإرسال تنبيه عند تسجيل مستخدم جديد.
 * يستقبل بيانات المستخدم (userName, userPhone, additionalData) ويقوم بإرسال رسالة واتساب
 * إذا كانت الخاصية مفعلة في الإعدادات.
 */
router.post('/notify', async (req: Request, res: Response) => {
  const { userName, userPhone, additionalData } = req.body;
  try {
    const pool = await getConnection();
    // جلب إعدادات تنبيه التسجيل للجلسة الثابتة
    const settingsQuery = `
      SELECT isActive, notificationPhoneNumber, notificationMessage
      FROM RegistrationNotificationSettings
      WHERE sessionId = @sessionId
    `;
    const settingsResult = await pool.request()
      .input('sessionId', FIXED_SESSION_ID)
      .query(settingsQuery);

    if (settingsResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'إعدادات تنبيه التسجيل غير موجودة.' });
    }
    const settings = settingsResult.recordset[0];

    // التأكد من تفعيل الخاصية وتوفر رقم التنبيه
    if (!settings.isActive) {
      return res.status(200).json({ success: false, message: 'خاصية تنبيه التسجيل معطلة.' });
    }
    if (!settings.notificationPhoneNumber) {
      return res.status(400).json({ success: false, message: 'لم يتم تعيين رقم واتساب للتنبيه.' });
    }

    // تكوين الرسالة: استخدام النص المُخصص أو رسالة افتراضية تحتوي على بيانات المستخدم
    const message = settings.notificationMessage 
      ? settings.notificationMessage 
      : `تسجيل جديد:
الاسم: ${userName}
رقم الهاتف: ${userPhone}
تفاصيل: ${additionalData || 'لا توجد تفاصيل إضافية'}`;

    // إرسال رسالة واتساب عبر الدالة المساعدة
    await sendWhatsAppMessage(settings.notificationPhoneNumber, message);

    res.json({ success: true, message: 'تم إرسال تنبيه التسجيل بنجاح.' });
  } catch (error) {
    console.error('Error sending registration notification:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إرسال تنبيه التسجيل.', error });
  }
});

export default router;
