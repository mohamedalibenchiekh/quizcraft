import { Router } from 'express';
import { submitAttempt } from '../controllers/attemptController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/submit', authenticateToken, submitAttempt);

export default router;
