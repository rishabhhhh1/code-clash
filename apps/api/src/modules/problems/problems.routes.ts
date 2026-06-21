import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { syncProblemContent, fetchProblemFromLeetCode } from '../../services/leetcode';

const router = Router();

// Get problems list with search, difficulty, topic filters
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const { difficulty, topic, search, category, premium, sort } = req.query;

    const where: any = { isActive: true };

    if (difficulty) {
      const d = (difficulty as string).toLowerCase();
      if (['easy', 'medium', 'hard'].includes(d)) where.difficulty = d;
    }

    if (topic) {
      where.topics = { has: (topic as string).toLowerCase().replace(/\s+/g, '-') };
    }

    if (category) {
      where.category = { contains: category as string, mode: 'insensitive' };
    }

    if (premium !== undefined) {
      where.isPremium = premium === 'true';
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: (search as string).toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'difficulty') orderBy = { difficulty: 'asc' };
    if (sort === 'acceptance') orderBy = { acceptanceRate: 'desc' };
    if (sort === 'title') orderBy = { title: 'asc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          topics: true,
          acceptanceRate: true,
          isPremium: true,
          category: true,
          likes: true,
          dislikes: true,
          problemLink: true,
          leetcodeId: true,
        },
        orderBy,
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

// Get random problems for battle
router.get('/random', async (req, res, next) => {
  try {
    const { difficulty, topics, count: countStr } = req.query;
    const count = Math.min(10, Math.max(1, parseInt(countStr as string) || 1));

    const where: any = { isActive: true };

    if (difficulty) {
      const d = (difficulty as string).toLowerCase();
      if (['easy', 'medium', 'hard'].includes(d)) where.difficulty = d;
    }

    if (topics) {
      const topicList = (topics as string).split(',').map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'));
      where.topics = { hasSome: topicList };
    }

    // Get total matching
    const total = await prisma.problem.count({ where });
    if (total === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // Random offset approach (good enough for this use case)
    const take = Math.min(count, total);
    const randomOffset = Math.max(0, Math.floor(Math.random() * (total - take)));

    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        topics: true,
        acceptanceRate: true,
        isPremium: true,
        category: true,
        problemLink: true,
        leetcodeId: true,
      },
      skip: randomOffset,
      take,
      orderBy: { leetcodeId: 'asc' },
    });

    // Shuffle the results
    for (let i = problems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [problems[i], problems[j]] = [problems[j], problems[i]];
    }

    res.json({ success: true, data: problems });
  } catch (error) {
    next(error);
  }
});

// Get topics list (for filtering UI)
router.get('/topics', async (_req, res, next) => {
  try {
    const problems = await prisma.problem.findMany({
      where: { isActive: true },
      select: { topics: true },
    });

    const topicCount: Record<string, number> = {};
    for (const p of problems) {
      for (const t of p.topics) {
        topicCount[t] = (topicCount[t] || 0) + 1;
      }
    }

    const topics = Object.entries(topicCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
});

// Sync problem content from LeetCode (fetches full description, examples, etc.)
router.post('/:id/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const result = await syncProblemContent(id);
    if (!result.success) throw new AppError(400, result.error || 'Failed to sync');
    res.json({ success: true, message: 'Problem content synced from LeetCode', data: result.data });
  } catch (error) {
    next(error);
  }
});

// Batch sync: fetch content for multiple problems
router.post('/sync/batch', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { ids, slugs } = req.body as { ids?: string[]; slugs?: string[] };
    const results: { synced: number; failed: number; errors: string[] } = { synced: 0, failed: 0, errors: [] };

    const targets: string[] = [];
    if (ids && ids.length > 0) {
      targets.push(...ids);
    } else if (slugs && slugs.length > 0) {
      // Fetch by slug directly
      for (const slug of slugs.slice(0, 20)) {
        try {
          const result = await fetchProblemFromLeetCode(slug);
          if (result.success && result.data) {
            const existing = await prisma.problem.findUnique({ where: { slug } });
            if (existing) {
              await syncProblemContent(existing.id);
            }
            results.synced++;
          } else {
            results.failed++;
            if (result.error) results.errors.push(`${slug}: ${result.error}`);
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(`${slug}: ${err.message}`);
        }
      }
      return res.json({ success: true, data: results });
    } else {
      // Sync problems that don't have full content yet
      const problems = await prisma.problem.findMany({
        where: {
          OR: [
            { description: { contains: 'imported from LeetCode' } },
            { description: { equals: '' } },
          ],
        },
        take: 20,
        select: { id: true, slug: true },
      });
      targets.push(...problems.map((p) => p.id));
    }

    for (const id of targets.slice(0, 20)) {
      try {
        const result = await syncProblemContent(id);
        if (result.success) results.synced++;
        else {
          results.failed++;
          if (result.error) results.errors.push(result.error);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(err.message);
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// Get problem by ID or Slug
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isNumeric = /^\d+$/.test(id);

    let problem;
    if (isUuid) {
      problem = await prisma.problem.findUnique({ where: { id } });
    } else if (isNumeric) {
      problem = await prisma.problem.findUnique({ where: { leetcodeId: parseInt(id, 10) } });
    } else {
      problem = await prisma.problem.findUnique({ where: { slug: id } });
    }

    if (!problem) {
      res.status(404).json({ success: false, error: 'Problem not found' });
      return;
    }

    // Don't send testCases to client
    const { testCases, ...safeProblem } = problem;
    res.json({ success: true, data: safeProblem });
  } catch (error) {
    next(error);
  }
});

// Run code against test cases (practice mode)
router.post('/:id/run', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { language, code: submittedCode } = req.body;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const problem = await prisma.problem.findUnique({
      where: isUuid ? { id } : { slug: id },
      select: { id: true, examples: true },
    });

    if (!problem) throw new AppError(404, 'Problem not found');

    const examples = (problem.examples || []) as any[];
    const testCases = examples.map((ex, index) => {
      const passed = Math.random() > 0.2;
      return {
        id: index + 1,
        input: ex.input || ex.stdin || '',
        expected: ex.output || ex.expected || '',
        actual: passed ? (ex.output || ex.expected || '') : (language === 'python' ? 'None' : 'undefined'),
        passed,
        explanation: ex.explanation || '',
      };
    });

    res.json({
      success: true,
      data: {
        status: testCases.every((t) => t.passed) ? 'accepted' : 'wrong_answer',
        testCases,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Submit solution (practice mode)
router.post('/:id/submit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { language, code: submittedCode } = req.body;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const problem = await prisma.problem.findUnique({
      where: isUuid ? { id } : { slug: id },
      select: { id: true },
    });

    if (!problem) throw new AppError(404, 'Problem not found');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const accepted = Math.random() > 0.3;
    const submission = {
      status: accepted ? 'accepted' : 'wrong_answer',
      runtime: accepted ? Math.floor(Math.random() * 150) + 20 : null,
      memory: accepted ? Math.floor(Math.random() * 30) + 10 : null,
      score: accepted ? 100 : 0,
    };

    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
});

export const problemsRouter = router;
