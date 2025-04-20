// controllers/session/helpers.ts
import * as sql from 'mssql';
import { getSessionById } from '../../utils/sessionUserChecks';

export async function checkSessionOwnership(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const sessionRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query('SELECT userId FROM Sessions WHERE id = @sessionId');

  if (!sessionRow.recordset.length) {
    throw new Error('SessionNotFound');
  }

  const ownerId = sessionRow.recordset[0].userId;
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== ownerId) {
    throw new Error('Forbidden');
  }
}

export async function checkSessionOwnershipForCatProd(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const session = await getSessionById(pool, sessionId);
  if (!session) throw new Error('SessionNotFound');
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== session.userId) {
    throw new Error('Forbidden');
  }
}

export async function checkSessionOwnershipForKeywords(pool: sql.ConnectionPool, sessionId: number, user: any) {
  const sessRow = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT userId FROM Sessions WHERE id = @sessionId`);

  if (!sessRow.recordset.length) {
    throw new Error('SessionNotFound');
  }

  const ownerId = sessRow.recordset[0].userId;
  if (user.subscriptionType !== 'admin' && user.id !== ownerId) {
    throw new Error('Forbidden');
  }
}
