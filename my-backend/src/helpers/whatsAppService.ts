import { whatsappClients } from '../services/whatsapp/whatsappClientsStore';
import { Client } from 'whatsapp-web.js';

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<void> => {
    const FIXED_SESSION_ID = Number(process.env.FIXED_SESSION_ID );
    const client: Client = whatsappClients[FIXED_SESSION_ID];
  if (!client) {
    throw new Error(`WhatsApp client for session ${FIXED_SESSION_ID} not found`);
  }
  const chatId = `${phoneNumber}@c.us`;
  await client.sendMessage(chatId, message);
};
