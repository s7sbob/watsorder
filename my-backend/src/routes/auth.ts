// src/routes/auth.ts
import { Router } from 'express';
import { registerUser, loginUser, sendForgotPasswordOtp, resetPassword, verifyForgotPasswordOtp } from '../controllers/authController';

const router = Router();

// مسار التسجيل برقم الموبايل
router.post('/register', registerUser);

// مسار تسجيل الدخول برقم الموبايل
router.post('/login', loginUser);

// Endpoint لإرسال OTP لاستعادة كلمة المرور
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);

// Endpoint لإعادة تعيين كلمة المرور بعد OTP
router.post('/forgot-password/reset', resetPassword);

// New route for verifying OTP
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);

export default router;
