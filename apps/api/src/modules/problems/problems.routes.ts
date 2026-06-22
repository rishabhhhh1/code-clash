import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { syncProblemContent, fetchProblemFromLeetCode } from '../../services/leetcode';
import { ensureProblemGenerated, getVisibleTestCases, getAllTestCases } from '../../services/problem-generator';
import { judgeCode } from '../../services/judge';
import { config } from '../../config';

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
          generationStatus: true,
          totalTestCases: true,
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

    const total = await prisma.problem.count({ where });
    if (total === 0) {
      res.json({ success: true, data: [] });
      return;
    }

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
        generationStatus: true,
      },
      skip: randomOffset,
      take,
      orderBy: { leetcodeId: 'asc' },
    });

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

// Sync problem content from LeetCode
router.post('/:id/sync', async (req, res, next) => {
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
router.post('/sync/batch', async (req, res, next) => {
  try {
    const { ids, slugs } = req.body as { ids?: string[]; slugs?: string[] };
    const results: { synced: number; failed: number; errors: string[] } = { synced: 0, failed: 0, errors: [] };

    const targets: string[] = [];
    if (ids && ids.length > 0) {
      targets.push(...ids);
    } else if (slugs && slugs.length > 0) {
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

// Get problem by ID or Slug (with lazy generation)
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

    // Trigger lazy generation in background if needed
    if (problem.generationStatus === 'pending' || problem.generationStatus === 'failed') {
      // Don't await - let it generate in background
      ensureProblemGenerated(problem.id).catch(err => {
        console.error(`Background generation failed for ${problem.slug}:`, err.message);
      });
    }

    // Don't send hidden test cases or reference solutions to client
    const { hiddenTestCases, referenceSolutions, ...safeProblem } = problem as any;
    res.json({ success: true, data: safeProblem });
  } catch (error) {
    next(error);
  }
});

// Get visible test cases for a problem
router.get('/:id/testcases', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const problem = await prisma.problem.findUnique({
      where: isUuid ? { id } : { slug: id },
      select: { id: true, visibleTestCases: true, generationStatus: true },
    });

    if (!problem) throw new AppError(404, 'Problem not found');

    // Ensure generated
    await ensureProblemGenerated(problem.id);

    const updated = await prisma.problem.findUnique({
      where: { id: problem.id },
      select: { visibleTestCases: true },
    });

    res.json({ success: true, data: updated?.visibleTestCases || [] });
  } catch (error) {
    next(error);
  }
});

// Run code against visible test cases (practice mode) - REAL JUDGE
router.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, code: submittedCode } = req.body;

    if (!submittedCode || !language) {
      throw new AppError(400, 'Code and language are required');
    }

    if (!['cpp', 'java', 'python', 'javascript'].includes(language)) {
      throw new AppError(400, 'Unsupported language. Use cpp, java, python, or javascript.');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const problem = await prisma.problem.findUnique({
      where: isUuid ? { id } : { slug: id },
      select: { id: true, timeLimit: true, memoryLimit: true, visibleTestCases: true, generationStatus: true },
    });

    if (!problem) throw new AppError(404, 'Problem not found');

    // Ensure test cases are generated
    await ensureProblemGenerated(problem.id);

    // Get visible test cases (first 3 for Run mode)
    const visibleCases = await getVisibleTestCases(problem.id);
    const runCases = visibleCases.slice(0, 3);

    if (runCases.length === 0) {
      throw new AppError(400, 'No test cases available for this problem yet');
    }

    // Run the judge
    const result = await judgeCode(
      submittedCode,
      language,
      runCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
      problem.timeLimit,
      problem.memoryLimit
    );

    // Format results for the frontend
    const testResults = result.testResults.map((tr, index) => ({
      id: index + 1,
      input: tr.input,
      expected: tr.expectedOutput,
      actual: tr.actualOutput,
      passed: tr.status === 'accepted',
      status: tr.status,
      runtime: tr.runtime,
      explanation: '',
    }));

    res.json({
      success: true,
      data: {
        status: result.status,
        testCases: testResults,
        compilationOutput: result.compilationOutput,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Submit solution against ALL test cases (practice mode) - REAL JUDGE
router.post('/:id/submit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, code: submittedCode } = req.body;

    if (!submittedCode || !language) {
      throw new AppError(400, 'Code and language are required');
    }

    if (!['cpp', 'java', 'python', 'javascript'].includes(language)) {
      throw new AppError(400, 'Unsupported language. Use cpp, java, python, or javascript.');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const problem = await prisma.problem.findUnique({
      where: isUuid ? { id } : { slug: id },
      select: { id: true, slug: true, timeLimit: true, memoryLimit: true, generationStatus: true },
    });

    if (!problem) throw new AppError(404, 'Problem not found');

    // Ensure test cases are generated
    await ensureProblemGenerated(problem.id);

    // Get ALL test cases (visible + hidden) for submission
    const allCases = await getAllTestCases(problem.id);

    if (allCases.length === 0) {
      throw new AppError(400, 'No test cases available for this problem yet');
    }

    // Run the judge against all test cases
    const result = await judgeCode(
      submittedCode,
      language,
      allCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
      problem.timeLimit,
      problem.memoryLimit
    );

    // Calculate percentile (mock for now - would need historical data)
    const runtimePercentile = result.status === 'accepted'
      ? Math.min(99, Math.floor(Math.random() * 40) + 50)
      : null;

    // Save submission record (need to handle optional battleId)
    let submission;
    let userId = 'anonymous'; // Practice mode - no auth required
    
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch {
        // Invalid token, continue as anonymous
      }
    }

    try {
      submission = await prisma.submission.create({
        data: {
          userId,
          problemId: problem.id,
          code: submittedCode,
          language,
          status: result.status === 'accepted' ? 'accepted' :
                  result.status === 'compilation_error' ? 'compilation_error' :
                  result.status === 'time_limit' ? 'time_limit' :
                  result.status === 'runtime_error' ? 'runtime_error' :
                  result.status === 'memory_limit' ? 'runtime_error' :
                  'wrong_answer',
          runtime: result.totalRuntime,
          memory: result.peakMemory,
          score: result.status === 'accepted' ? 100 : 0,
          testResults: result.testResults as any,
        },
      });

      // Update user stats on accepted submission
      if (result.status === 'accepted' && userId !== 'anonymous') {
        // Check if this is the first time solving this problem
        const existingSubmission = await prisma.submission.findFirst({
          where: {
            userId,
            problemId: problem.id,
            status: 'accepted',
            id: { not: submission.id },
          },
        });

        if (!existingSubmission) {
          // First time solving this problem - update user stats
          await prisma.user.update({
            where: { id: userId },
            data: {
              rating: { increment: 25 }, // ELO rating increase
            },
          });

          console.log(`Updated stats for user ${userId} - solved problem ${problem.slug}`);
        }
      }
    } catch (e) {
      // Submission save is non-critical, continue
    }

    res.json({
      success: true,
      data: {
        submissionId: submission?.id,
        status: result.status,
        runtime: result.totalRuntime,
        memory: result.peakMemory,
        testCasesPassed: result.testResults.filter(tr => tr.status === 'accepted').length,
        totalTestCases: result.testResults.length,
        runtimePercentile,
        compilationOutput: result.compilationOutput,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get generation status for a problem
router.get('/:id/generation-status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const problem = await prisma.problem.findUnique({
      where: isUuid ? { id } : { slug: id },
      select: {
        id: true,
        generationStatus: true,
        generatedAt: true,
        generationError: true,
        totalTestCases: true,
      },
    });

    if (!problem) throw new AppError(404, 'Problem not found');

    res.json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
});

export const problemsRouter = router;
