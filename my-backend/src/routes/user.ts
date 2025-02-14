import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser, getSubscriptionLogs } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// GET (عادي)
router.get('/', authenticateToken, getAllUsers);

// POST (عادي) لإنشاء مستخدم جديد
router.post('/', authenticateToken, createUser);

// كان PUT => الآن POST مع مسار /:id/update
router.post('/:id/update', authenticateToken, updateUser);

// كان DELETE => الآن POST مع مسار /:id/delete
router.post('/:id/delete', authenticateToken, deleteUser);

router.get('/:userId/logs', authenticateToken, getSubscriptionLogs);


export default router;
