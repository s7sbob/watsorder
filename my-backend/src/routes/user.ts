import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();


router.get('/',authenticateToken, getAllUsers);
router.post('/',authenticateToken, createUser);
router.put('/:id',authenticateToken, updateUser);
router.delete('/:id',authenticateToken, deleteUser);

export default router;
