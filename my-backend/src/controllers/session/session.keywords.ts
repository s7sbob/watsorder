// src/controllers/session/session.keywords.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs';

/**
 * دالة للتحقق من ملكية sessionId (مشابهة لدوال أخرى)
 */
async function checkSessionOwnershipForKeywords(pool: sql.ConnectionPool, sessionId: number, user: any) {
  const sessRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT userId FROM Sessions WHERE id = @sessionId`);
  if (!sessRow.recordset.length) {
    throw new Error('SessionNotFound');
  }
  const ownerId = sessRow.recordset[0].userId;
  if (user.subscriptionType !== 'admin' && user.id !== ownerId) {
    throw new Error('Forbidden');
  }
}

/**
 * إضافة Keyword + Replay
 */
export const addKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { keyword, replyText } = req.body;

  if (!keyword || !replyText) {
    return res.status(400).json({ message: 'keyword and replyText are required.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    let replayId: number;

    // البحث عن Replay بنفس النص في جدول Replays
    const replaySearch = await pool.request()
      .input('replyText', sql.NVarChar, replyText)
      .query(`
        SELECT id FROM [dbo].[Replays]
        WHERE replyText = @replyText
      `);

    if (replaySearch.recordset.length > 0) {
      replayId = replaySearch.recordset[0].id;
      // تحديث نص الرد إن رغبت (اختياري)
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          UPDATE [dbo].[Replays]
          SET replyText = @replyText
          WHERE id = @replayId
        `);
    } else {
      // إنشاء Replay جديد
      const replayInsert = await pool.request()
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          INSERT INTO [dbo].[Replays] (replyText)
          OUTPUT INSERTED.id
          VALUES (@replyText)
        `);
      replayId = replayInsert.recordset[0].id;
    }

    // إضافة الـ Keyword وربطه بالـ replay_id (العمود في جدول Keywords)
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('keyword', sql.NVarChar, keyword)
      .input('replay_id', sql.Int, replayId)
      .query(`
        INSERT INTO [dbo].[Keywords] (sessionId, keyword, replay_id)
        VALUES (@sessionId, @keyword, @replay_id)
      `);

    // قبل إدخال الملفات، تحقق مما إذا كانت هناك وسائط موجودة مسبقاً
    const existingMedia = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`SELECT COUNT(*) as cnt FROM ReplayMedia WHERE replayId = @replayId`);

    if (existingMedia.recordset[0].cnt === 0) {
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = file.path; // المسار الذي حفظه multer
          const originalName = file.originalname;
          await pool.request()
            .input('replayId', sql.Int, replayId)
            .input('filePath', sql.NVarChar, filePath)
            .input('fileName', sql.NVarChar, originalName)
            .query(`
              INSERT INTO [dbo].[ReplayMedia] (replayId, filePath, fileName)
              VALUES (@replayId, @filePath, @fileName)
            `);
        }
      }
    }

    return res.status(201).json({ message: 'Keyword added successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error adding keyword:', error);
    return res.status(500).json({ message: 'Error adding keyword.' });
  }
};

/**
 * جلب الـ Keywords وتجميعها حسب replay_id
 * نعيد replay_id باستخدام alias باسم replayId لتسهيل التعامل مع الـ frontend
 */
export const getKeywordsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    const queryResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT 
          k.id AS keywordId,
          k.keyword,
          r.id AS replayId,
          r.replyText,
          m.id AS mediaId,
          m.filePath AS mediaPath,
          m.fileName AS mediaName
        FROM Keywords k
        JOIN Replays r ON k.replay_id = r.id
        LEFT JOIN ReplayMedia m ON m.replayId = r.id
        WHERE k.sessionId = @sessionId
      `);

    const rows = queryResult.recordset;
    // تجميع النتائج بحسب replayId
    const map = new Map<number, any>();
    for (const row of rows) {
      if (!map.has(row.replayId)) {
        map.set(row.replayId, {
          replayId: row.replayId,
          keywords: [row.keyword],
          replyText: row.replyText,
          mediaFiles: [],
        });
      } else {
        map.get(row.replayId).keywords.push(row.keyword);
      }
      if (row.mediaId) {
        map.get(row.replayId).mediaFiles.push({
          mediaId: row.mediaId,
          mediaPath: row.mediaPath,
          mediaName: row.mediaName,
        });
      }
    }
    return res.status(200).json(Array.from(map.values()));
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error fetching keywords:', error);
    return res.status(500).json({ message: 'Error fetching keywords.' });
  }
};

/**
 * تحديث Keyword (مجموعة الكلمات) بناءً على replay_id
 * يتم تحديث نص الرد في جدول Replays وتحديث جميع الكلمات في جدول Keywords التي تحمل replay_id
 * كما يتم إدارة الوسائط: إذا تم رفع ملفات جديدة يتم حذف القديمة وإدراج الجديدة؛ وإلا يتم الاحتفاظ بالوسائط القديمة
 */
export const updateKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  // نستخدم replay_id المُرسل في الرابط
  const replayId = parseInt(req.params.replayId, 10);
  const { newKeyword, newReplyText } = req.body;

  if (!newKeyword || !newReplyText) {
    return res.status(400).json({ message: 'newKeyword and newReplyText are required.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    // التحقق من وجود Replay باستخدام العمود id
    const replayRes = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`SELECT id FROM Replays WHERE id = @replayId`);
    if (!replayRes.recordset.length) {
      return res.status(404).json({ message: 'Keyword group not found.' });
    }

    // تحديث نص الرد في جدول Replays
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('newReplyText', sql.NVarChar, newReplyText)
      .query(`
        UPDATE Replays
        SET replyText = @newReplyText
        WHERE id = @replayId
      `);

    // تحديث جميع الكلمات في جدول Keywords التي تحمل هذا replay_id
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('replayId', sql.Int, replayId)
      .input('newKeyword', sql.NVarChar, newKeyword)
      .query(`
        UPDATE Keywords
        SET keyword = @newKeyword
        WHERE replay_id = @replayId
          AND sessionId = @sessionId
      `);

    // إدارة الوسائط:
    // إذا تم رفع ملفات جديدة، نقوم بحذف الوسائط القديمة وإدراج الجديدة.
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`);
      for (const file of files) {
        const filePath = file.path;
        const originalName = file.originalname;
        await pool.request()
          .input('replayId', sql.Int, replayId)
          .input('filePath', sql.NVarChar, filePath)
          .input('fileName', sql.NVarChar, originalName)
          .query(`
            INSERT INTO [dbo].[ReplayMedia] (replayId, filePath, fileName)
            VALUES (@replayId, @filePath, @fileName)
          `);
      }
    }
    // إذا لم تُرفع ملفات جديدة، نترك الوسائط القديمة كما هي

    return res.status(200).json({ message: 'Keyword updated successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error updating keyword:', error);
    return res.status(500).json({ message: 'Error updating keyword.' });
  }
};

/**
 * حذف Keyword
 * إذا لم يعد الـ replay مستخدمًا، نقوم أيضًا بحذف وسائطه وسجل Replays
 */
export const deleteKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const keywordId = parseInt(req.params.keywordId, 10);

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    // استرجاع replay_id الخاص بالكلمة المفتاحية
    const keywordRow = await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT replay_id
        FROM Keywords
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `);

    if (!keywordRow.recordset.length) {
      return res.status(404).json({ message: 'Keyword not found.' });
    }
    const replayId = keywordRow.recordset[0].replay_id;

    // حذف الكلمة المفتاحية
    await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Keywords
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `);

    // التأكد مما إذا كان الـ replay مستخدمًا بعد حذف هذه الكلمة
    const checkReplay = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT COUNT(*) as cnt
        FROM Keywords
        WHERE replay_id = @replayId
      `);

    if (checkReplay.recordset[0].cnt === 0) {
      // حذف الوسائط
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`);
      // حذف سجل الـ Replays
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM Replays WHERE id = @replayId`);
    }

    return res.status(200).json({ message: 'Keyword deleted successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error deleting keyword:', error);
    return res.status(500).json({ message: 'Error deleting keyword.' });
  }
};
