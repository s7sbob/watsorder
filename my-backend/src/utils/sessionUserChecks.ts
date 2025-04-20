import * as sql from 'mssql';

export async function getSessionById(pool: sql.ConnectionPool, sessionId: number) {
  const result = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query('SELECT * FROM Sessions WHERE id = @sessionId');
  return result.recordset[0] || null;
}

export async function getUserById(pool: sql.ConnectionPool, userId: number) {
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query('SELECT * FROM Users WHERE ID = @userId');
  return result.recordset[0] || null;
}

export async function checkSessionOwnership(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const session = await getSessionById(pool, sessionId);
  if (!session) throw new Error('SessionNotFound');
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== session.userId) {
    throw new Error('Forbidden');
  }
  return session;
}