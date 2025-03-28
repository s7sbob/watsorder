// src/routes/orderListingRoutes.ts  (مثال)
import { Router } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { getNewOrdersForUser, getAllOrdersForUser, getOrdersByDateRange } from '../controllers/orderListingController'

const router = Router()

// GET /api/orders/new
router.get('/new', authenticateToken, getNewOrdersForUser)

// GET /api/orders/all
router.get('/all', authenticateToken, getAllOrdersForUser)

// GET /api/orders/date-range
router.get('/date-range', authenticateToken, getOrdersByDateRange);

export default router
