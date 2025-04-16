import { Router } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import {
  getConfirmedOrdersForUser,
  confirmOrderByRestaurant,
  getOrderDetails,
  rejectOrderByRestaurant
} from '../controllers/orderController'

const router = Router()

// GET (بدون تغيير)
router.get('/confirmed', authenticateToken, getConfirmedOrdersForUser)

// كان router.put('/:orderId/restaurant-confirm' => الآن router.post
router.post('/:orderId/restaurant-confirm', authenticateToken, confirmOrderByRestaurant)

// GET (بدون تغيير)
router.get('/:orderId', authenticateToken, getOrderDetails)

// ** New reject route **
router.post('/:orderId/restaurant-reject', authenticateToken, rejectOrderByRestaurant)


export default router
