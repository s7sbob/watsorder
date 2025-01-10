import { Router } from 'express';
import {
  fetchSessions,
  createSession,
} from '../controllers/sessionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// جلب الجلسات
router.get('/', authenticateToken, fetchSessions);

// إنشاء جلسة جديدة
router.post('/', authenticateToken, createSession);

export default router;
