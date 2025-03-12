// src/routes/user.ts
import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser, getSubAccounts } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// جلب كافة المستخدمين
router.get('/', authenticateToken, getAllUsers);

// جلب الحسابات الفرعية لحساب وكالة معيّن
router.get('/:agencyId/subaccounts', authenticateToken, getSubAccounts);

// إنشاء مستخدم جديد
router.post('/', authenticateToken, createUser);

// تعديل بيانات المستخدم
router.post('/:id/update', authenticateToken, updateUser);

// حذف مستخدم
router.post('/:id/delete', authenticateToken, deleteUser);

export default router;
