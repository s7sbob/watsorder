// controllers/session/initialization.ts
import { poolPromise } from '../../config/db';
import { createWhatsAppClientForSession } from '../whatsappClients';

export const initializeExistingSessions = async () => {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT id, sessionIdentifier
    FROM Sessions
    WHERE status IN ('Connected')
  `);

  for (const record of result.recordset) {
    await createWhatsAppClientForSession(record.id, record.sessionIdentifier);
  }
};
