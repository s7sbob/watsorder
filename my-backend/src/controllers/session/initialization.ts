// controllers/session/initialization.ts
import { getConnection } from '../../config/db';
import { createWhatsAppClientForSession } from '../whatsappClients';

export const initializeExistingSessions = async () => {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT id, sessionIdentifier
    FROM Sessions
    WHERE status IN ('Connected')
  `);

  for (const record of result.recordset) {
    await createWhatsAppClientForSession(record.id, record.sessionIdentifier);
  }
};
