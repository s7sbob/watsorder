// src/controllers/session/session.helpers.ts
import * as sql from 'mssql';

/**
 * دالة مساعدة لفحص ملكية session
 */
export async function checkSessionOwnership(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const sessionRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query('SELECT userId FROM Sessions WHERE id = @sessionId');

  if (!sessionRow.recordset.length) {
    throw new Error('SessionNotFound');
  }
  const ownerId = sessionRow.recordset[0].userId;

  // إن لم يكن Admin وتختلف الملكية => منع
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== ownerId) {
    throw new Error('Forbidden');
  }
}
