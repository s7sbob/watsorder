// controllers/session/keywords.controller.ts
import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';
import WhatsAppMessageFormatter from '../../utils/whatsappMessageFormatter';

/**
 * إضافة مجموعة كلمات مفتاحية + الرد مع دعم Rich Text
 */
export const addKeyword = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const sessionId = parseInt(req.params.sessionId, 10);
    const { keywords, replyText, isActive } = req.body;
    let mediaUrl = null;

    // التحقق من صحة sessionId
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'معرف الجلسة غير صحيح في مسار URL' });
    }

    // التحقق من وجود الكلمات المفتاحية
    if (!keywords) {
      return res.status(400).json({ error: 'الكلمات المفتاحية مطلوبة' });
    }

    // التحقق من وجود نص الرد
    if (!replyText) {
      return res.status(400).json({ error: 'نص الرد مطلوب' });
    }

    // التحقق من ملكية الجلسة
    await checkSessionOwnership(pool, sessionId, (req as any).user);

    // تحويل نص الرد إلى تنسيق WhatsApp
    const formattedReplyText = WhatsAppMessageFormatter.formatForWhatsApp(replyText);
    
    // التحقق من طول الرسالة
    const lengthValidation = WhatsAppMessageFormatter.validateMessageLength(formattedReplyText, 4096);
    if (!lengthValidation.isValid) {
      return res.status(400).json({ 
        error: 'نص الرد طويل جداً',
        details: lengthValidation.message,
        maxLength: 4096,
        currentLength: formattedReplyText.length
      });
    }

    // معالجة الملفات المرفوعة
    if (req.file) {
      mediaUrl = (req.file as any).location;
      console.log('Media uploaded for keyword (single), URL:', mediaUrl);
    } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      mediaUrl = (req.files[0] as any).location;
      console.log('Media uploaded for keyword (array), URL:', mediaUrl);
    } else {
      console.log('No media file uploaded for keyword');
    }

    // إنشاء الرد في جدول Replays
    const replayResult = await pool.request()
      .input('replyText', sql.NVarChar(sql.MAX), formattedReplyText)
      .query(`
        INSERT INTO Replays (replyText)
        VALUES (@replyText);
        SELECT SCOPE_IDENTITY() as id;
      `);

    const replayId = replayResult.recordset[0].id;

    // معالجة الكلمات المفتاحية (قد تكون مفصولة بفواصل)
    const keywordsList = Array.isArray(keywords) ? keywords : keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    
    // إدراج كل كلمة مفتاحية
    for (const keyword of keywordsList) {
      await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .input('keyword', sql.NVarChar, keyword.trim())
        .input('replayId', sql.Int, replayId)
        .query(`
          INSERT INTO Keywords (sessionId, keyword, replay_id)
          VALUES (@sessionId, @keyword, @replayId);
        `);
    }

    // إضافة الملف المرفق إذا وُجد
    if (mediaUrl) {
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .input('filePath', sql.NVarChar, mediaUrl)
        .input('fileName', sql.NVarChar, req.file ? req.file.originalname : (Array.isArray(req.files) && req.files.length > 0 ? (req.files[0] as any).originalname : null))
        .query(`
          INSERT INTO ReplayMedia (replayId, filePath, fileName)
          VALUES (@replayId, @filePath, @fileName);
        `);
      console.log('Media URL inserted into ReplayMedia for keyword:', mediaUrl);
    }

    res.status(201).json({ 
      id: replayId, 
      message: 'تم إضافة الكلمات المفتاحية بنجاح',
      formattedReplyText: formattedReplyText,
      keywordsCount: keywordsList.length,
      preview: WhatsAppMessageFormatter.generatePreview(formattedReplyText)
    });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'غير مسموح: لا تملك هذه الجلسة' });
    }
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'خطأ في إضافة الكلمات المفتاحية' });
  }
};

/**
 * جلب كل الكلمات المفتاحية الخاصة بالجلسة
 */
export const getKeywordsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, (req as any).user);

    const queryResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT 
          k.id AS keywordId,
          k.keyword,
          r.id AS replayId,
          r.replyText,
          rm.id AS mediaId,
          rm.filePath,
          rm.fileName
        FROM Keywords k
        LEFT JOIN Replays r ON k.replay_id = r.id
        LEFT JOIN ReplayMedia rm ON r.id = rm.replayId
        WHERE k.sessionId = @sessionId
        ORDER BY r.id DESC, k.id ASC
      `);

    // تجميع البيانات حسب replayId
    const groupedData: { [key: number]: any } = {};
    
    queryResult.recordset.forEach(row => {
      const replayId = row.replayId;
      
      if (!groupedData[replayId]) {
        groupedData[replayId] = {
          replayId: replayId,
          replyText: row.replyText,
          preview: WhatsAppMessageFormatter.generatePreview(row.replyText || ''),
          keywords: [],
          media: []
        };
      }
      
      // إضافة الكلمة المفتاحية إذا لم تكن موجودة
      const existingKeyword = groupedData[replayId].keywords.find((k: any) => k.keywordId === row.keywordId);
      if (!existingKeyword && row.keywordId) {
        groupedData[replayId].keywords.push({
          keywordId: row.keywordId,
          keyword: row.keyword
        });
      }
      
      // إضافة الملف المرفق إذا لم يكن موجوداً
      const existingMedia = groupedData[replayId].media.find((m: any) => m.mediaId === row.mediaId);
      if (!existingMedia && row.mediaId) {
        groupedData[replayId].media.push({
          mediaId: row.mediaId,
          filePath: row.filePath,
          fileName: row.fileName
        });
      }
    });

    const result = Object.values(groupedData);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'غير مسموح: لا تملك هذه الجلسة' });
    }
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'خطأ في جلب الكلمات المفتاحية' });
  }
};

/**
 * تحديث مجموعة الكلمات المفتاحية مع دعم Rich Text
 */
export const updateKeyword = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const sessionId = parseInt(req.params.sessionId, 10);
    const replayId = parseInt(req.params.keywordId, 10); // في الواقع هو replayId
    const { newKeyword, newReplyText } = req.body;

    if (!newKeyword || !newReplyText) {
      return res.status(400).json({ message: 'الكلمات المفتاحية الجديدة ونص الرد مطلوبان' });
    }

    // التحقق من ملكية الجلسة
    await checkSessionOwnership(pool, sessionId, (req as any).user);

    // تحويل نص الرد إلى تنسيق WhatsApp
    const formattedReplyText = WhatsAppMessageFormatter.formatForWhatsApp(newReplyText);
    
    // التحقق من طول الرسالة
    const lengthValidation = WhatsAppMessageFormatter.validateMessageLength(formattedReplyText, 4096);
    if (!lengthValidation.isValid) {
      return res.status(400).json({ 
        error: 'نص الرد طويل جداً',
        details: lengthValidation.message,
        maxLength: 4096,
        currentLength: formattedReplyText.length
      });
    }

    // تقسيم الكلمات المفتاحية الجديدة
    const keywordsArray = newKeyword.split(',').map((kw: string) => kw.trim()).filter((kw: string) => kw);

    // التحقق من وجود مجموعة الكلمات المفتاحية
    const keywordRows = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT id FROM Keywords
        WHERE sessionId = @sessionId AND replay_id = @replayId
      `);

    if (!keywordRows.recordset.length) {
      return res.status(404).json({ message: 'مجموعة الكلمات المفتاحية غير موجودة' });
    }

    // تحديث نص الرد
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('newReplyText', sql.NVarChar(sql.MAX), formattedReplyText)
      .query(`
        UPDATE Replays
        SET replyText = @newReplyText
        WHERE id = @replayId
      `);

    // حذف الكلمات المفتاحية القديمة
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('replayId', sql.Int, replayId)
      .query(`
        DELETE FROM Keywords
        WHERE sessionId = @sessionId AND replay_id = @replayId
      `);

    // إدراج الكلمات المفتاحية الجديدة
    for (const kw of keywordsArray) {
      await pool.request()
        .input('sessionId', sql.Int, sessionId)
        .input('keyword', sql.NVarChar, kw)
        .input('replay_id', sql.Int, replayId)
        .query(`
          INSERT INTO [dbo].[Keywords] (sessionId, keyword, replay_id)
          VALUES (@sessionId, @keyword, @replay_id)
        `);
    }

    return res.status(200).json({ 
      message: 'تم تحديث مجموعة الكلمات المفتاحية بنجاح',
      formattedReplyText: formattedReplyText,
      keywordsCount: keywordsArray.length,
      preview: WhatsAppMessageFormatter.generatePreview(formattedReplyText)
    });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'الجلسة غير موجودة' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'غير مسموح: لا تملك هذه الجلسة' });
    }
    console.error('Error updating keyword group:', error);
    return res.status(500).json({ message: 'خطأ في تحديث مجموعة الكلمات المفتاحية' });
  }
};

/**
 * حذف مجموعة الكلمات المفتاحية
 */
export const deleteKeyword = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const sessionId = parseInt(req.params.sessionId, 10);
    const replayId = parseInt(req.params.keywordId, 10); // في الواقع هو replayId

    // التحقق من ملكية الجلسة
    await checkSessionOwnership(pool, sessionId, (req as any).user);

    // التحقق من وجود مجموعة الكلمات المفتاحية
    const keywordRows = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT id FROM Keywords
        WHERE sessionId = @sessionId AND replay_id = @replayId
      `);

    if (!keywordRows.recordset.length) {
      return res.status(404).json({ message: 'مجموعة الكلمات المفتاحية غير موجودة' });
    }

    // حذف الكلمات المفتاحية
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('replayId', sql.Int, replayId)
      .query(`
        DELETE FROM Keywords
        WHERE sessionId = @sessionId AND replay_id = @replayId
      `);

    // حذف الملفات المرفقة
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        DELETE FROM ReplayMedia
        WHERE replayId = @replayId
      `);

    // حذف الرد
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        DELETE FROM Replays
        WHERE id = @replayId
      `);

    return res.status(200).json({ message: 'تم حذف مجموعة الكلمات المفتاحية بنجاح' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'الجلسة غير موجودة' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'غير مسموح: لا تملك هذه الجلسة' });
    }
    console.error('Error deleting keyword group:', error);
    return res.status(500).json({ message: 'خطأ في حذف مجموعة الكلمات المفتاحية' });
  }
};

/**
 * معاينة نص الرد كما سيظهر في WhatsApp
 */
export const previewKeywordReply = async (req: Request, res: Response) => {
  const { replyText } = req.body;
  
  try {
    if (!replyText) {
      return res.status(400).json({ message: 'نص الرد مطلوب' });
    }

    // تحويل النص إلى تنسيق WhatsApp
    const formattedMessage = WhatsAppMessageFormatter.formatForWhatsApp(replyText);
    
    // التحقق من طول الرسالة
    const lengthValidation = WhatsAppMessageFormatter.validateMessageLength(formattedMessage, 4096);
    
    // إنشاء معاينة HTML
    const htmlPreview = WhatsAppMessageFormatter.generatePreview(formattedMessage);
    
    return res.status(200).json({
      formattedMessage: formattedMessage,
      htmlPreview: htmlPreview,
      lengthValidation: lengthValidation,
      characterCount: formattedMessage.length
    });
  } catch (error) {
    console.error('Error previewing keyword reply:', error);
    return res.status(500).json({ message: 'خطأ في معاينة نص الرد' });
  }
};

