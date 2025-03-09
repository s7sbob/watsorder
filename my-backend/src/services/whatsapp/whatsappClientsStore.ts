// src/services/whatsapp/whatsappClientsStore.ts
import { Client } from 'whatsapp-web.js';

interface WhatsAppClientMap {
  [sessionId: number]: Client;
}

/**
 * الخريطة الرئيسية لحفظ الجلسات (العملاء) قيد التشغيل
 */
export const whatsappClients: WhatsAppClientMap = {};
