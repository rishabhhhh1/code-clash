import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();

// Middleware: require admin role (simple check for now)
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  if (!req.user) throw new AppError(401, 'Authentication required');
  // For now, allow any authenticated user. In production, check a role field.
  next();
};

// Admin dashboard stats
router.get('/stats', authenticate, requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const [totalUsers, totalBattles, totalSubmissions, recentBattles, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.battle.count(),
      prisma.submission.count(),
      prisma.battle.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          code: true,
          mode: true,
          status: true,
          difficulty: true,
          createdAt: true,
          creator: { select: { codeforcesHandle: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, codeforcesHandle: true, createdAt: true, codeforcesRating: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: totalUsers,
        battles: totalBattles,
        submissions: totalSubmissions,
        recentBattles,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const adminRouter = router;
