// controllers/session/keywords.controller.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnershipForKeywords } from './helpers';
import fs from 'fs-extra'; // في حال تحتاجه لإزالة ملفات

/**
 * (1) إضافة مجموعة كلمات مفتاحية + الرد
 */
export const addKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  let keywordsInput = req.body.keywords || req.body.keyword;
  const replyText = req.body.replyText;

  if (!keywordsInput || !replyText) {
    return res.status(400).json({ message: 'keywords and replyText are required.' });
  }

  let keywordsArray: string[] = [];
  if (typeof keywordsInput === 'string') {
    keywordsArray = keywordsInput.split(',').map((kw: string) => kw.trim()).filter((kw: string) => kw);
  } else if (Array.isArray(keywordsInput)) {
    keywordsArray = keywordsInput.map((kw: string) => kw.trim()).filter((kw: string) => kw);
  }
  if (keywordsArray.length === 0) {
    return res.status(400).json({ message: 'At least one keyword is required.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    let replayId: number;

    // البحث عن Replay بنفس نص الرد
    const replaySearch = await pool.request()
      .input('replyText', sql.NVarChar, replyText)
      .query(`
        SELECT id FROM [dbo].[Replays]
        WHERE replyText = @replyText
      `);

    if (replaySearch.recordset.length > 0) {
      replayId = replaySearch.recordset[0].id;
      // تحديث نص الرد (اختياري)
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

    // إدراج كل كلمة مفتاحية
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

    // إضافة ملفات مرفقة (إن لم يكن هناك ملفات قديمة)
    const existingMedia = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`SELECT COUNT(*) as cnt FROM ReplayMedia WHERE replayId = @replayId`);
    if (existingMedia.recordset[0].cnt === 0) {
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
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
    }

    return res.status(201).json({ message: 'Keywords added successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error adding keywords:', error);
    return res.status(500).json({ message: 'Error adding keywords.' });
  }
};

/**
 * (2) جلب كل الكلمات المفتاحية الخاصة بالجلسة
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
    const map = new Map<number, any>();

    for (const row of rows) {
      if (!map.has(row.replayId)) {
        map.set(row.replayId, {
          replayId: row.replayId,
          keywords: [row.keyword],
          replyText: row.replyText,
          mediaFiles: []
        });
      } else {
        map.get(row.replayId).keywords.push(row.keyword);
      }
      if (row.mediaId) {
        const mediaArray = map.get(row.replayId).mediaFiles;
        if (!mediaArray.find((media: any) => media.mediaId === row.mediaId)) {
          mediaArray.push({
            mediaId: row.mediaId,
            mediaPath: row.mediaPath,
            mediaName: row.mediaName
          });
        }
      }
    }

    const keywordsArray = Array.from(map.values());
    return res.status(200).json(keywordsArray);
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
 * (3) تحديث مجموعة الكلمات المفتاحية
 */
export const updateKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const replayIdParam = req.params.replayId || req.params.keywordId;
  const replayId = parseInt(replayIdParam, 10);
  const { newKeyword, newReplyText } = req.body;

  if (!newKeyword || !newReplyText) {
    return res.status(400).json({ message: 'newKeyword and newReplyText are required.' });
  }

  const keywordsArray = newKeyword.split(',').map((kw: string) => kw.trim()).filter((kw: string) => kw);

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    // التحقق من وجود المجموعة
    const keywordRows = await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id FROM Keywords
        WHERE replay_id = @replayId AND sessionId = @sessionId
      `);

    if (!keywordRows.recordset.length) {
      return res.status(404).json({ message: 'Keyword group not found.' });
    }

    // تحديث الرد
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('newReplyText', sql.NVarChar, newReplyText)
      .query(`
        UPDATE Replays
        SET replyText = @newReplyText
        WHERE id = @replayId
      `);

    // حذف الكلمات المفتاحية القديمة
    await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        DELETE FROM Keywords
        WHERE replay_id = @replayId
      `);

    // إدخال الكلمات الجديدة
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

    // تحديث الوسائط (في حال رفع ملفات جديدة)
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

    return res.status(200).json({ message: 'Keyword group updated successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error updating keyword group:', error);
    return res.status(500).json({ message: 'Error updating keyword group.' });
  }
};

/**
 * (4) حذف مجموعة الكلمات المفتاحية
 */
export const deleteKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const replayId = parseInt(req.params.keywordId, 10);

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForKeywords(pool, sessionId, (req as any).user);

    const keywordRows = await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id FROM Keywords
        WHERE replay_id = @replayId AND sessionId = @sessionId
      `);

    if (!keywordRows.recordset.length) {
      return res.status(404).json({ message: 'Keyword group not found.' });
    }

    await pool.request()
      .input('replayId', sql.Int, replayId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Keywords
        WHERE replay_id = @replayId AND sessionId = @sessionId
      `);

    const checkReplay = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT COUNT(*) as cnt
        FROM Keywords
        WHERE replay_id = @replayId
      `);

    if (checkReplay.recordset[0].cnt === 0) {
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`);

      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM Replays WHERE id = @replayId`);
    }

    return res.status(200).json({ message: 'Keyword group deleted successfully.' });
  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    console.error('Error deleting keyword group:', error);
    return res.status(500).json({ message: 'Error deleting keyword group.' });
  }
};
