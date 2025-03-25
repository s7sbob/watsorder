import { Request, Response } from 'express';
import { getConnection } from '../config/db';
import * as sql from 'mssql';

// جلب كل خطط الأسعار
export const getPricingPlans = async (req: Request, res: Response): Promise<Response> => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`SELECT * FROM PricingPlans`);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    return res.status(500).json({ message: 'خطأ داخلي أثناء جلب خطط الأسعار' });
  }
};

// إنشاء خطة سعر جديدة
export const createPricingPlan = async (req: Request, res: Response): Promise<Response> => {
  const { planType, i18nKey, price, features } = req.body;
  if (!planType || price == null) {
    return res.status(400).json({ message: 'يجب ملء الحقول: planType و price' });
  }
  try {
    const pool = await getConnection();
    // تخزين المميزات كنص JSON (يمكنك تعديل ذلك حسب الحاجة)
    const featuresStr = features ? JSON.stringify(features) : null;
    await pool.request()
      .input('planType', sql.NVarChar, planType)
      .input('i18nKey', sql.NVarChar, i18nKey || null)
      .input('price', sql.Int, price)
      .input('features', sql.NVarChar, featuresStr)
      .query(`INSERT INTO PricingPlans (planType, i18nKey, price, features)
              VALUES (@planType, @i18nKey, @price, @features)`);
    return res.status(201).json({ message: 'تم إنشاء خطة الأسعار بنجاح' });
  } catch (error) {
    console.error('Error creating pricing plan:', error);
    return res.status(500).json({ message: 'خطأ داخلي أثناء إنشاء خطة الأسعار' });
  }
};

// تحديث خطة سعر موجودة
export const updatePricingPlan = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { planType, i18nKey, price, features } = req.body;
  if (!id || !planType || price == null) {
    return res.status(400).json({ message: 'يجب ملء الحقول: id, planType و price' });
  }
  try {
    const pool = await getConnection();
    const featuresStr = features ? JSON.stringify(features) : null;
    await pool.request()
      .input('id', sql.Int, id)
      .input('planType', sql.NVarChar, planType)
      .input('i18nKey', sql.NVarChar, i18nKey || null)
      .input('price', sql.Int, price)
      .input('features', sql.NVarChar, featuresStr)
      .query(`UPDATE PricingPlans 
              SET planType = @planType, i18nKey = @i18nKey, price = @price, features = @features 
              WHERE id = @id`);
    return res.status(200).json({ message: 'تم تحديث خطة الأسعار بنجاح' });
  } catch (error) {
    console.error('Error updating pricing plan:', error);
    return res.status(500).json({ message: 'خطأ داخلي أثناء تحديث خطة الأسعار' });
  }
};

// حذف خطة سعر
export const deletePricingPlan = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'id مطلوب' });
  }
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM PricingPlans WHERE id = @id`);
    return res.status(200).json({ message: 'تم حذف خطة الأسعار بنجاح' });
  } catch (error) {
    console.error('Error deleting pricing plan:', error);
    return res.status(500).json({ message: 'خطأ داخلي أثناء حذف خطة الأسعار' });
  }
};
