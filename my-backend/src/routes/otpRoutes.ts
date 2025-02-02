// src/routes/otpRoutes.ts
import { Router } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { sendOtpViaWhatsApp } from '../controllers/otpController'

const router = Router()

// POST /api/otp/send
router.post('/send', authenticateToken, sendOtpViaWhatsApp)

export default router
