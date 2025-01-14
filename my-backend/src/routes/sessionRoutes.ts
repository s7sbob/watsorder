// src\routes\sessionRoutes.ts
import { Router } from 'express';
import {
  fetchSessions,
  createSession,
  deleteSession,
  addCategory,
  addProduct,
  addKeyword,
  getCategoriesForSession,
  getProductsForSession,
  updateCategory,
  deleteCategory,
  updateProduct,
  deleteProduct,
  getQrForSession,
  updateGreeting,
  updateBotStatus,
  logoutSession,
  loginSession

} from '../controllers/sessionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// جلب الجلسات
router.get('/', authenticateToken, fetchSessions);

// إنشاء جلسة جديدة
router.post('/', authenticateToken, createSession);

// مسارات لإضافة بيانات
router.post('/:sessionId/category', authenticateToken, addCategory);
router.post('/:sessionId/product', authenticateToken, addProduct);
router.post('/:sessionId/keyword', authenticateToken, addKeyword);
router.get('/:sessionId/categories', authenticateToken, getCategoriesForSession);
router.get('/:sessionId/products', authenticateToken, getProductsForSession);

router.put('/:sessionId/category/:categoryId', authenticateToken, updateCategory);
router.delete('/:sessionId/category/:categoryId', authenticateToken, deleteCategory);
router.get('/:id/qr', authenticateToken, getQrForSession);
router.put('/:id/greeting', authenticateToken, updateGreeting);
router.put('/:id/bot', authenticateToken, updateBotStatus)
router.put('/:id/logout', authenticateToken, logoutSession)
router.put('/:id/login', authenticateToken, loginSession)
router.put('/:sessionId/product/:productId', authenticateToken, updateProduct);
router.delete('/:sessionId/product/:productId', authenticateToken, deleteProduct);
// حذف جلسة
router.delete('/:id', authenticateToken, deleteSession);

export default router;
