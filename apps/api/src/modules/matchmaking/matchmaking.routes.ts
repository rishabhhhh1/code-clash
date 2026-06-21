import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

const router = Router();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const quickMatchSchema = z.object({
  body: z.object({
    preferredDifficulty: z.enum(['easy', 'medium', 'hard', 'any']).default('any'),
    preferredTopics: z.array(z.string()).default([]),
    maxWaitTime: z.number().min(30).max(300).default(60), // seconds
  }),
});

const skillMatchSchema = z.object({
  body: z.object({
    mode: z.enum(['ranked', 'casual']).default('casual'),
    preferredDifficulty: z.enum(['easy', 'medium', 'hard', 'any']).default('any'),
    preferredTopics: z.array(z.string()).default([]),
  }),
});

// Topic aliases for matching
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

// In-memory matchmaking queue
interface MatchmakingEntry {
  userId: string;
  username: string;
  rating: number;
  preferredDifficulty: string;
  preferredTopics: string[];
  mode: 'ranked' | 'casual' | 'quick';
  joinedAt: Date;
  socketId?: string;
}

const matchmakingQueue: Map<string, MatchmakingEntry> = new Map();

// ---------------------------------------------------------------------------
// Helper: Generate battle code
// ---------------------------------------------------------------------------

function generateBattleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------------------------------------------------------------------
// Helper: Find compatible opponent
// ---------------------------------------------------------------------------

function findCompatibleOpponent(entry: MatchmakingEntry): MatchmakingEntry | null {
  for (const [userId, candidate] of matchmakingQueue) {
    if (userId === entry.userId) continue;

    // Check rating compatibility (within 200 points for ranked)
    if (entry.mode === 'ranked') {
      const ratingDiff = Math.abs(entry.rating - candidate.rating);
      if (ratingDiff > 200) continue;
    }

    // Check topic compatibility
    if (entry.preferredTopics.length > 0 && candidate.preferredTopics.length > 0) {
      const hasOverlap = entry.preferredTopics.some(t => candidate.preferredTopics.includes(t));
      if (!hasOverlap) continue;
    }

    // Check difficulty compatibility
    if (entry.preferredDifficulty !== 'any' && candidate.preferredDifficulty !== 'any') {
      if (entry.preferredDifficulty !== candidate.preferredDifficulty) continue;
    }

    return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper: Create match between two players
// ---------------------------------------------------------------------------

async function createMatch(
  player1: MatchmakingEntry,
  player2: MatchmakingEntry,
  io: any
): Promise<string | null> {
  // Remove both from queue
  matchmakingQueue.delete(player1.userId);
  matchmakingQueue.delete(player2.userId);

  // Determine difficulty
  let difficulty = 'medium';
  if (player1.preferredDifficulty !== 'any' && player2.preferredDifficulty !== 'any') {
    difficulty = player1.preferredDifficulty;
  } else if (player1.preferredDifficulty !== 'any') {
    difficulty = player1.preferredDifficulty;
  } else if (player2.preferredDifficulty !== 'any') {
    difficulty = player2.preferredDifficulty;
  }

  // Determine topics
  const topics = [...new Set([...player1.preferredTopics, ...player2.preferredTopics])];
  if (topics.length === 0) {
    topics.push('arrays', 'strings'); // default topics
  }

  // Generate unique code
  let code = generateBattleCode();
  while (await prisma.battle.findUnique({ where: { code } })) {
    code = generateBattleCode();
  }

  // Create battle
  const battle = await prisma.battle.create({
    data: {
      code,
      creatorId: player1.userId,
      mode: player1.mode === 'ranked' ? 'deathmatch' : 'bestof3',
      maxPlayers: 2,
      difficulty,
      topics,
      timeControl: player1.mode === 'ranked' ? 15 : 10,
      isPublic: false,
      status: 'active',
    },
    include: {
      creator: { select: { id: true, username: true, rating: true, rank: true } },
      players: {
        include: {
          user: { select: { id: true, username: true, avatar: true, rating: true, rank: true } },
        },
        orderBy: { score: 'desc' as const },
      },
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          description: true,
          examples: true,
          constraints: true,
          topics: true,
          timeLimit: true,
          memoryLimit: true,
        },
      },
    },
  });

  // Add both players
  await prisma.battlePlayer.createMany({
    data: [
      { battleId: battle.id, userId: player1.userId },
      { battleId: battle.id, userId: player2.userId },
    ],
  });

  await prisma.battle.update({
    where: { id: battle.id },
    data: { playerCount: 2 },
  });

  // Pick a problem
  const expandedTopics = [...new Set(topics.flatMap(t => TOPIC_ALIASES[t] ?? [t]))];
  const problems = await prisma.problem.findMany({
    where: {
      difficulty,
      topics: { hasSome: expandedTopics },
    },
    select: { id: true },
  });

  if (problems.length > 0) {
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    await prisma.battle.update({
      where: { id: battle.id },
      data: {
        problemId: randomProblem.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + battle.timeControl * 60 * 1000),
      },
    });
  }

  // Fetch updated battle
  const updatedBattle = await prisma.battle.findUnique({
    where: { id: battle.id },
    include: {
      creator: { select: { id: true, username: true, rating: true, rank: true } },
      players: {
        include: {
          user: { select: { id: true, username: true, avatar: true, rating: true, rank: true } },
        },
        orderBy: { score: 'desc' as const },
      },
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          description: true,
          examples: true,
          constraints: true,
          topics: true,
          timeLimit: true,
          memoryLimit: true,
        },
      },
    },
  });

  // Notify both players via WebSocket
  if (io) {
    io.to(`user:${player1.userId}`).emit('match:found', { battle: updatedBattle });
    io.to(`user:${player2.userId}`).emit('match:found', { battle: updatedBattle });
  }

  console.log(`Match created: ${player1.username} vs ${player2.username} (${code})`);
  return battle.code;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST quick match - find an opponent quickly
router.post('/quick', authenticate, validate(quickMatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const { preferredDifficulty, preferredTopics, maxWaitTime } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, rating: true },
    });

    if (!user) throw new AppError(404, 'User not found');

    // Check if already in queue
    if (matchmakingQueue.has(user.id)) {
      throw new AppError(400, 'Already in matchmaking queue');
    }

    // Add to queue
    const entry: MatchmakingEntry = {
      userId: user.id,
      username: user.username,
      rating: user.rating,
      preferredDifficulty,
      preferredTopics,
      mode: 'quick',
      joinedAt: new Date(),
    };

    matchmakingQueue.set(user.id, entry);

    // Try to find immediate match
    const opponent = findCompatibleOpponent(entry);
    if (opponent) {
      const io = req.app.get('io');
      const battleCode = await createMatch(entry, opponent, io);
      if (battleCode) {
        return res.json({
          success: true,
          data: {
            status: 'matched',
            battleCode,
            message: 'Match found! Joining battle...',
          },
        });
      }
    }

    // No immediate match - start waiting
    const waitInterval = setInterval(async () => {
      const currentEntry = matchmakingQueue.get(user.id);
      if (!currentEntry) {
        clearInterval(waitInterval);
        return;
      }

      // Check wait time
      const elapsed = (Date.now() - currentEntry.joinedAt.getTime()) / 1000;
      if (elapsed >= maxWaitTime) {
        matchmakingQueue.delete(user.id);
        clearInterval(waitInterval);
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${user.id}`).emit('match:timeout', {
            message: 'No match found within time limit',
          });
        }
        return;
      }

      // Try to find match
      const newOpponent = findCompatibleOpponent(currentEntry);
      if (newOpponent) {
        clearInterval(waitInterval);
        const io = req.app.get('io');
        const battleCode = await createMatch(currentEntry, newOpponent, io);
        if (battleCode) {
          io.to(`user:${user.id}`).emit('match:found', { battleCode });
        }
      }
    }, 3000);

    res.json({
      success: true,
      data: {
        status: 'searching',
        message: 'Searching for opponents...',
        maxWaitTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST skill-based match (ranked or casual)
router.post('/skill', authenticate, validate(skillMatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const { mode, preferredDifficulty, preferredTopics } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, rating: true },
    });

    if (!user) throw new AppError(404, 'User not found');

    // Check if already in queue
    if (matchmakingQueue.has(user.id)) {
      throw new AppError(400, 'Already in matchmaking queue');
    }

    // Add to queue
    const entry: MatchmakingEntry = {
      userId: user.id,
      username: user.username,
      rating: user.rating,
      preferredDifficulty,
      preferredTopics,
      mode,
      joinedAt: new Date(),
    };

    matchmakingQueue.set(user.id, entry);

    // Try to find immediate match
    const opponent = findCompatibleOpponent(entry);
    if (opponent) {
      const io = req.app.get('io');
      const battleCode = await createMatch(entry, opponent, io);
      if (battleCode) {
        return res.json({
          success: true,
          data: {
            status: 'matched',
            battleCode,
            message: `Match found! ${mode === 'ranked' ? 'Competitive' : 'Casual'} battle ready.`,
          },
        });
      }
    }

    // No immediate match - start waiting with expanding search
    const maxWaitTime = mode === 'ranked' ? 120 : 60;
    const waitInterval = setInterval(async () => {
      const currentEntry = matchmakingQueue.get(user.id);
      if (!currentEntry) {
        clearInterval(waitInterval);
        return;
      }

      const elapsed = (Date.now() - currentEntry.joinedAt.getTime()) / 1000;
      if (elapsed >= maxWaitTime) {
        matchmakingQueue.delete(user.id);
        clearInterval(waitInterval);
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${user.id}`).emit('match:timeout', {
            message: `No ${mode} match found within time limit`,
          });
        }
        return;
      }

      // Expand rating range over time for ranked matches
      if (mode === 'ranked' && elapsed > 30) {
        // Allow wider rating range after 30 seconds
        const expandedEntry = { ...currentEntry, rating: currentEntry.rating };
        matchmakingQueue.set(user.id, expandedEntry);
      }

      const newOpponent = findCompatibleOpponent(currentEntry);
      if (newOpponent) {
        clearInterval(waitInterval);
        const io = req.app.get('io');
        const battleCode = await createMatch(currentEntry, newOpponent, io);
        if (battleCode) {
          io.to(`user:${user.id}`).emit('match:found', { battleCode });
        }
      }
    }, 3000);

    res.json({
      success: true,
      data: {
        status: 'searching',
        mode,
        message: `Searching for ${mode} opponents...`,
        maxWaitTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST cancel matchmaking
router.post('/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const removed = matchmakingQueue.delete(req.user!.id);
    if (removed) {
      res.json({ success: true, message: 'Matchmaking cancelled' });
    } else {
      throw new AppError(400, 'Not in matchmaking queue');
    }
  } catch (error) {
    next(error);
  }
});

// GET matchmaking status
router.get('/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const entry = matchmakingQueue.get(req.user!.id);
    if (entry) {
      const elapsed = (Date.now() - entry.joinedAt.getTime()) / 1000;
      res.json({
        success: true,
        data: {
          status: 'searching',
          mode: entry.mode,
          elapsed: Math.floor(elapsed),
          preferredDifficulty: entry.preferredDifficulty,
          preferredTopics: entry.preferredTopics,
        },
      });
    } else {
      res.json({
        success: true,
        data: { status: 'idle' },
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET queue stats (admin/debug)
router.get('/stats', async (req, res, next) => {
  try {
    const entries = Array.from(matchmakingQueue.values());
    const stats = {
      totalInQueue: entries.length,
      byMode: {
        quick: entries.filter(e => e.mode === 'quick').length,
        ranked: entries.filter(e => e.mode === 'ranked').length,
        casual: entries.filter(e => e.mode === 'casual').length,
      },
      byDifficulty: {
        easy: entries.filter(e => e.preferredDifficulty === 'easy').length,
        medium: entries.filter(e => e.preferredDifficulty === 'medium').length,
        hard: entries.filter(e => e.preferredDifficulty === 'hard').length,
        any: entries.filter(e => e.preferredDifficulty === 'any').length,
      },
      averageWaitTime: entries.length > 0
        ? Math.floor(entries.reduce((acc, e) => acc + (Date.now() - e.joinedAt.getTime()) / 1000, 0) / entries.length)
        : 0,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export { router as matchmakingRouter };
