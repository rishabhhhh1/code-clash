import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();

// For now admin endpoints are protected and minimal
router.get('/health', authenticate, async (req, res, next) => {
  try {
    // Basic health that could be expanded by roles
    res.json({ success: true, message: 'ok' });
  } catch (error) {
    next(error);
  }
});

export const adminRouter = router;
