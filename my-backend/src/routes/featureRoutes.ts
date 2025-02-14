import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getAllFeatures,
  getUserFeatures,
  addFeatureToUser,
  updateUserFeature,
  deleteUserFeature
} from '../controllers/featureController';

const router = Router();

// جلب كل الميزات المتاحة
router.get('/', authenticateToken, getAllFeatures);

// جلب ميزات مستخدم معيّن
router.get('/user/:userId', authenticateToken, getUserFeatures);

// إضافة ميزة لمستخدم
router.post('/user/:userId', authenticateToken, addFeatureToUser);

// تحديث ميزة مستخدم
router.post('/user-feature/:userFeatureId/update', authenticateToken, updateUserFeature);

// حذف ميزة مستخدم
router.post('/user-feature/:userFeatureId/delete', authenticateToken, deleteUserFeature);

export default router;
