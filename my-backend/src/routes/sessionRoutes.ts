// src/routes/sessionRoutes.ts
import { Router } from 'express'
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
  loginSession,
  updateMenuBotStatus, 
  broadcastMessageAPI,
  getKeywordsForSession,
  updateKeyword,
  deleteKeyword
} from '../controllers/sessionController'
import { authenticateToken } from '../middleware/authMiddleware'

const router = Router()

// جلب الجلسات
router.get('/', authenticateToken, fetchSessions)

// إنشاء جلسة جديدة
router.post('/', authenticateToken, createSession)

// إضافة فئة
router.post('/:sessionId/category', authenticateToken, addCategory)
// جلب الفئات
router.get('/:sessionId/categories', authenticateToken, getCategoriesForSession)
// تحديث فئة
router.put('/:sessionId/category/:categoryId', authenticateToken, updateCategory)
// حذف فئة
router.delete('/:sessionId/category/:categoryId', authenticateToken, deleteCategory)

// إضافة منتج
router.post('/:sessionId/product', authenticateToken, addProduct)
// جلب المنتجات
router.get('/:sessionId/products', authenticateToken, getProductsForSession)
// تحديث منتج
router.put('/:sessionId/product/:productId', authenticateToken, updateProduct)
// حذف منتج
router.delete('/:sessionId/product/:productId', authenticateToken, deleteProduct)

// routes for Keywords
router.post('/:sessionId/keyword', authenticateToken, addKeyword)
router.get('/:sessionId/keywords', authenticateToken, getKeywordsForSession)
router.put('/:sessionId/keyword/:keywordId', authenticateToken, updateKeyword)
router.delete('/:sessionId/keyword/:keywordId', authenticateToken, deleteKeyword)

// جلب QR
router.get('/:id/qr', authenticateToken, getQrForSession)
// تحديث Greeting
router.put('/:id/greeting', authenticateToken, updateGreeting)
// تحديث حالة البوت
router.put('/:id/bot', authenticateToken, updateBotStatus)
// تسجيل الخروج من جلسة
router.put('/:id/logout', authenticateToken, logoutSession)
// تسجيل الدخول مجددًا
router.put('/:id/login', authenticateToken, loginSession)

router.post('/:id/broadcast', authenticateToken, broadcastMessageAPI)



// حذف جلسة
router.delete('/:id', authenticateToken, deleteSession)


router.put('/:id/menu-bot', authenticateToken, updateMenuBotStatus)


export default router
