import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { ensureProblemGenerated } from '../../services/problem-generator';
import { validateAllTestCases } from '../../services/testcase-validator';

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
    const { difficulty, search, active, generationStatus } = req.query;

    const where: any = {};
    if (difficulty) where.difficulty = difficulty;
    if (active !== undefined) where.isActive = active === 'true';
    if (generationStatus) where.generationStatus = generationStatus;
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
          generationStatus: true,
          generatedAt: true,
          totalTestCases: true,
          generationError: true,
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

// Generate content for a single problem
router.post('/problems/:id/generate', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({ where: { id }, select: { id: true, title: true, generationStatus: true } });
    if (!problem) throw new AppError(404, 'Problem not found');

    if (problem.generationStatus === 'in_progress') {
      throw new AppError(400, 'Generation already in progress for this problem');
    }

    // Start generation in background
    ensureProblemGenerated(id).catch(err => {
      console.error(`Admin-triggered generation failed for ${problem.title}:`, err.message);
    });

    res.json({ success: true, message: `Generation started for: ${problem.title}` });
  } catch (error) {
    next(error);
  }
});

// Batch generate problems
router.post('/problems/generate-batch', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { limit: limitStr, difficulty, force } = req.body;
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 10));

    const where: any = {
      isActive: true,
      OR: [
        { generationStatus: 'pending' },
        { generationStatus: 'failed' },
      ],
    };

    if (difficulty) where.difficulty = difficulty;
    if (force) {
      where.OR = [
        { generationStatus: 'pending' },
        { generationStatus: 'failed' },
        { generationStatus: 'completed' },
      ];
    }

    const problems = await prisma.problem.findMany({
      where,
      select: { id: true, title: true },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    if (problems.length === 0) {
      throw new AppError(400, 'No problems need generation');
    }

    // Start generation in background (non-blocking)
    let started = 0;
    for (const problem of problems) {
      ensureProblemGenerated(problem.id)
        .then(() => { started++; })
        .catch(err => {
          console.error(`Batch generation failed for ${problem.title}:`, err.message);
        });
    }

    res.json({
      success: true,
      message: `Started generation for ${problems.length} problems`,
      data: {
        total: problems.length,
        problems: problems.map(p => ({ id: p.id, title: p.title })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get generation status/progress
router.get('/problems/generation-status', authenticate, requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const [total, pending, inProgress, completed, failed] = await Promise.all([
      prisma.problem.count({ where: { isActive: true } }),
      prisma.problem.count({ where: { isActive: true, generationStatus: 'pending' } }),
      prisma.problem.count({ where: { isActive: true, generationStatus: 'in_progress' } }),
      prisma.problem.count({ where: { isActive: true, generationStatus: 'completed' } }),
      prisma.problem.count({ where: { isActive: true, generationStatus: 'failed' } }),
    ]);

    const byDifficulty = await prisma.problem.groupBy({
      by: ['difficulty', 'generationStatus'],
      _count: true,
      where: { isActive: true },
    });

    res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        completed,
        failed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        byDifficulty,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Validate test cases for a problem
router.post('/problems/:id/validate-testcases', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new AppError(404, 'Problem not found');

    const visible = (problem.visibleTestCases as any[]) || [];
    const hidden = (problem.hiddenTestCases as any[]) || [];
    const all = [...visible, ...hidden];
    const constraints = (problem.constraints as string[]) || [];

    const validation = validateAllTestCases(
      all.map(tc => ({
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || tc.output || '',
        category: tc.category || 'basic',
      })),
      constraints
    );

    res.json({ success: true, data: validation });
  } catch (error) {
    next(error);
  }
});

// Sync single problem from LeetCode
router.post('/problems/:id/sync-leetcode', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { syncProblemContent } = await import('../../services/leetcode');
    
    const result = await syncProblemContent(id);
    if (!result.success) {
      throw new AppError(400, result.error || 'Failed to sync from LeetCode');
    }

    res.json({ 
      success: true, 
      message: 'Problem content synced from LeetCode',
      data: result.data 
    });
  } catch (error) {
    next(error);
  }
});

// Batch sync problems from LeetCode
router.post('/problems/sync-leetcode-batch', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { limit: limitStr, difficulty, force, skipSynced } = req.body;
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const { syncProblemContent } = await import('../../services/leetcode');

    // Find problems that need syncing
    const where: any = { isActive: true };
    
    if (difficulty) where.difficulty = difficulty;
    
    if (!force) {
      where.OR = [
        { description: '' },
        { description: { contains: 'imported from LeetCode' } },
        { description: { contains: 'Problem content not yet loaded' } },
        { description: { lt: '50' } }, // Too short
      ];
    }

    if (skipSynced) {
      where.AND = [
        where.OR,
        { description: { not: '' } },
        { description: { not: { contains: 'imported from LeetCode' } } },
      ];
      delete where.OR;
    }

    const problems = await prisma.problem.findMany({
      where,
      select: { id: true, title: true, slug: true, description: true },
      take: limit,
      orderBy: { leetcodeId: 'asc' },
    });

    if (problems.length === 0) {
      throw new AppError(400, 'No problems found matching criteria');
    }

    // Sync each problem
    const results = {
      total: problems.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as { id: string; title: string; status: string; error?: string }[]
    };

    for (const problem of problems) {
      try {
        const result = await syncProblemContent(problem.id);
        if (result.success) {
          results.synced++;
          results.details.push({ id: problem.id, title: problem.title, status: 'synced' });
        } else {
          results.failed++;
          results.errors.push(`${problem.title}: ${result.error}`);
          results.details.push({ id: problem.id, title: problem.title, status: 'failed', error: result.error });
        }
      } catch (err: any) {
        results.failed++;
        const error = err.message || 'Unknown error';
        results.errors.push(`${problem.title}: ${error}`);
        results.details.push({ id: problem.id, title: problem.title, status: 'failed', error });
      }
    }

    res.json({
      success: true,
      message: `Synced ${results.synced}/${results.total} problems from LeetCode`,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// Get problems with missing content
router.get('/problems/missing-content', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { difficulty } = req.query;
    
    const where: any = {
      isActive: true,
      OR: [
        { description: '' },
        { description: { contains: 'imported from LeetCode' } },
        { description: { contains: 'Problem content not yet loaded' } },
        { description: { lt: '50' } },
      ],
    };

    if (difficulty) where.difficulty = difficulty;

    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        leetcodeId: true,
        description: true,
        generationStatus: true,
      },
      orderBy: { leetcodeId: 'asc' },
      take: 100,
    });

    const total = await prisma.problem.count({ where });

    res.json({
      success: true,
      data: {
        items: problems,
        total,
        showing: problems.length,
      }
    });
  } catch (error) {
    next(error);
  }
});

export const adminRouter = router;
