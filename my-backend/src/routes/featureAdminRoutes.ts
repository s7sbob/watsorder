// src/routes/featureAdminRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  createFeature,
  getAllFeaturesAdmin,
  updateFeature,
  deleteFeature
} from '../controllers/featureAdminController';

const router = Router();

// جلب كل الميزات (Admin only)
router.get('/', authenticateToken, getAllFeaturesAdmin);

// إنشاء ميزة جديدة
router.post('/', authenticateToken, createFeature);

// تعديل ميزة
router.post('/:featureId/update', authenticateToken, updateFeature);

// حذف ميزة
router.post('/:featureId/delete', authenticateToken, deleteFeature);

export default router;
