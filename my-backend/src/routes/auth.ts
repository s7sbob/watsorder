// src/routes/auth.ts
import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = Router();

// مسار التسجيل برقم الموبايل
router.post('/register', registerUser);

// مسار تسجيل الدخول برقم الموبايل
router.post('/login', loginUser);

export default router;
