// src/controllers/featureController.ts

import { Request, Response } from 'express';
import { getConnection } from '../config/db';
import * as sql from 'mssql';

// 1) جلب كل الميزات العامة
export const getAllFeatures = async (_req: Request, res: Response) => {
  try {
    // (تحقق إن كنت تريد السماح فقط للـ admin)
    const pool = await getConnection();
    const result = await pool.request().query(`SELECT * FROM Features`);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching features' });
  }
};

// 2) جلب ميزات مستخدم
export const getUserFeatures = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT uf.*, f.featureKey, f.featureName
        FROM UserFeatures uf
        JOIN Features f ON uf.featureId = f.id
        WHERE uf.userId = @userId
      `);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching user features' });
  }
};

// 3) إضافة ميزة لمستخدم
export const addFeatureToUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { featureId, startDate, endDate } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('featureId', sql.Int, featureId)
      .input('startDate', sql.DateTime, new Date(startDate))
      .input('endDate', sql.DateTime, endDate ? new Date(endDate) : null)
      .query(`
        INSERT INTO UserFeatures (userId, featureId, startDate, endDate, isActive)
        VALUES (@userId, @featureId, @startDate, @endDate, 1)
      `);
    return res.status(201).json({ message: 'Feature added to user.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error adding feature to user' });
  }
};

// 4) تحديث ميزة مستخدم
export const updateUserFeature = async (req: Request, res: Response) => {
  const { userFeatureId } = req.params;
  const { isActive, startDate, endDate } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('userFeatureId', sql.Int, userFeatureId)
      .input('isActive', sql.Bit, isActive ? 1 : 0)
      .input('startDate', sql.DateTime, new Date(startDate))
      .input('endDate', sql.DateTime, endDate ? new Date(endDate) : null)
      .query(`
        UPDATE UserFeatures
        SET isActive = @isActive,
            startDate = @startDate,
            endDate = @endDate,
            updatedAt = GETDATE()
        WHERE id = @userFeatureId
      `);
    return res.status(200).json({ message: 'UserFeature updated' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating user feature' });
  }
};

// 5) حذف ميزة مستخدم
export const deleteUserFeature = async (req: Request, res: Response) => {
  const { userFeatureId } = req.params;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('userFeatureId', sql.Int, userFeatureId)
      .query(`
        DELETE FROM UserFeatures
        WHERE id = @userFeatureId
      `);
    return res.status(200).json({ message: 'Feature removed from user' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting user feature' });
  }
};
