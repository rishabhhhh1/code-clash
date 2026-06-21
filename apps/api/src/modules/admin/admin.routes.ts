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
    const [
      totalUsers,
      totalProblems,
      totalBattles,
      totalSubmissions,
      activeProblems,
      premiumProblems,
      difficultyCounts,
      recentBattles,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.problem.count(),
      prisma.battle.count(),
      prisma.submission.count(),
      prisma.problem.count({ where: { isActive: true } }),
      prisma.problem.count({ where: { isPremium: true } }),
      prisma.problem.groupBy({ by: ['difficulty'], _count: true }),
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
          creator: { select: { username: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, username: true, email: true, createdAt: true, rating: true },
      }),
    ]);

    const difficultyMap: Record<string, number> = {};
    for (const d of difficultyCounts) {
      difficultyMap[d.difficulty] = d._count;
    }

    res.json({
      success: true,
      data: {
        users: totalUsers,
        problems: totalProblems,
        battles: totalBattles,
        submissions: totalSubmissions,
        activeProblems,
        premiumProblems,
        freeProblems: totalProblems - premiumProblems,
        difficultyBreakdown: {
          easy: difficultyMap['easy'] || 0,
          medium: difficultyMap['medium'] || 0,
          hard: difficultyMap['hard'] || 0,
        },
        recentBattles,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Toggle problem active status
router.patch('/problems/:id/toggle', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!problem) throw new AppError(404, 'Problem not found');

    const updated = await prisma.problem.update({
      where: { id },
      data: { isActive: !problem.isActive },
      select: { id: true, title: true, isActive: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Toggle problem premium status
router.patch('/problems/:id/premium', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({ where: { id }, select: { id: true, isPremium: true } });
    if (!problem) throw new AppError(404, 'Problem not found');

    const updated = await prisma.problem.update({
      where: { id },
      data: { isPremium: !problem.isPremium },
      select: { id: true, title: true, isPremium: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete problem (soft delete by deactivating)
router.delete('/problems/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({ where: { id }, select: { id: true } });
    if (!problem) throw new AppError(404, 'Problem not found');

    await prisma.problem.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Problem deactivated' });
  } catch (error) {
    next(error);
  }
});

// Batch toggle premium
router.post('/problems/batch-premium', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { ids, isPremium } = req.body;
    if (!Array.isArray(ids)) throw new AppError(400, 'ids must be an array');

    const result = await prisma.problem.updateMany({
      where: { id: { in: ids } },
      data: { isPremium: !!isPremium },
    });

    res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    next(error);
  }
});

// Batch toggle active
router.post('/problems/batch-active', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { ids, isActive } = req.body;
    if (!Array.isArray(ids)) throw new AppError(400, 'ids must be an array');

    const result = await prisma.problem.updateMany({
      where: { id: { in: ids } },
      data: { isActive: !!isActive },
    });

    res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    next(error);
  }
});

// Admin: list problems with admin info
router.get('/problems', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const skip = (page - 1) * limit;
    const { difficulty, search, active } = req.query;

    const where: any = {};
    if (difficulty) where.difficulty = difficulty;
    if (active !== undefined) where.isActive = active === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: (search as string).toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } },
      ];
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          topics: true,
          isActive: true,
          isPremium: true,
          acceptanceRate: true,
          leetcodeId: true,
          category: true,
        },
        orderBy: { leetcodeId: 'asc' },
        skip,
        take: limit,
      }),
      prisma.problem.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: problems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const adminRouter = router;
