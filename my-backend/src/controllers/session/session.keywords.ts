// src/controllers/session/session.keywords.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import fs from 'fs';

/**
 * على غرار checkSessionOwnership، نكرر فكرة التحقق من ملكية sessionId
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

// إضافة Keyword + Replay
export const addKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { keyword, replyText } = req.body

  if (!keyword || !replyText) {
    return res.status(400).json({ message: 'keyword and replyText are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

    let replayId: number

    // البحث عن Replay بنفس النص (إذا كان موجودًا)
    const replaySearch = await pool.request()
      .input('replyText', sql.NVarChar, replyText)
      .query(`
        SELECT id FROM [dbo].[Replays]
        WHERE replyText = @replyText
      `)

    if (replaySearch.recordset.length > 0) {
      replayId = replaySearch.recordset[0].id
      // تحديث النص إن رغبت (اختياري)
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          UPDATE [dbo].[Replays]
          SET replyText = @replyText
          WHERE id = @replayId
        `)
    } else {
      // إنشاء Replay جديد (فقط النص)
      const replayInsert = await pool.request()
        .input('replyText', sql.NVarChar, replyText)
        .query(`
          INSERT INTO [dbo].[Replays] (replyText)
          OUTPUT INSERTED.id
          VALUES (@replyText)
        `)
      replayId = replayInsert.recordset[0].id
    }

    // إضافة الـ Keyword
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('keyword', sql.NVarChar, keyword)
      .input('replay_id', sql.Int, replayId)
      .query(`
        INSERT INTO [dbo].[Keywords] (sessionId, keyword, replay_id)
        VALUES (@sessionId, @keyword, @replay_id)
      `)

    // قبل إدخال الملفات، تحقق إذا كان لهذا Replay ملفات موجودة بالفعل
    const existingMedia = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`SELECT COUNT(*) as cnt FROM ReplayMedia WHERE replayId = @replayId`)

    if (existingMedia.recordset[0].cnt === 0) {
      // إذا لم توجد ملفات، نقوم بإدخال الملفات المرفوعة (إذا كانت موجودة)
      const files = req.files as Express.Multer.File[]
      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = file.path // المسار الذي حفظه multer
          const originalName = file.originalname
          await pool.request()
            .input('replayId', sql.Int, replayId)
            .input('filePath', sql.NVarChar, filePath)
            .input('fileName', sql.NVarChar, originalName)
            .query(`
              INSERT INTO [dbo].[ReplayMedia] (replayId, filePath, fileName)
              VALUES (@replayId, @filePath, @fileName)
            `)
        }
      }
    }

    return res.status(201).json({ message: 'Keyword added successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error adding keyword:', error)
    return res.status(500).json({ message: 'Error adding keyword.' })
  }
};

// جلب الـ Keywords
export const getKeywordsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

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
      `)

    // تجميع النتائج بحيث يكون لكل Keyword مصفوفة mediaFiles
    const rows = queryResult.recordset
    const map = new Map<number, any>()

    for (const row of rows) {
      if (!map.has(row.keywordId)) {
        map.set(row.keywordId, {
          keywordId: row.keywordId,
          keyword: row.keyword,
          replayId: row.replayId,
          replyText: row.replyText,
          mediaFiles: []
        })
      }
      if (row.mediaId) {
        map.get(row.keywordId).mediaFiles.push({
          mediaId: row.mediaId,
          mediaPath: row.mediaPath,
          mediaName: row.mediaName
        })
      }
    }

    const keywordsArray = Array.from(map.values())
    return res.status(200).json(keywordsArray)
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error fetching keywords:', error)
    return res.status(500).json({ message: 'Error fetching keywords.' })
  }
};

// تحديث Keyword
export const updateKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const keywordId = parseInt(req.params.keywordId, 10)
  const { newKeyword, newReplyText } = req.body

  if (!newKeyword || !newReplyText) {
    return res.status(400).json({ message: 'newKeyword and newReplyText are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

    // استرجاع replay_id الخاص بالـ Keyword
    const keywordRow = await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT replay_id
        FROM Keywords
        WHERE id = @keywordId 
          AND sessionId = @sessionId
      `)

    if (!keywordRow.recordset.length) {
      return res.status(404).json({ message: 'Keyword not found.' })
    }

    const replayId = keywordRow.recordset[0].replay_id

    // تحديث الـ Keyword
    await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .input('newKeyword', sql.NVarChar, newKeyword)
      .query(`
        UPDATE Keywords
        SET keyword = @newKeyword
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `)

    // تحديث نص الرد في Replays
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('newReplyText', sql.NVarChar, newReplyText)
      .query(`
        UPDATE Replays
        SET replyText = @newReplyText
        WHERE id = @replayId
      `)

    // حذف الملفات القديمة من ReplayMedia
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`)

    // إدخال الملفات الجديدة (إذا وُجدت)
    const files = req.files as Express.Multer.File[]
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = file.path
        const originalName = file.originalname
        await pool.request()
          .input('replayId', sql.Int, replayId)
          .input('filePath', sql.NVarChar, filePath)
          .input('fileName', sql.NVarChar, originalName)
          .query(`
            INSERT INTO [dbo].[ReplayMedia] (replayId, filePath, fileName)
            VALUES (@replayId, @filePath, @fileName)
          `)
      }
    }

    return res.status(200).json({ message: 'Keyword updated successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error updating keyword:', error)
    return res.status(500).json({ message: 'Error updating keyword.' })
  }
};

// حذف Keyword
export const deleteKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const keywordId = parseInt(req.params.keywordId, 10)

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user)

    // ابحث عن الـ replay_id
    const keywordRow = await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT replay_id
        FROM Keywords
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `)

    if (!keywordRow.recordset.length) {
      return res.status(404).json({ message: 'Keyword not found.' })
    }
    const replayId = keywordRow.recordset[0].replay_id

    // احذف الكلمة المفتاحية
    await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Keywords
        WHERE id = @keywordId
          AND sessionId = @sessionId
      `)

    // تأكد هل لا يزال replay مستخدمًا؟
    const checkReplay = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT COUNT(*) as cnt
        FROM Keywords
        WHERE replay_id = @replayId
      `)

    if (checkReplay.recordset[0].cnt === 0) {
      // لا أحد يشير لهذا replay => نحذفه مع حذف ميديااته
      // أولاً نحذف سجلات ReplayMedia
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`)

      // ثم نحذف سجل الـ replay
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM Replays WHERE id = @replayId`)
    }

    return res.status(200).json({ message: 'Keyword deleted successfully.' })
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    console.error('Error deleting keyword:', error)
    return res.status(500).json({ message: 'Error deleting keyword.' })
  }
};
