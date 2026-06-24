import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { getRandomProblems, getProblemUrl, getContestUrl, getDifficultyFromRating, checkUserSolvedProblem, getUserSubmissionsForProblem } from '../../services/codeforces';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateBattleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Topic aliases: map battle-form topic names → possible DB topic strings
const TOPIC_ALIASES: Record<string, string[]> = {
  arrays: ['arrays', 'array'],
  strings: ['strings', 'string'],
  linked_lists: ['linked_lists', 'linked_list'],
  stacks: ['stacks', 'stack'],
  queues: ['queues', 'queue'],
  heaps: ['heaps', 'heap', 'priority_queue'],
  binary_search: ['binary_search'],
  sliding_window: ['sliding_window'],
  greedy: ['greedy'],
  dynamic_programming: ['dynamic_programming', 'dp'],
  trees: ['trees', 'tree', 'binary_tree', 'bst'],
  graphs: ['graphs', 'graph', 'depth_first_search', 'breadth_first_search', 'bfs', 'dfs'],
  backtracking: ['backtracking'],
  bit_manipulation: ['bit_manipulation', 'bits'],
  math: ['math', 'mathematics', 'recursion'],
  intervals: ['intervals', 'interval'],
  two_pointers: ['two_pointers'],
  hash_map: ['hash_map'],
  recursion: ['recursion'],
  depth_first_search: ['depth_first_search', 'dfs'],
  breadth_first_search: ['breadth_first_search', 'bfs'],
  monotonic_stack: ['monotonic_stack'],
  prefix_sum: ['prefix_sum'],
  topological_sort: ['topological_sort'],
  design: ['design'],
  divide_and_conquer: ['divide_and_conquer'],
  sorting: ['sorting'],
};

async function pickProblem(difficulty: string, topics: string[]): Promise<{ contestId: number; index: string } | null> {
  // Map difficulty to rating range
  let minRating: number | undefined;
  let maxRating: number | undefined;
  
  if (difficulty === 'easy') {
    minRating = 800;
    maxRating = 1199;
  } else if (difficulty === 'medium') {
    minRating = 1200;
    maxRating = 1599;
  } else if (difficulty === 'hard') {
    minRating = 1600;
    maxRating = 2400;
  }

  // Expand selected topics using aliases
  const expanded = [...new Set(topics.flatMap((t) => TOPIC_ALIASES[t] ?? [t]))];

  try {
    const problems = await getRandomProblems(1, expanded, minRating, maxRating);
    if (problems.length > 0) {
      return { contestId: problems[0].contestId, index: problems[0].index };
    }
  } catch (error) {
    console.error('Error fetching problem from Codeforces:', error);
  }

  // Fallback: try without topic filter
  try {
    const problems = await getRandomProblems(1, undefined, minRating, maxRating);
    if (problems.length > 0) {
      return { contestId: problems[0].contestId, index: problems[0].index };
    }
  } catch (error) {
    console.error('Error fetching problem from Codeforces (fallback):', error);
  }

  return null;
}

const PROBLEM_SELECT = {
  contestId: true,
  index: true,
  name: true,
  rating: true,
  tags: true,
  points: true,
  type: true,
};

const BATTLE_INCLUDE = {
  creator: { select: { id: true, codeforcesHandle: true, rating: true, rank: true } },
  players: {
    include: {
      user: { select: { id: true, codeforcesHandle: true, avatar: true, rating: true, rank: true } },
    },
    orderBy: { score: 'desc' as const },
  },
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createBattleSchema = z.object({
  body: z.object({
    mode: z.enum(['deathmatch', 'royal', 'bestof3', 'survival', 'speedrun', 'topicdraft', 'chaos']),
    maxPlayers: z.number().min(2).max(100),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    topics: z.array(z.string()).min(1),
    timeControl: z.number().min(1).max(120),
    isPublic: z.boolean().default(true),
  }),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET public lobby (must be before /:code so it doesn't catch "lobby")
router.get('/lobby/public', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [battles, total] = await Promise.all([
      prisma.battle.findMany({
        where: { isPublic: true, status: 'waiting' },
        include: {
          creator: { select: { id: true, codeforcesHandle: true, rating: true } },
          _count: { select: { players: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.battle.count({ where: { isPublic: true, status: 'waiting' } }),
    ]);

    res.json({
      success: true,
      data: { items: battles, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET submission status (must be before /:code)
router.get('/submissions/:submissionId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { submissionId } = req.params;
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, status: true, runtime: true, memory: true, score: true, createdAt: true },
    });
    if (!submission) throw new AppError(404, 'Submission not found');
    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
});

// POST create battle
router.post('/', authenticate, validate(createBattleSchema), async (req: AuthRequest, res, next) => {
  try {
    const { mode, maxPlayers, difficulty, topics, timeControl, isPublic } = req.body;

    // Unique code
    let code = generateBattleCode();
    while (await prisma.battle.findUnique({ where: { code } })) {
      code = generateBattleCode();
    }

    const battle = await prisma.battle.create({
      data: {
        code,
        creatorId: req.user!.id,
        mode,
        maxPlayers,
        difficulty,
        topics,
        timeControl,
        isPublic,
        inviteCode: !isPublic ? randomUUID().substring(0, 8).toUpperCase() : null,
      },
      include: BATTLE_INCLUDE,
    });

    // Add creator as first player
    await prisma.battlePlayer.create({ data: { battleId: battle.id, userId: req.user!.id } });
    await prisma.battle.update({ where: { id: battle.id }, data: { playerCount: 1 } });

    res.status(201).json({ success: true, data: battle });
  } catch (error) {
    next(error);
  }
});

// GET battle by code
router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: BATTLE_INCLUDE,
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    res.json({ success: true, data: battle });
  } catch (error) {
    next(error);
  }
});

// POST start battle (creator only) — picks a problem
router.post('/:code/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (battle.creatorId !== req.user!.id) throw new AppError(403, 'Only the creator can start the battle');
    if (battle.status !== 'waiting') throw new AppError(400, 'Battle has already started');

    const problem = await pickProblem(battle.difficulty, battle.topics);
    if (!problem) {
      throw new AppError(500, 'No problems found for this difficulty/topic combination from Codeforces.');
    }

    const updated = await prisma.battle.update({
      where: { id: battle.id },
      data: {
        status: 'active',
        contestId: problem.contestId,
        problemIndex: problem.index,
        startTime: new Date(),
        endTime: new Date(Date.now() + battle.timeControl * 60 * 1000),
      },
      include: BATTLE_INCLUDE,
    });

    // Fetch problem details from Codeforces
    const problems = await getRandomProblems(1);
    const problemDetails = problems.find((p: any) => p.contestId === problem.contestId && p.index === problem.index);

    const io = req.app.get('io');
    if (io) {
      io.to(`battle:${battle.id}`).emit('battle:started', {
        ...updated,
        problem: problemDetails ? {
          ...problemDetails,
          difficulty: getDifficultyFromRating(problemDetails.rating),
          url: getProblemUrl(problemDetails.contestId, problemDetails.index),
          contestUrl: getContestUrl(problemDetails.contestId),
        } : null,
      });
    }

    res.json({ 
      success: true, 
      data: {
        ...updated,
        problem: problemDetails ? {
          ...problemDetails,
          difficulty: getDifficultyFromRating(problemDetails.rating),
          url: getProblemUrl(problemDetails.contestId, problemDetails.index),
          contestUrl: getContestUrl(problemDetails.contestId),
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST join battle
router.post('/:code/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;
    const { inviteCode } = req.body;

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (battle.status !== 'waiting') throw new AppError(400, 'Battle is not in waiting state');
    if (battle.playerCount >= battle.maxPlayers) throw new AppError(400, 'Battle is full');
    if (!battle.isPublic && battle.inviteCode !== inviteCode) throw new AppError(403, 'Invalid invite code');

    // Already joined — idempotent
    const alreadyJoined = battle.players.find((p) => p.userId === req.user!.id);
    if (alreadyJoined) {
      return res.json({ success: true, message: 'Already in this battle' });
    }

    await prisma.battlePlayer.create({ data: { battleId: battle.id, userId: req.user!.id } });
    await prisma.battle.update({ where: { id: battle.id }, data: { playerCount: { increment: 1 } } });

    res.json({ success: true, message: 'Joined battle successfully' });
  } catch (error) {
    next(error);
  }
});

// POST leave battle
router.post('/:code/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (battle.status === 'active') throw new AppError(400, 'Cannot leave an active battle');

    const player = battle.players.find((p) => p.userId === req.user!.id);
    if (!player) throw new AppError(400, 'Not a member of this battle');

    await prisma.battlePlayer.delete({ where: { id: player.id } });
    await prisma.battle.update({ where: { id: battle.id }, data: { playerCount: { decrement: 1 } } });

    if (battle.creatorId === req.user!.id) {
      const remaining = await prisma.battlePlayer.findMany({
        where: { battleId: battle.id },
        orderBy: { joinedAt: 'asc' },
      });
      if (remaining.length === 0) {
        await prisma.battle.update({ where: { id: battle.id }, data: { status: 'cancelled' } });
      } else {
        await prisma.battle.update({ where: { id: battle.id }, data: { creatorId: remaining[0].userId } });
      }
    }

    res.json({ success: true, message: 'Left battle successfully' });
  } catch (error) {
    next(error);
  }
});

// POST submit solution - tracks submission to Codeforces
router.post('/:code/submit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;
    const { language, code: submittedCode } = req.body;

    if (!submittedCode || !language) {
      throw new AppError(400, 'Code and language are required');
    }

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (battle.status !== 'active') throw new AppError(400, 'Battle is not active');
    if (!battle.contestId || !battle.problemIndex) throw new AppError(400, 'No problem assigned to this battle');

    const player = battle.players.find((p) => p.userId === req.user!.id);
    if (!player) throw new AppError(403, 'You are not a participant in this battle');

    const submission = await prisma.submission.create({
      data: {
        battleId: battle.id,
        userId: req.user!.id,
        contestId: battle.contestId,
        problemIndex: battle.problemIndex,
        code: submittedCode,
        language,
        status: 'pending',
      },
    });

    res.json({ 
      success: true, 
      data: { 
        submissionId: submission.id, 
        status: 'pending',
        message: 'Please submit your solution on Codeforces. Your submission will be tracked automatically.',
        codeforcesUrl: getProblemUrl(battle.contestId, battle.problemIndex),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET check submission status from Codeforces
router.get('/:code/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (!battle.contestId || !battle.problemIndex) throw new AppError(400, 'No problem assigned to this battle');

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) throw new AppError(404, 'User not found');

    // Check if user has solved the problem on Codeforces
    const hasSolved = await checkUserSolvedProblem(user.codeforcesHandle, battle.contestId, battle.problemIndex);

    // Get recent submissions for this problem
    const submissions = await getUserSubmissionsForProblem(user.codeforcesHandle, battle.contestId, battle.problemIndex, 5);

    res.json({
      success: true,
      data: {
        hasSolved,
        submissions: submissions.map(sub => ({
          id: sub.id,
          verdict: sub.verdict,
          programmingLanguage: sub.programmingLanguage,
          timeConsumedMillis: sub.timeConsumedMillis,
          memoryConsumedBytes: sub.memoryConsumedBytes,
          creationTimeSeconds: sub.creationTimeSeconds,
        })),
        codeforcesUrl: getProblemUrl(battle.contestId, battle.problemIndex),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const battlesRouter = router;
