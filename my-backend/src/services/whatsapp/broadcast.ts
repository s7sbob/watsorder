import { Client, MessageMedia } from 'whatsapp-web.js';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';
import WhatsAppMessageFormatter from '../../utils/whatsappMessageFormatter';

interface BroadcastParams {
  sessionId: number;
  message: string;
  mediaFiles?: string[]; // مسارات الملفات المرفقة
  targetNumbers?: string[]; // أرقام محددة للإرسال إليها
  sendToAllCustomers?: boolean; // إرسال لجميع العملاء
}

/**
 * إرسال رسالة برودكاست مع دعم Rich Text
 */
export const broadcastMessage = async (
  client: Client,
  params: BroadcastParams
): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> => {
  const { sessionId, message, mediaFiles = [], targetNumbers = [], sendToAllCustomers = false } = params;
  
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  try {
    console.log(`[${new Date().toISOString()}] Starting broadcast for session ${sessionId}`);
    
    // تحويل الرسالة إلى تنسيق WhatsApp
    const formattedMessage = WhatsAppMessageFormatter.formatForWhatsApp(message);
    
    // التحقق من طول الرسالة
    const lengthValidation = WhatsAppMessageFormatter.validateMessageLength(formattedMessage, 4096);
    if (!lengthValidation.isValid) {
      throw new Error(`رسالة البرودكاست طويلة جداً: ${lengthValidation.message}`);
    }
    
    // إضافة معلومات إضافية للرسالة
    const enhancedMessage = WhatsAppMessageFormatter.addMetadata(formattedMessage, {
      timestamp: new Date(),
      sessionName: undefined // يمكن إضافة اسم الجلسة هنا
    });
    
    // تحديد قائمة الأرقام المستهدفة
    let phoneNumbers: string[] = [];
    
    if (sendToAllCustomers) {
      // جلب جميع أرقام العملاء من قاعدة البيانات
      phoneNumbers = await getAllCustomerNumbers(sessionId);
    } else if (targetNumbers.length > 0) {
      // استخدام الأرقام المحددة
      phoneNumbers = targetNumbers;
    } else {
      throw new Error('يجب تحديد أرقام الهواتف أو تفعيل الإرسال لجميع العملاء');
    }
    
    console.log(`[${new Date().toISOString()}] Broadcasting to ${phoneNumbers.length} numbers`);
    
    // إرسال الرسائل
    for (const phoneNumber of phoneNumbers) {
      try {
        const chatId = `${phoneNumber}@c.us`;
        
        // إرسال الرسالة النصية
        await sendMessageWithRetry(client, chatId, enhancedMessage);
        
        // إرسال الملفات المرفقة إن وجدت
        for (const mediaPath of mediaFiles) {
          try {
            const media = await createMediaFromPath(mediaPath);
            await sendMediaWithRetry(client, chatId, media);
            
            // تأخير قصير بين الملفات
            await delay(500);
          } catch (mediaError) {
            console.error(`[${new Date().toISOString()}] Failed to send media ${mediaPath} to ${phoneNumber}:`, mediaError);
            errors.push(`فشل إرسال الملف ${mediaPath} إلى ${phoneNumber}: ${mediaError}`);
          }
        }
        
        sentCount++;
        console.log(`[${new Date().toISOString()}] Message sent successfully to ${phoneNumber}`);
        
        // تأخير بين الرسائل لتجنب الحظر
        await delay(1000);
        
      } catch (error) {
        failedCount++;
        const errorMessage = `فشل الإرسال إلى ${phoneNumber}: ${error}`;
        errors.push(errorMessage);
        console.error(`[${new Date().toISOString()}] ${errorMessage}`);
      }
    }
    
    // حفظ إحصائيات البرودكاست
    await saveBroadcastStats(sessionId, sentCount, failedCount, enhancedMessage);
    
    console.log(`[${new Date().toISOString()}] Broadcast completed. Sent: ${sentCount}, Failed: ${failedCount}`);
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors
    };
    
} catch (error) {
    console.error(`[${new Date().toISOString()}] Broadcast error:`, error);
    return {
      success: false,
      sentCount,
      failedCount,
      errors: [(error as Error).message || String(error)]
    };
  }

};

/**
 * جلب جميع أرقام العملاء للجلسة
 */
const getAllCustomerNumbers = async (sessionId: number): Promise<string[]> => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT DISTINCT customerPhoneNumber
        FROM Orders
        WHERE sessionId = @sessionId
          AND customerPhoneNumber IS NOT NULL
          AND customerPhoneNumber != ''
        UNION
        SELECT DISTINCT customerPhone
        FROM CustomerInfo
        WHERE sessionId = @sessionId
          AND customerPhone IS NOT NULL
          AND customerPhone != ''
      `);
    
    return result.recordset.map(row => 
      row.customerPhoneNumber || row.customerPhone
    ).filter(phone => phone && phone.trim());
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting customer numbers:`, error);
    return [];
  }
};

/**
 * إنشاء كائن MediaMessage من مسار الملف
 */
const createMediaFromPath = async (filePath: string): Promise<MessageMedia> => {
  const fs = require('fs/promises');
  const path = require('path');
  
  try {
    const fileData = await fs.readFile(filePath);
    const base64 = fileData.toString('base64');
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // تحديد MIME type
    let mimeType = 'application/octet-stream';
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
    }
    
    return new MessageMedia(mimeType, base64, fileName);
  } catch (error) {
    throw new Error(`فشل في قراءة الملف ${filePath}: ${error}`);
  }
};

/**
 * إرسال رسالة مع إعادة المحاولة
 */
const sendMessageWithRetry = async (
  client: Client,
  chatId: string,
  message: string,
  maxRetries: number = 3
): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(chatId, message);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await delay(attempt * 1000);
    }
  }
};

/**
 * إرسال ملف وسائط مع إعادة المحاولة
 */
const sendMediaWithRetry = async (
  client: Client,
  chatId: string,
  media: MessageMedia,
  maxRetries: number = 3
): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(chatId, media);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await delay(attempt * 1000);
    }
  }
};

/**
 * تأخير لفترة محددة
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * حفظ إحصائيات البرودكاست
 */
const saveBroadcastStats = async (
  sessionId: number,
  sentCount: number,
  failedCount: number,
  message: string
): Promise<void> => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('sentCount', sql.Int, sentCount)
      .input('failedCount', sql.Int, failedCount)
      .input('message', sql.NVarChar(sql.MAX), message)
      .input('timestamp', sql.DateTime, new Date())
      .query(`
        INSERT INTO BroadcastHistory (sessionId, sentCount, failedCount, message, timestamp)
        VALUES (@sessionId, @sentCount, @failedCount, @message, @timestamp)
      `);
    
    console.log(`[${new Date().toISOString()}] Broadcast stats saved`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving broadcast stats:`, error);
  }
};

/**
 * جلب تاريخ البرودكاست للجلسة
 */
export const getBroadcastHistory = async (sessionId: number, limit: number = 50): Promise<any[]> => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          id,
          sentCount,
          failedCount,
          message,
          timestamp
        FROM BroadcastHistory
        WHERE sessionId = @sessionId
        ORDER BY timestamp DESC
      `);
    
    return result.recordset.map(row => ({
      id: row.id,
      sentCount: row.sentCount,
      failedCount: row.failedCount,
      message: row.message,
      timestamp: row.timestamp,
      preview: WhatsAppMessageFormatter.generatePreview(row.message)
    }));
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting broadcast history:`, error);
    return [];
  }
};

