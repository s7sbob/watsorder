// src/controllers/featureAdminController.ts
import { Request, Response } from 'express';
import { poolPromise } from '../config/db';
import * as sql from 'mssql';

/**
 * إنشاء ميزة جديدة في جدول Features
 */
export const createFeature = async (req: Request, res: Response) => {
  // يشترط أن يكون المستخدم admin
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin only.' });
  }

  const { featureKey, featureName } = req.body;
  if (!featureKey || !featureName) {
    return res.status(400).json({ message: 'featureKey and featureName are required.' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('featureKey', sql.NVarChar, featureKey)
      .input('featureName', sql.NVarChar, featureName)
      .query(`
        INSERT INTO Features (featureKey, featureName)
        VALUES (@featureKey, @featureName)
      `);
    return res.status(201).json({ message: 'Feature created successfully.' });
  } catch (error) {
    console.error('Error creating feature:', error);
    return res.status(500).json({ message: 'Error creating feature.' });
  }
};

/**
 * جلب قائمة الميزات
 */
export const getAllFeaturesAdmin = async (req: Request, res: Response) => {
  // يشترط أن يكون المستخدم admin
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin only.' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM Features ORDER BY id DESC`);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching features:', error);
    return res.status(500).json({ message: 'Error fetching features.' });
  }
};

/**
 * تحديث ميزة
 */
export const updateFeature = async (req: Request, res: Response) => {
  // يشترط أن يكون المستخدم admin
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin only.' });
  }

  const { featureId } = req.params;
  const { featureKey, featureName } = req.body;
  if (!featureKey || !featureName) {
    return res.status(400).json({ message: 'featureKey and featureName are required.' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('featureId', sql.Int, parseInt(featureId, 10))
      .input('featureKey', sql.NVarChar, featureKey)
      .input('featureName', sql.NVarChar, featureName)
      .query(`
        UPDATE Features
        SET featureKey = @featureKey,
            featureName = @featureName
        WHERE id = @featureId
      `);

    return res.status(200).json({ message: 'Feature updated successfully.' });
  } catch (error) {
    console.error('Error updating feature:', error);
    return res.status(500).json({ message: 'Error updating feature.' });
  }
};

/**
 * حذف ميزة
 */
export const deleteFeature = async (req: Request, res: Response) => {
  // يشترط أن يكون المستخدم admin
  if (!req.user || req.user.subscriptionType !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin only.' });
  }

  const { featureId } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('featureId', sql.Int, parseInt(featureId, 10))
      .query('DELETE FROM Features WHERE id = @featureId');

    return res.status(200).json({ message: 'Feature deleted successfully.' });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return res.status(500).json({ message: 'Error deleting feature.' });
  }
};
