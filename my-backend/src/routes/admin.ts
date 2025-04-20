// src/routes/admin.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { getAdminData } from '../controllers/adminController';

const router = Router();

// All admin endpoints under /api/admin/*
router.get('/data', authenticateToken, getAdminData);

export default router;
