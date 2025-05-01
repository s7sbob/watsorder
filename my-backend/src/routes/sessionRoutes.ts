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
  getGreeting,
  updateAlternateWhatsAppNumber,
  reorderCategories,
  reorderProducts,
  startQrForSession,
  cancelQrForSession,
  updateEcommerceStatus,
  getSessionSettings,
  updateSessionSettings,
} from '../controllers/session'
import { authenticateToken } from '../middleware/authMiddleware'
import  upload  from '../middleware/uploadMiddleware'
import { getPaymentProof, submitPaymentProof, uploadPaymentProof } from '../controllers/session/paymentProof.controller'
import  uploadProductImage  from '../middleware/uploadProduct'
import  uploadSessionLogo  from '../middleware/uploadSessionLogo'
import { getPublicCategories, getPublicEcommerce, getPublicProducts } from '../controllers/session/publicEcommerce.controller'

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


//[POST] تحديث حالة الـ E-Commerce Bot (بدلًا من PUT)
router.post('/:id/ecommerce/update', authenticateToken, updateEcommerceStatus);  // ← new

// جلب QR (GET عادي)
router.get('/:id/qr', authenticateToken, getQrForSession)

// [POST] بدء عملية توليد QR عند الضغط على زر "Show QR Code"
router.post('/:id/start-qr', authenticateToken, startQrForSession)

// [POST] إلغاء عملية توليد QR وإيقاف الجلسة عند إغلاق المستخدم للـ popup
router.post('/:id/cancel-qr', authenticateToken, cancelQrForSession)

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

// [POST] لل Reorder
router.post('/:sessionId/categories/reorder', authenticateToken, reorderCategories);

//----------------------------------
// المنتجات (Products)
//----------------------------------

// [POST] إضافة منتج
router.post('/:sessionId/product', authenticateToken,uploadProductImage.single('productPhoto'), addProduct)

// [GET] جلب المنتجات
router.get('/:sessionId/products', authenticateToken, getProductsForSession)

// [POST] تعديل منتج (بدلًا من PUT)
router.post('/:sessionId/product/:productId/update', authenticateToken,  uploadProductImage.single('productPhoto'), updateProduct)

// [POST] حذف منتج (بدلًا من DELETE)
router.post('/:sessionId/product/:productId/delete', authenticateToken, deleteProduct)


// session settings
router.get(
  '/:id/settings',
  authenticateToken,
  getSessionSettings
)

router.post(
  '/:id/settings',
  authenticateToken,
  uploadSessionLogo.single('sessionLogo'),
  updateSessionSettings
)



// [POST] لل Reorder
router.post('/:sessionId/products/reorder', authenticateToken, reorderProducts);
//----------------------------------
// الكلمات المفتاحية (Keywords)
//----------------------------------

// [POST] إضافة مجموعة كلمات مفتاحية
router.post('/:sessionId/keyword', authenticateToken, upload.array('media', 10), addKeyword);

// [GET] جلب الكلمات المفتاحية (سيتم تجميعها في الباك إند أو الفرونت)
router.get('/:sessionId/keywords', authenticateToken, getKeywordsForSession);

// [POST] تعديل مجموعة الكلمات المفتاحية باستخدام keywordId
router.post('/:sessionId/keyword/:keywordId/update', authenticateToken, upload.array('media', 10), updateKeyword);

// [POST] حذف مجموعة الكلمات المفتاحية باستخدام keywordId
router.post('/:sessionId/keyword/:keywordId/delete', authenticateToken, deleteKeyword);

router.post('/:sessionId/alternate-whatsapp', authenticateToken, updateAlternateWhatsAppNumber);
router.get('/:id/greeting', authenticateToken, getGreeting);


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
// رفع إثبات الدفع

router.post('/:sessionId/payment-proof', uploadPaymentProof, authenticateToken, submitPaymentProof)

// جلب إثبات الدفع
router.get('/:sessionId/payment-proof',authenticateToken, getPaymentProof)




export default router
