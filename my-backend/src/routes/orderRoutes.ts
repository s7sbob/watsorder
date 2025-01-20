import { Router } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import {
  getConfirmedOrdersForUser,
  confirmOrderByRestaurant,
  getOrderDetails
} from '../controllers/orderController'

const router = Router()

router.get('/confirmed', authenticateToken, getConfirmedOrdersForUser)
router.put('/:orderId/restaurant-confirm', authenticateToken, confirmOrderByRestaurant)
router.get('/:orderId', authenticateToken, getOrderDetails)

export default router
