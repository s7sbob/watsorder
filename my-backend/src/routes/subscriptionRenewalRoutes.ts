import { Router } from 'express';
import { 
  searchSessionsByPhone,
  renewSubscription,
  getAllSubscriptionRenewals,
  updateSubscriptionRenewal,
  deleteSubscriptionRenewal,
  exportSubscriptionRenewals,
  getClientSubscriptionRenewals,
  getSubscriptionAnalytics,
  createSubscriptionRenewal,
  renewSubscriptionAndRecord
} from '../controllers/subscriptionRenewal.controller';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// البحث عن الجلسات برقم التليفون
router.get('/search/:phoneNumber', authenticateToken, searchSessionsByPhone);

// تجديد الاشتراك
router.post('/renew', authenticateToken, renewSubscription);

// الحصول على جميع سجلات الاشتراكات مع فلترة وترتيب النتائج
router.get('/', authenticateToken, getAllSubscriptionRenewals);
router.post('/', authenticateToken, createSubscriptionRenewal)

// تعديل سجل اشتراك
router.post('/update/:id', authenticateToken, updateSubscriptionRenewal);
router.post('/renew', authenticateToken, renewSubscriptionAndRecord)

// حذف سجل اشتراك
router.post('/delete/:id', authenticateToken, deleteSubscriptionRenewal);

// تصدير سجل الاشتراكات بصيغة CSV
router.get('/export', authenticateToken, exportSubscriptionRenewals);

// الحصول على سجلات اشتراكات عميل معين
router.get('/client/:phoneNumber', authenticateToken, getClientSubscriptionRenewals);

// جلب بيانات التحليلات والتقارير
router.get('/analytics', authenticateToken, getSubscriptionAnalytics);

export default router;
