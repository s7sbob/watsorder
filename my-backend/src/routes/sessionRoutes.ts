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
  previewGreeting, // إضافة جديدة
  previewKeywordReply // إضافة جديدة
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

// [POST] تحديث رسالة الترحيب (بدلًا من PUT) - مع دعم Rich Text
router.post('/:id/greeting/update', authenticateToken, updateGreeting)

// [GET] جلب رسالة الترحيب - مع معاينة
router.get('/:id/greeting', authenticateToken, getGreeting)

// [POST] معاينة رسالة الترحيب - جديد
router.post('/greeting/preview', authenticateToken, previewGreeting)

// [POST] تحديث حالة البوت (بدلًا من PUT)
router.post('/:id/bot/update', authenticateToken, updateBotStatus)

// [POST] تسجيل الخروج من جلسة (بدلًا من PUT)
router.post('/:id/logout', authenticateToken, logoutSession)

// [POST] تسجيل الدخول مجددًا (بدلًا من PUT)
router.post('/:id/login', authenticateToken, loginSession)

// [POST] تحديث حالة الـ Menu Bot (بدلًا من PUT)
router.post('/:id/menu-bot/update', authenticateToken, updateMenuBotStatus)

//[POST] تحديث حالة الـ E-Commerce Bot (بدلًا من PUT)
router.post('/:id/ecommerce/update', authenticateToken, updateEcommerceStatus);

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
router.post('/:sessionId/category', authenticateToken, uploadProductImage.single('categoryImage'), addCategory)

// [GET] جلب الفئات
router.get('/:sessionId/categories', authenticateToken, getCategoriesForSession)

// [POST] تعديل فئة (بدلًا من PUT)
router.post('/:sessionId/category/:categoryId/update', authenticateToken, uploadProductImage.single('categoryImage'), updateCategory)

// [POST] حذف فئة (بدلًا من DELETE)
router.post('/:sessionId/category/:categoryId/delete', authenticateToken, deleteCategory)

// [POST] إعادة ترتيب الفئات
router.post('/:sessionId/categories/reorder', authenticateToken, reorderCategories)

//----------------------------------
// المنتجات (Products)
//----------------------------------

// [POST] إضافة منتج
router.post('/:sessionId/product', authenticateToken, uploadProductImage.single('productImage'), addProduct)

// [GET] جلب المنتجات
router.get('/:sessionId/products', authenticateToken, getProductsForSession)

// [POST] تعديل منتج (بدلًا من PUT)
router.post('/:sessionId/product/:productId/update', authenticateToken, uploadProductImage.single('productImage'), updateProduct)

// [POST] حذف منتج (بدلًا من DELETE)
router.post('/:sessionId/product/:productId/delete', authenticateToken, deleteProduct)

// [POST] إعادة ترتيب المنتجات
router.post('/:sessionId/products/reorder', authenticateToken, reorderProducts)

//----------------------------------
// الكلمات المفتاحية (Keywords) - مع دعم Rich Text
//----------------------------------

// [POST] إضافة مجموعة كلمات مفتاحية - مع دعم Rich Text
router.post('/:sessionId/keyword', authenticateToken, upload.array('media', 10), addKeyword);

// [GET] جلب الكلمات المفتاحية - مع معاينة
router.get('/:sessionId/keywords', authenticateToken, getKeywordsForSession);

// [POST] تعديل مجموعة الكلمات المفتاحية - مع دعم Rich Text
router.post('/:sessionId/keyword/:keywordId/update', authenticateToken, upload.array('media', 10), updateKeyword);

// [POST] حذف مجموعة الكلمات المفتاحية
router.post('/:sessionId/keyword/:keywordId/delete', authenticateToken, deleteKeyword);

// [POST] معاينة نص الرد للكلمات المفتاحية - جديد
router.post('/keyword/reply/preview', authenticateToken, previewKeywordReply);

//----------------------------------
// إعدادات الجلسة
//----------------------------------

// [GET] جلب إعدادات الجلسة
router.get('/:id/settings', authenticateToken, getSessionSettings)

// [POST] تحديث إعدادات الجلسة
router.post('/:id/settings', authenticateToken, uploadSessionLogo.single('sessionLogo'), updateSessionSettings)

//----------------------------------
// رقم الواتساب البديل
//----------------------------------

router.post('/:sessionId/alternate-whatsapp', authenticateToken, updateAlternateWhatsAppNumber);

//----------------------------------
// المسارات الجديدة للتعديل على حالة الجلسة
//----------------------------------

router.post('/:id/choose-plan', authenticateToken, choosePlan);
router.post('/:id/confirm-payment', authenticateToken, confirmPayment);
router.post('/:id/renew-subscription', authenticateToken, renewSubscription);
router.post('/:id/send-to-manager', authenticateToken, sendToManager);
router.post('/:id/confirm-payment-with-expire', authenticateToken, confirmPaymentWithExpire);
router.post('/create-paid', authenticateToken, createPaidSession);
router.post('/:id/reject-payment', authenticateToken, rejectPayment);

//----------------------------------
// إدارة الجلسات (Admin)
//----------------------------------

router.post('/:id/force-pause', authenticateToken, forcePauseSession);
router.post('/:id/force-start', authenticateToken, forceStartSession);

//----------------------------------
// إثبات الدفع
//----------------------------------

router.get('/:sessionId/payment-proof', authenticateToken, getPaymentProof);
// router.post('/:sessionId/payment-proof', authenticateToken, uploadPaymentProof.single('paymentProof'), submitPaymentProof);

//----------------------------------
// المسارات العامة للتجارة الإلكترونية (بدون مصادقة)
//----------------------------------

router.get('/:sessionId/public/categories', getPublicCategories);
router.get('/:sessionId/public/products', getPublicProducts);
router.get('/:sessionId/public/ecommerce', getPublicEcommerce);

export default router

