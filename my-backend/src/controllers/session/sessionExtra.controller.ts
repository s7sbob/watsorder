// controllers/session/sessionExtra.controller.ts
import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs-extra';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';
import { whatsappClients } from '../whatsappClients';
import WhatsAppMessageFormatter from '../../utils/whatsappMessageFormatter';

/**
 * تحديث رسالة الترحيب مع دعم Rich Text
 */
export const updateGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { greetingMessage, greetingActive } = req.body;
  
  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);

    // تحويل النص المنسق إلى تنسيق WhatsApp
    let formattedMessage = '';
    if (greetingMessage) {
      formattedMessage = WhatsAppMessageFormatter.formatForWhatsApp(greetingMessage);
      
      // التحقق من طول الرسالة
      const lengthValidation = WhatsAppMessageFormatter.validateMessageLength(formattedMessage, 2000);
      if (!lengthValidation.isValid) {
        return res.status(400).json({ 
          message: 'رسالة الترحيب طويلة جداً',
          details: lengthValidation.message,
          maxLength: 2000,
          currentLength: formattedMessage.length
        });
      }
    }

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('greetingMessage', sql.NVarChar(sql.MAX), formattedMessage || null)
      .input('greetingActive', sql.Bit, greetingActive ? 1 : 0)
      .query(`
        UPDATE Sessions
        SET greetingMessage = @greetingMessage, greetingActive = @greetingActive
        WHERE id = @sessionId
      `);

    res.status(200).json({ 
      message: 'تم تحديث رسالة الترحيب بنجاح',
      formattedMessage: formattedMessage,
      preview: WhatsAppMessageFormatter.generatePreview(formattedMessage)
    });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'الجلسة غير موجودة' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'غير مسموح: لا تملك هذه الجلسة' });
    }
    console.error('Error updating greeting:', error);
    res.status(500).json({ message: 'خطأ في تحديث رسالة الترحيب' });
  }
};

/**
 * جلب رسالة الترحيب
 */
export const getGreeting = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT greetingMessage, greetingActive
        FROM Sessions
        WHERE id = @sessionId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'الجلسة غير موجودة' });
    }

    const row = result.recordset[0];
    const greetingMessage = row.greetingMessage || '';
    
    return res.status(200).json({
      greetingMessage: greetingMessage,
      greetingActive: row.greetingActive === true,
      preview: greetingMessage ? WhatsAppMessageFormatter.generatePreview(greetingMessage) : ''
    });
  } catch (error) {
    console.error('Error fetching greeting:', error);
    return res.status(500).json({ message: 'خطأ في جلب رسالة الترحيب' });
  }
};

/**
 * معاينة رسالة الترحيب كما ستظهر في WhatsApp
 */
export const previewGreeting = async (req: Request, res: Response) => {
  const { greetingMessage } = req.body;
  
  try {
    if (!greetingMessage) {
      return res.status(400).json({ message: 'رسالة الترحيب مطلوبة' });
    }

    // تحويل النص إلى تنسيق WhatsApp
    const formattedMessage = WhatsAppMessageFormatter.formatForWhatsApp(greetingMessage);
    
    // التحقق من طول الرسالة
    const lengthValidation = WhatsAppMessageFormatter.validateMessageLength(formattedMessage, 2000);
    
    // إنشاء معاينة HTML
    const htmlPreview = WhatsAppMessageFormatter.generatePreview(formattedMessage);
    
    return res.status(200).json({
      formattedMessage: formattedMessage,
      htmlPreview: htmlPreview,
      lengthValidation: lengthValidation,
      characterCount: formattedMessage.length
    });
  } catch (error) {
    console.error('Error previewing greeting:', error);
    return res.status(500).json({ message: 'خطأ في معاينة رسالة الترحيب' });
  }
};

/**
 * حذف جلسة
 */
export const deleteSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'معرف الجلسة غير صحيح' });
  }
  try {
    const pool = await poolPromise;

    // التحقق من الملكية
    await checkSessionOwnership(pool, sessionId, req.user);

    // إيقاف عميل WhatsApp إذا كان يعمل
    const client = whatsappClients[sessionId];
    if (client) {
      await client.destroy();
      delete whatsappClients[sessionId];
    }

    // تحديث حالة الجلسة إلى محذوفة
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Deleted'
        WHERE id = @sessionId
      `);

    // أرشفة تجديدات الاشتراك
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE SubscriptionRenewals
        SET isActive = 0
        WHERE sessionId = @sessionId
      `);

    return res.status(200).json({ message: 'تم حذف الجلسة وأرشفة تجديدات الاشتراك بنجاح' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'الجلسة غير موجودة' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'غير مسموح: لا تملك هذه الجلسة' });
    }
    console.error('Error deleting session:', error);
    return res.status(500).json({ message: 'خطأ في حذف الجلسة' });
  }
};

/**
 * GET /api/sessions/:id/settings
 */
export const getSessionSettings = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await poolPromise
    await checkSessionOwnership(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT 
          ecommerceActive, 
          sessionDisplayName, 
          sessionAbout, 
          sessionLogo
        FROM Sessions
        WHERE id = @sessionId
      `)

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'الجلسة غير موجودة' })
    }
    return res.json(result.recordset[0])
  } catch (err: any) {
    console.error('Error fetching session settings:', err)
    if (err.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'الجلسة غير موجودة' })
    }
    if (err.message === 'Forbidden') {
      return res.status(403).json({ message: 'غير مسموح' })
    }
    return res.status(500).json({ message: 'خطأ في الخادم' })
  }
}

/**
 * POST /api/sessions/:id/settings
 * multipart/form-data { sessionDisplayName, sessionAbout, ecommerceActive, removeLogo, [sessionLogo] }
 */
export const updateSessionSettings = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'معرف الجلسة غير صحيح في مسار URL' });
    }

    const {
      displayName,
      description,
      isEcommerceEnabled,
      removeLogo,
    } = req.body;

    // شعار جديد إن وُجد
    let sessionLogo: string | null = null;
    if (req.file) {
      sessionLogo = (req.file as any).location;
    }

    // تجهيز حقول التعديل
    const fields: string[] = [];
    const request = pool.request().input('sessionId', sql.Int, sessionId);

    if (displayName) {
      fields.push('DisplayName = @displayName');
      request.input('displayName', displayName);
    }
    if (description) {
      fields.push('Description = @description');
      request.input('description', description);
    }
    if (sessionLogo) {
      fields.push('sessionLogo = @sessionLogo');
      request.input('sessionLogo', sessionLogo);
    } else if (removeLogo === '1' || removeLogo === 'true') {
      fields.push('sessionLogo = NULL');
    }
    if (isEcommerceEnabled !== undefined) {
      fields.push('IsEcommerceEnabled = @isEcommerceEnabled');
      request.input('isEcommerceEnabled', isEcommerceEnabled === 'true' ? 1 : 0);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    }

    // تنفيذ التعديل
    const result = await request.query(`
      UPDATE Sessions
      SET ${fields.join(', ')}
      WHERE Id = @sessionId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    return res.json({ message: 'تم تحديث إعدادات الجلسة بنجاح' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'خطأ في تحديث إعدادات الجلسة' });
  }
};

