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
  deleteKeyword,
  choosePlan,
  confirmPayment,
  renewSubscription,
  sendToManager,
  confirmPaymentWithExpire,
  createPaidSession,
  rejectPayment,
  forcePauseSession,
  forceStartSession,
  getGreeting
} from '../controllers/sessionController'
import { authenticateToken } from '../middleware/authMiddleware'
import { upload } from '../middleware/uploadMiddleware'

const router = Router()

//----------------------------------
// جلسات الواتساب
//----------------------------------

// [GET] جلب الجلسات
router.get('/', authenticateToken, fetchSessions)

// [POST] إنشاء جلسة جديدة
router.post('/', authenticateToken, createSession)

// [POST] حذف جلسة (بدلًا من DELETE)
router.post('/:id/delete', authenticateToken, deleteSession)

//----------------------------------
// تحديثات مختلفة على الجلسة
//----------------------------------

// [POST] تحديث رسالة الترحيب (بدلًا من PUT)
router.post('/:id/greeting/update', authenticateToken, updateGreeting)

// [POST] تحديث حالة البوت (بدلًا من PUT)
router.post('/:id/bot/update', authenticateToken, updateBotStatus)

// [POST] تسجيل الخروج من جلسة (بدلًا من PUT)
router.post('/:id/logout', authenticateToken, logoutSession)

// [POST] تسجيل الدخول مجددًا (بدلًا من PUT)
router.post('/:id/login', authenticateToken, loginSession)

// [POST] تحديث حالة الـ Menu Bot (بدلًا من PUT)
router.post('/:id/menu-bot/update', authenticateToken, updateMenuBotStatus)

// جلب QR (GET عادي)
router.get('/:id/qr', authenticateToken, getQrForSession)

//----------------------------------
// إرسال برودكاست (كان POST منذ البداية فلم نغيره)
router.post('/:id/broadcast', authenticateToken, broadcastMessageAPI)

//----------------------------------
// الفئات (Categories)
//----------------------------------

// [POST] إضافة فئة
router.post('/:sessionId/category', authenticateToken, addCategory)

// [GET] جلب الفئات
router.get('/:sessionId/categories', authenticateToken, getCategoriesForSession)

// [POST] تعديل الفئة (بدلًا من PUT)
router.post('/:sessionId/category/:categoryId/update', authenticateToken, updateCategory)

// [POST] حذف الفئة (بدلًا من DELETE)
router.post('/:sessionId/category/:categoryId/delete', authenticateToken, deleteCategory)

//----------------------------------
// المنتجات (Products)
//----------------------------------

// [POST] إضافة منتج
router.post('/:sessionId/product', authenticateToken, addProduct)

// [GET] جلب المنتجات
router.get('/:sessionId/products', authenticateToken, getProductsForSession)

// [POST] تعديل منتج (بدلًا من PUT)
router.post('/:sessionId/product/:productId/update', authenticateToken, updateProduct)

// [POST] حذف منتج (بدلًا من DELETE)
router.post('/:sessionId/product/:productId/delete', authenticateToken, deleteProduct)

//----------------------------------
// الكلمات المفتاحية (Keywords)
//----------------------------------

// [POST] إضافة Keyword (كان POST بالفعل)
router.post('/:sessionId/keyword', authenticateToken, upload.array('media', 10), addKeyword)

// [GET] جلب الـ Keywords
router.get('/:sessionId/keywords', authenticateToken, getKeywordsForSession)

// [POST] تعديل Keyword (بدلًا من PUT)
router.post('/:sessionId/keyword/:keywordId/update', authenticateToken, upload.array('media', 10), updateKeyword)

// [POST] حذف Keyword (بدلًا من DELETE)
router.post('/:sessionId/keyword/:keywordId/delete', authenticateToken, deleteKeyword)


router.get('/:id/greeting', authenticateToken, getGreeting)


// المسارات الجديدة للتعديل على حالة الجلسة:
router.post('/:id/choose-plan', authenticateToken, choosePlan);
router.post('/:id/confirm-payment', authenticateToken, confirmPayment);
router.post('/:id/renew-subscription', authenticateToken, renewSubscription);
router.post('/:id/send-to-manager', authenticateToken, sendToManager);
router.post('/:id/confirm-payment-with-expire', authenticateToken, confirmPaymentWithExpire);
router.post('/create-paid-session', authenticateToken, createPaidSession);
router.post('/:id/reject-payment', authenticateToken, rejectPayment);
router.post('/:id/force-pause', authenticateToken, forcePauseSession)
router.post('/:id/force-start', authenticateToken, forceStartSession)




export default router
