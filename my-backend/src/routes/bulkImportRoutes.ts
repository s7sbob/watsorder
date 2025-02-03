// src/routes/bulkImportRoutes.ts

import { Router } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { bulkAddCategoriesAndProducts } from '../controllers/bulkImportController'

const router = Router()

// يفضل POST /api/bulk-import/:sessionId
router.post('/:sessionId', authenticateToken, bulkAddCategoriesAndProducts)

export default router
