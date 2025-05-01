// controllers/session/keywords.controller.ts
import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';

/**
 * (1) إضافة مجموعة كلمات مفتاحية + الرد
 */
export const addKeyword = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const sessionId = parseInt(req.params.sessionId, 10); // أخذ sessionId من المسار
    const { keywords, replyText, isActive } = req.body;
    let mediaUrl = null;

    // التحقق من أن sessionId ليس NaN
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid sessionId in URL path' });
    }

    // التحقق من أن keywords ليست فارغة
    if (!keywords) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    // إذا تم رفع ملف وسائط جديد، خزن مسار S3
    if (req.file) {
      mediaUrl = (req.file as any).location; // مؤقتًا حتى يتم تطبيق ملف التصريح
      console.log('Media uploaded for keyword (single), URL:', mediaUrl);
    } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      mediaUrl = (req.files[0] as any).location; // في حالة استخدام array
      console.log('Media uploaded for keyword (array), URL:', mediaUrl);
    } else {
      console.log('No media file uploaded for keyword, req.file:', req.file, 'req.files:', req.files);
    }

    // أولاً: إنشاء الرد في جدول Replays
    const replayResult = await pool.request()
      .input('replyText', replyText)
      .query(`
        INSERT INTO Replays (replyText)
        VALUES (@replyText);
        SELECT SCOPE_IDENTITY() as id;
      `);

    const replayId = replayResult.recordset[0].id;

    // ثانيًا: إنشاء الكلمة المفتاحية في جدول Keywords وربطها بالرد
    const keywordResult = await pool.request()
      .input('sessionId', sessionId)
      .input('keyword', keywords)
      .input('replayId', replayId)
      .query(`
        INSERT INTO Keywords (sessionId, keyword, replay_id)
        VALUES (@sessionId, @keyword, @replayId);
        SELECT SCOPE_IDENTITY() as id;
      `);

    const keywordId = keywordResult.recordset[0].id;

    // ثالثًا: إذا تم رفع ملف وسائط، أضفه إلى جدول ReplayMedia
    if (mediaUrl) {
      await pool.request()
        .input('replayId', replayId)
        .input('filePath', mediaUrl)
        .input('fileName', req.file ? req.file.originalname : (Array.isArray(req.files) && req.files.length > 0 ? (req.files[0] as any).originalname : null))
        .query(`
          INSERT INTO ReplayMedia (replayId, filePath, fileName)
          VALUES (@replayId, @filePath, @fileName);
        `);
      console.log('Media URL inserted into ReplayMedia for keyword:', mediaUrl);
    }

    res.status(201).json({ id: keywordId, message: 'Keyword added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding keyword' });
  }
};


/**
 * (2) جلب كل الكلمات المفتاحية الخاصة بالجلسة
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
          rm.filePath AS mediaUrl,
          rm.fileName AS mediaName
        FROM Keywords k
        JOIN Replays r ON k.replay_id = r.id
        LEFT JOIN ReplayMedia rm ON rm.replayId = r.id
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
            mediaUrl: row.mediaUrl,
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
  try {
    const pool = await poolPromise;

    // استلم keywordId بأي اسم أرسلته في الـ route
    const keywordId = parseInt(
      (req.params.keywordId || req.params.replayId || req.params.id) as string,
      10,
    );

    if (isNaN(keywordId)) {
      return res.status(400).json({ error: 'Invalid keywordId in URL path' });
    }

    const { newKeyword, newReplyText, isActive } = req.body;
    let mediaUrl: string | null = null;

    if (req.file) {
      mediaUrl = (req.file as any).location;
    } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      mediaUrl = (req.files[0] as any).location;
    }

    /* ---------- تحديث جدول Keywords ---------- */
    const updateFields: string[] = [];
    const request = pool.request().input('keywordId', sql.Int, keywordId);

    if (newKeyword) {
      updateFields.push('keyword = @newKeyword');
      request.input('newKeyword', newKeyword);
    }
    if (isActive !== undefined) {
      updateFields.push('IsActive = @isActive');
      request.input('isActive', isActive === 'true' ? 1 : 0);
    }

    if (updateFields.length) {
      await request.query(
        `UPDATE Keywords SET ${updateFields.join(', ')} WHERE id = @keywordId`,
      );
    }

    /* ---------- تحديث جدول Replays لو وُجد نص جديد ---------- */
    if (newReplyText) {
      await pool
        .request()
        .input('keywordId', sql.Int, keywordId)
        .input('newReplyText', newReplyText)
        .query(`
          UPDATE r
          SET r.replyText = @newReplyText
          FROM Replays r
          JOIN Keywords k ON k.replay_id = r.id
          WHERE k.id = @keywordId
        `);
    }

    /* ---------- تحديث الوسائط ---------- */
    if (mediaUrl) {
      // احصل على replay_id أولاً
      const { recordset } = await pool
        .request()
        .input('keywordId', sql.Int, keywordId)
        .query('SELECT replay_id FROM Keywords WHERE id = @keywordId');

      const replayId = recordset[0]?.replay_id;
      if (replayId) {
        // احذف القديم
        await pool
          .request()
          .input('replayId', sql.Int, replayId)
          .query('DELETE FROM ReplayMedia WHERE replayId = @replayId');

        // أضف الجديد
        await pool
          .request()
          .input('replayId', sql.Int, replayId)
          .input('filePath', mediaUrl)
          .input(
            'fileName',
            req.file
              ? req.file.originalname
              : (Array.isArray(req.files) && req.files.length > 0
                  ? (req.files[0] as any).originalname
                  : null),
          )
          .query(
            'INSERT INTO ReplayMedia (replayId, filePath, fileName) VALUES (@replayId, @filePath, @fileName)',
          );
      }
    }

    return res.json({ message: 'Keyword updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error updating keyword' });
  }
};



/**
 * (4) حذف مجموعة الكلمات المفتاحية
 */
export const deleteKeyword = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const keywordId = parseInt(req.params.keywordId, 10);

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, (req as any).user);

    const keywordRows = await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, replay_id FROM Keywords
        WHERE id = @keywordId AND sessionId = @sessionId
      `);

    if (!keywordRows.recordset.length) {
      return res.status(404).json({ message: 'Keyword not found.' });
    }

    const replayId = keywordRows.recordset[0].replay_id;

    await pool.request()
      .input('keywordId', sql.Int, keywordId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Keywords
        WHERE id = @keywordId AND sessionId = @sessionId
      `);

    // التحقق مما إذا كان هناك كلمات مفتاحية أخرى مرتبطة بنفس الرد
    const checkReplay = await pool.request()
      .input('replayId', sql.Int, replayId)
      .query(`
        SELECT COUNT(*) as cnt
        FROM Keywords
        WHERE replay_id = @replayId
      `);

    if (checkReplay.recordset[0].cnt === 0) {
      // إذا لم يكن هناك كلمات مفتاحية أخرى مرتبطة، احذف الرد
      await pool.request()
        .input('replayId', sql.Int, replayId)
        .query(`DELETE FROM ReplayMedia WHERE replayId = @replayId`);

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
