// src/routes/config.routes.ts
import { Router } from 'express';
import { getPaymentInstructions, updatePaymentInstructions } from '../controllers/PaymentInstructions.Controller';
import { getPricingPlans, createPricingPlan, updatePricingPlan, deletePricingPlan } from '../controllers/PricingPlan.Controller';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// مسارات تعليمات الدفع
router.get('/payment-instructions', getPaymentInstructions);
router.post('/payment-instructions', updatePaymentInstructions);

// مسارات خطط الأسعار
router.get('/pricing-plans', authenticateToken, getPricingPlans);
router.post('/pricing-plans', authenticateToken, createPricingPlan);
router.put('/pricing-plans/:id', authenticateToken, updatePricingPlan);
router.delete('/pricing-plans/:id', authenticateToken, deletePricingPlan);

export default router;
