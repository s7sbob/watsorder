// src/routes/registrationNotification.routes.ts
import { Router } from 'express';
import registrationNotificationController from '../controllers/registrationNotification.controller';

const router = Router();

// ربط الكونترولر بمسار أساسي (مثلاً: /registration-notification)
router.use('/registration-notification', registrationNotificationController);

export default router;
