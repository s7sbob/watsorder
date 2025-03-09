// src/controllers/session/session.plan.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { createWhatsAppClientForSession } from '../whatsappClients';

export const choosePlan = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { planType } = req.body;
  if (!planType) {
    return res.status(400).json({ message: 'Plan type is required.' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('planType', sql.NVarChar, planType)
      .query(`
        UPDATE Sessions
        SET status = 'Waiting for Payment',
            planType = @planType
        WHERE id = @sessionId
      `);
    return res.status(200).json({ message: 'Plan chosen, waiting for payment.' });
  } catch (error) {
    console.error('Error choosing plan:', error);
    return res.status(500).json({ message: 'Error choosing plan.' });
  }
};

export const sendToManager = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Paid'
        WHERE id = @sessionId
      `);
    return res.status(200).json({ message: 'Session marked as Paid. Manager will confirm it.' });
  } catch (error) {
    console.error('Error sending session to manager:', error);
    return res.status(500).json({ message: 'Error sending session to manager.' });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Ready'
        WHERE id = @sessionId
      `);
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`);
    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier;
      await createWhatsAppClientForSession(sessionId, sessionIdentifier);
    }
    return res.status(200).json({ message: 'Payment confirmed, session is now ready.' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ message: 'Error confirming payment.' });
  }
};


export const rejectPayment = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10)
  try {
    const pool = await getConnection()
    
    // يكفي التحقق من ملكية الجلسة أو أن المستخدم مدير
    // checkSessionOwnership(pool, sessionId, req.user) 
    // أو فقط السماح لمن هو admin

    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET status = 'Payment Rejected'
        WHERE id = @sessionId
      `)

    return res.status(200).json({ message: 'Payment rejected successfully.' })
  } catch (error) {
    console.error('Error rejecting payment:', error)
    return res.status(500).json({ message: 'Error rejecting payment.' })
  }
}



export const confirmPaymentWithExpire = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { newExpireDate } = req.body;
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `);
    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT sessionIdentifier FROM Sessions WHERE id = @sessionId`);
    if (result.recordset.length > 0) {
      const sessionIdentifier = result.recordset[0].sessionIdentifier;
      await createWhatsAppClientForSession(sessionId, sessionIdentifier);
    }
    return res.status(200).json({ message: 'Payment confirmed and expire date set. Session is now ready.' });
  } catch (error) {
    console.error('Error confirming payment with expire date:', error);
    return res.status(500).json({ message: 'Error confirming payment with expire date.' });
  }
};



export const renewSubscription = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const { newExpireDate } = req.body;
  if (!newExpireDate) {
    return res.status(400).json({ message: 'New expire date is required.' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @newExpireDate
        WHERE id = @sessionId
      `);
    return res.status(200).json({ message: 'Subscription renewed, session is now ready.' });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return res.status(500).json({ message: 'Error renewing subscription.' });
  }
};
