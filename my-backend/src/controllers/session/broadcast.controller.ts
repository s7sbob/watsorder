// controllers/session/broadcast.controller.ts
import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';
import { broadcastMessage, whatsappClients } from '../whatsappClients';

export const broadcastMessageAPI = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  if (!sessionId) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const pool = await poolPromise;
    await checkSessionOwnership(pool, sessionId, req.user);

    // استخراج البيانات من request body
    const { message, mediaFiles, targetNumbers, sendToAllCustomers } = req.body;

    // التحقق من وجود الرسالة
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required.' });
    }

    // الحصول على WhatsApp client للجلسة - استخدام bracket notation بدلاً من .get()
    const client = whatsappClients[sessionId];
    if (!client) {
      return res.status(400).json({ 
        message: 'WhatsApp client not found for this session. Please ensure the session is connected.' 
      });
    }

    // تحضير معاملات البرودكاست
    const broadcastParams = {
      sessionId,
      message,
      mediaFiles: mediaFiles || [],
      targetNumbers: targetNumbers || [],
      sendToAllCustomers: sendToAllCustomers || false
    };

    // إرسال البرودكاست
    const result = await broadcastMessage(client, broadcastParams);

    // إرجاع النتيجة
    return res.status(200).json({
      success: result.success,
      message: result.success ? 'Broadcast completed successfully' : 'Broadcast completed with some failures',
      data: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        totalTargets: result.sentCount + result.failedCount,
        errors: result.errors
      }
    });

  } catch (error: any) {
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    
    console.error('Broadcast API error:', error);
    return res.status(500).json({ 
      message: 'Error broadcasting message.',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
