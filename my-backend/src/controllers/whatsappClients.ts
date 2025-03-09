// src/controllers/whatsappClients.ts
import { whatsappClients } from '../services/whatsapp/whatsappClientsStore';
import { scheduleOrderTimeout, clearOrderTimeout } from '../services/whatsapp/orderTimeouts';
import {
  getCustomerName,
  saveCustomerName,
  getCustomerAddresses,
  saveCustomerAddress
} from '../services/whatsapp/customerInfo';
import { createWhatsAppClientForSession } from '../services/whatsapp/createClient';
import { broadcastMessage } from '../services/whatsapp/broadcast';

// نعيد التصدير كما هو
export {
  whatsappClients,
  scheduleOrderTimeout,
  clearOrderTimeout,
  getCustomerName,
  saveCustomerName,
  getCustomerAddresses,
  saveCustomerAddress,
  createWhatsAppClientForSession,
  broadcastMessage
};
