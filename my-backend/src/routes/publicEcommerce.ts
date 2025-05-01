import { Router } from 'express'
import { 
  getPublicEcommerce, 
  getPublicCategories, 
  getPublicProducts 
} from '../controllers/session/publicEcommerce.controller'
const router = Router()

// GET /api/public/ecommerce/:storeName
router.get('/:storeName',               getPublicEcommerce)
// GET /api/public/ecommerce/:storeName/categories
router.get('/:storeName/categories',    getPublicCategories)
// GET /api/public/ecommerce/:storeName/products
router.get('/:storeName/products',      getPublicProducts)

export default router
