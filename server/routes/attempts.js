import { Router } from 'express';
import { submitAttempt } from '../controllers/attemptController.js';
import {
  getMyAttempts,
  getMyStats,
  getAttemptById,
} from '../controllers/studentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/submit', authenticateToken, submitAttempt);
router.get('/my', authenticateToken, getMyAttempts);
router.get('/stats', authenticateToken, getMyStats);
router.get('/:id', authenticateToken, getAttemptById);

export default router;
