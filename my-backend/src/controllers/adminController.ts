// src/controllers/adminController.ts
import { Request, Response } from 'express';
import { getConnection } from '../config/db';
import * as sql from 'mssql';

/**
 * GET /api/admin/data
 * Returns a flattened list of every renewal,
 * joined with its session and its owning user.
 */
export const getAdminData = async (req: Request, res: Response) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        u.ID            AS userId,
        u.name          AS userName,
        u.phoneNumber   AS userPhone,
        u.companyName   AS userCompany,
        s.id            AS sessionId,
        s.status        AS sessionStatus,
        sr.id           AS renewalId,
        sr.amountPaid,
        sr.newExpireDate,
        sr.renewalDate,
        sr.renewalPeriod,
        sr.status       AS renewalStatus
      FROM SubscriptionRenewals sr
      JOIN Sessions s   ON s.id = sr.sessionId
      JOIN Users u      ON u.ID = s.userId
      ORDER BY u.name, s.id, sr.renewalDate DESC
    `);
    return res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching admin data:', error);
    return res.status(500).json({ message: 'Error fetching admin data.' });
  }
};
