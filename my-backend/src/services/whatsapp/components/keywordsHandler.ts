import { Client, Message, MessageMedia } from 'whatsapp-web.js';
import * as sql from 'mssql';
import fs from 'fs/promises';
import path from 'path';

interface KeywordsHandlerParams {
  client: Client;
  msg: Message;
  text: string;
  pool: any;
  sessionId: number;
  customerPhone: string;
}

export const handleKeywords = async ({
  client,
  msg,
  text,
  pool,
  sessionId,
  customerPhone
}: KeywordsHandlerParams): Promise<boolean> => {
  console.log(`[${new Date().toISOString()}] BotActive is ON, processing keywords...`);
  const keywordsRes = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`
      SELECT k.keyword, r.replyText, r.id AS replayId
      FROM Keywords k
      JOIN Replays r ON k.replay_id = r.id
      WHERE k.sessionId = @sessionId
    `);
  console.log(`[${new Date().toISOString()}] Keywords query returned ${keywordsRes.recordset.length} rows.`);
  
  const foundKeywordRow = keywordsRes.recordset.find((row: any) =>
    text.toLowerCase().includes(row.keyword?.toLowerCase())
  );
  
  if (foundKeywordRow) {
    console.log(`[${new Date().toISOString()}] Found matching keyword: ${foundKeywordRow.keyword}`);
    const mediaRes = await pool.request()
      .input('replayId', sql.Int, foundKeywordRow.replayId)
      .query(`
        SELECT filePath
        FROM ReplayMedia
        WHERE replayId = @replayId
      `);
    
    if (foundKeywordRow.replyText) {
      console.log(`[${new Date().toISOString()}] Sending text reply: ${foundKeywordRow.replyText}`);
      await client.sendMessage(msg.from, `*${foundKeywordRow.replyText}*`);
    }
    
    for (const m of mediaRes.recordset) {
      try {
        console.log(`[${new Date().toISOString()}] Reading file from path: ${m.filePath}`);
        const fileData = await fs.readFile(m.filePath);
        const base64 = fileData.toString('base64');
        const mediaMsg = new MessageMedia('image/jpeg', base64, path.basename(m.filePath));
        console.log(`[${new Date().toISOString()}] Sending media message for file: ${m.filePath}`);
        await client.sendMessage(msg.from, mediaMsg);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Failed to read or send file: ${m.filePath}`, err);
      }
    }
    console.log(`[${new Date().toISOString()}] Finished processing bot keywords.`);
    return true;
  }
  return false;
};
