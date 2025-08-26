import { Client, Message, MessageMedia } from 'whatsapp-web.js';
import * as sql from 'mssql';
import fs from 'fs/promises';
import path from 'path';
import WhatsAppMessageFormatter from '../../../utils/whatsappMessageFormatter';

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
  
  // جلب الكلمات المفتاحية والردود
  const keywordsRes = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`
      SELECT k.keyword, r.replyText, r.id AS replayId
      FROM Keywords k
      JOIN Replays r ON k.replay_id = r.id
      WHERE k.sessionId = @sessionId
    `);
  
  console.log(`[${new Date().toISOString()}] Keywords query returned ${keywordsRes.recordset.length} rows.`);
  
  // البحث عن كلمة مفتاحية مطابقة
  const foundKeywordRow = keywordsRes.recordset.find((row: any) =>
    text.toLowerCase().includes(row.keyword?.toLowerCase())
  );
  
  if (foundKeywordRow) {
    console.log(`[${new Date().toISOString()}] Found matching keyword: ${foundKeywordRow.keyword}`);
    
    // جلب الملفات المرفقة
    const mediaRes = await pool.request()
      .input('replayId', sql.Int, foundKeywordRow.replayId)
      .query(`
        SELECT filePath, fileName
        FROM ReplayMedia
        WHERE replayId = @replayId
      `);
    
    // إرسال نص الرد مع التنسيق المحسن
    if (foundKeywordRow.replyText) {
      console.log(`[${new Date().toISOString()}] Sending formatted text reply: ${foundKeywordRow.replyText}`);
      
      // النص مُحفوظ بالفعل بتنسيق WhatsApp، لذا نرسله مباشرة
      const formattedText = foundKeywordRow.replyText;
      
      // إضافة معلومات إضافية إذا لزم الأمر
      const enhancedText = WhatsAppMessageFormatter.addMetadata(formattedText, {
        timestamp: new Date(),
        sessionName: undefined // يمكن إضافة اسم الجلسة هنا إذا كان متاحاً
      });
      
      await client.sendMessage(msg.from, enhancedText);
    }
    
    // إرسال الملفات المرفقة
    for (const mediaFile of mediaRes.recordset) {
      try {
        console.log(`[${new Date().toISOString()}] Reading file from path: ${mediaFile.filePath}`);
        
        // التحقق من وجود الملف
        const fileData = await fs.readFile(mediaFile.filePath);
        const base64 = fileData.toString('base64');
        
        // تحديد نوع الملف
        const fileExtension = path.extname(mediaFile.filePath).toLowerCase();
        let mimeType = 'application/octet-stream';
        
        // تحديد MIME type بناءً على امتداد الملف
        switch (fileExtension) {
          case '.jpg':
          case '.jpeg':
            mimeType = 'image/jpeg';
            break;
          case '.png':
            mimeType = 'image/png';
            break;
          case '.gif':
            mimeType = 'image/gif';
            break;
          case '.mp4':
            mimeType = 'video/mp4';
            break;
          case '.mp3':
            mimeType = 'audio/mpeg';
            break;
          case '.pdf':
            mimeType = 'application/pdf';
            break;
          case '.doc':
            mimeType = 'application/msword';
            break;
          case '.docx':
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
          default:
            console.log(`[${new Date().toISOString()}] Unknown file type: ${fileExtension}, using default MIME type`);
        }
        
        const mediaMsg = new MessageMedia(
          mimeType, 
          base64, 
          mediaFile.fileName || path.basename(mediaFile.filePath)
        );
        
        console.log(`[${new Date().toISOString()}] Sending media message for file: ${mediaFile.filePath}`);
        await client.sendMessage(msg.from, mediaMsg);
        
        // إضافة تأخير قصير بين الملفات لتجنب الحظر
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Failed to read or send file: ${mediaFile.filePath}`, err);
        
        // إرسال رسالة خطأ للمستخدم (اختياري)
        try {
          await client.sendMessage(msg.from, `❌ عذراً، حدث خطأ في إرسال الملف: ${mediaFile.fileName || 'ملف غير معروف'}`);
        } catch (sendError) {
          console.error(`[${new Date().toISOString()}] Failed to send error message:`, sendError);
        }
      }
    }
    
    console.log(`[${new Date().toISOString()}] Finished processing bot keywords.`);
    return true; // تم العثور على كلمة مفتاحية ومعالجتها
  }
  
  console.log(`[${new Date().toISOString()}] No matching keyword found for text: ${text}`);
  return false; // لم يتم العثور على كلمة مفتاحية مطابقة
};

/**
 * دالة مساعدة لإرسال رسالة مع إعادة المحاولة في حالة الفشل
 */
export const sendMessageWithRetry = async (
  client: Client, 
  chatId: string, 
  message: string, 
  maxRetries: number = 3
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(chatId, message);
      console.log(`[${new Date().toISOString()}] Message sent successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to send message on attempt ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        // انتظار متزايد بين المحاولات
        const delay = attempt * 1000;
        console.log(`[${new Date().toISOString()}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[${new Date().toISOString()}] Failed to send message after ${maxRetries} attempts`);
  return false;
};

/**
 * دالة مساعدة لإرسال ملف وسائط مع إعادة المحاولة
 */
export const sendMediaWithRetry = async (
  client: Client, 
  chatId: string, 
  media: MessageMedia, 
  maxRetries: number = 3
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(chatId, media);
      console.log(`[${new Date().toISOString()}] Media sent successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to send media on attempt ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        // انتظار متزايد بين المحاولات
        const delay = attempt * 1000;
        console.log(`[${new Date().toISOString()}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[${new Date().toISOString()}] Failed to send media after ${maxRetries} attempts`);
  return false;
};

