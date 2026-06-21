import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

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

async function pickProblem(difficulty: string, topics: string[]): Promise<string | null> {
  // Expand selected topics using aliases
  const expanded = [...new Set(topics.flatMap((t) => TOPIC_ALIASES[t] ?? [t]))];

  // Primary: match difficulty + any of expanded topics + active only
  const matched = await prisma.problem.findMany({
    where: { difficulty, topics: { hasSome: expanded }, isActive: true },
    select: { id: true },
  });
  if (matched.length > 0) {
    return matched[Math.floor(Math.random() * matched.length)].id;
  }

  // Fallback: only match difficulty + active only
  const fallback = await prisma.problem.findMany({
    where: { difficulty, isActive: true },
    select: { id: true },
  });
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)].id;
  }

  return null;
}

const PROBLEM_SELECT = {
  id: true,
  title: true,
  slug: true,
  difficulty: true,
  description: true,
  inputFormat: true,
  outputFormat: true,
  examples: true,
  constraints: true,
  hints: true,
  topics: true,
  timeLimit: true,
  memoryLimit: true,
  acceptanceRate: true,
  problemLink: true,
  starterCodeCpp: true,
  starterCodeJava: true,
  starterCodePython: true,
  starterCodeJavaScript: true,
};

const BATTLE_INCLUDE = {
  creator: { select: { id: true, username: true, rating: true, rank: true } },
  players: {
    include: {
      user: { select: { id: true, username: true, avatar: true, rating: true, rank: true } },
    },
    orderBy: { score: 'desc' as const },
  },
  problem: { select: PROBLEM_SELECT },
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
          creator: { select: { id: true, username: true, rating: true } },
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

    const problemId = await pickProblem(battle.difficulty, battle.topics);
    if (!problemId) {
      throw new AppError(500, 'No problems found for this difficulty/topic combination. Please ensure the database is seeded.');
    }

    const updated = await prisma.battle.update({
      where: { id: battle.id },
      data: {
        status: 'active',
        problemId,
        startTime: new Date(),
        endTime: new Date(Date.now() + battle.timeControl * 60 * 1000),
      },
      include: BATTLE_INCLUDE,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`battle:${battle.id}`).emit('battle:started', updated);
    }

    res.json({ success: true, data: updated });
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

// POST submit solution
router.post('/:code/submit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;
    const { language, code: submittedCode } = req.body;

    const battle = await prisma.battle.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (battle.status !== 'active') throw new AppError(400, 'Battle is not active');
    if (!battle.problemId) throw new AppError(400, 'No problem assigned to this battle');

    const player = battle.players.find((p) => p.userId === req.user!.id);
    if (!player) throw new AppError(403, 'You are not a participant in this battle');

    const submission = await prisma.submission.create({
      data: {
        battleId: battle.id,
        userId: req.user!.id,
        problemId: battle.problemId,
        code: submittedCode,
        language,
        status: 'pending',
      },
    });

    // Simulate judge asynchronously
    setTimeout(async () => {
      try {
        const accepted = Math.random() > 0.35; // 65% accept rate for demo
        const updatedSubmission = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: accepted ? 'accepted' : 'wrong_answer',
            runtime: accepted ? Math.floor(Math.random() * 200) + 30 : null,
            memory: accepted ? Math.floor(Math.random() * 40) + 8 : null,
            score: accepted ? 100 : 0,
          },
        });

        if (accepted) {
          await prisma.battlePlayer.update({
            where: { id: player.id },
            data: { score: { increment: 100 }, problemsSolved: { increment: 1 } },
          });
        }

        // Get updated player list for the leaderboard
        const updatedPlayers = await prisma.battlePlayer.findMany({
          where: { battleId: battle.id },
          include: {
            user: { select: { id: true, username: true, avatar: true, rating: true, rank: true } },
          },
          orderBy: { score: 'desc' },
        });

        const io = req.app.get('io');
        if (io) {
          io.to(`battle:${battle.id}`).emit('submission:result', {
            submission: updatedSubmission,
            userId: req.user!.id,
            username: req.user!.username,
            players: updatedPlayers,
          });
        }
      } catch (e) {
        console.error('Judge simulation error:', e);
      }
    }, 2500);

    res.json({ success: true, data: { submissionId: submission.id, status: 'pending' } });
  } catch (error) {
    next(error);
  }
});

// POST run code (sandbox simulation)
router.post('/:code/run', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code: battleCode } = req.params;
    const { language, code: submittedCode } = req.body;

    const battle = await prisma.battle.findUnique({
      where: { code: battleCode.toUpperCase() },
      include: { problem: true },
    });

    if (!battle) throw new AppError(404, 'Battle not found');
    if (!battle.problem) throw new AppError(400, 'No problem assigned to this battle');

    // Wait 1.5s to simulate run
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const examples = (battle.problem!.examples || []) as any[];
    const testCases = examples.map((ex, index) => {
      const passed = Math.random() > 0.2; // 80% pass rate for Run
      return {
        id: index + 1,
        input: ex.input,
        expected: ex.output,
        actual: passed ? ex.output : (language === 'python' ? 'None' : 'undefined'),
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

export const battlesRouter = router;
