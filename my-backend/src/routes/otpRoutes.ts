// src/routes/otpRoutes.ts
import { Router } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { sendOtpViaWhatsApp, sendRegistrationOtp, verifyRegistrationOtp } from '../controllers/otpController'

const router = Router()

// POST /api/otp/send
router.post('/send', authenticateToken, sendOtpViaWhatsApp)
// إرسال OTP للتسجيل
// لا نحتاج توكن؛ لأنها قبل التسجيل
router.post('/send-registration', sendRegistrationOtp);
router.post('/send-registration-otp', sendRegistrationOtp);

// التحقق من OTP
router.post('/verify-registration', verifyRegistrationOtp);
export default router
