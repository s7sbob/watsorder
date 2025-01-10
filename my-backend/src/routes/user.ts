import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/userController';

const router = Router();

// جلب جميع المستخدمين
router.get('/', getAllUsers);
// إنشاء مستخدم جديد
router.post('/', createUser);
// تعديل بيانات مستخدم
router.put('/:id', updateUser);
// حذف مستخدم
router.delete('/:id', deleteUser);

export default router;
