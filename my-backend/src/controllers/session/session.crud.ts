// src/controllers/session/session.crud.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';

// جلب الجلسات بناءً على المستخدم
export const fetchSessions = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null;
  if (!user) {
    return res.status(401).json({ message: 'User not authorized.' });
  }
  try {
    const pool = await getConnection();
    let query = '';
    
    if (user.subscriptionType === 'admin') {
      query = `SELECT * FROM Sessions`;
    } else {
      query = `SELECT * FROM Sessions WHERE userId = @userId`;
    }
    const request = pool.request();
    if (user.subscriptionType !== 'admin') {
      request.input('userId', sql.Int, user.id);
    }
    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ message: 'Error fetching sessions' });
  }
};

// إنشاء جلسة جديدة
export const createSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null;
  if (!user || !user.id || !user.subscriptionType) {
    return res.status(401).json({ message: 'User not authorized.' });
  }

  try {
    const pool = await getConnection();
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`;

    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, 'Waiting for Plan')
      .input('greetingMessage', sql.NVarChar(sql.MAX), req.body.greetingMessage || null)
      .input('greetingActive', sql.Bit, req.body.greetingActive ? 1 : 0)
      .input('clientName', sql.NVarChar, user.name)
      .query(`
        INSERT INTO Sessions 
          (userId, sessionIdentifier, status, greetingMessage, greetingActive, clientName)
        OUTPUT INSERTED.id
        VALUES 
          (@userId, @sessionIdentifier, @status, @greetingMessage, @greetingActive, @clientName)
      `);

    const newSessionId = insertSessionResult.recordset[0].id;
    return res.status(201).json({
      message: 'Session created successfully in Waiting for Plan state.',
      sessionId: newSessionId
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: 'Error creating session.' });
  }
};

// إنشاء جلسة (مدفوعة)
export const createPaidSession = async (req: Request, res: Response) => {
  const user = req.user && typeof req.user !== 'string' ? req.user : null;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const { planType } = req.body;
  if (!planType) {
    return res.status(400).json({ message: 'Plan type is required.' });
  }

  try {
    const pool = await getConnection();
    const status = 'Paid';
    const sessionIdentifier = `${user.id}.${user.subscriptionType}.${Date.now()}`;

    const insertSessionResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .input('sessionIdentifier', sql.NVarChar, sessionIdentifier)
      .input('status', sql.NVarChar, status)
      .input('planType', sql.NVarChar, planType)
      .input('clientName', sql.NVarChar, user.name)
      .query(`
        INSERT INTO Sessions
          (userId, sessionIdentifier, status, planType, clientName)
        OUTPUT INSERTED.*
        VALUES
          (@userId, @sessionIdentifier, @status, @planType, @clientName)
      `);

    const newSession = insertSessionResult.recordset[0];
    return res.status(201).json({
      message: 'Session created with Paid status.',
      session: newSession
    });
  } catch (error) {
    console.error('Error creating paid session:', error);
    return res.status(500).json({ message: 'Error creating paid session.' });
  }
};
