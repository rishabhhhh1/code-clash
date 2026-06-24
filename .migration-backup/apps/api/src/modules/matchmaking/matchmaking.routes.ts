import { Router } from 'express';
import { z } from 'zod';
import { Room } from '../../models/Room';
import { User } from '../../models/User';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import {
  joinQueue,
  leaveQueue,
  findMatch,
  getQueueStats,
  isInQueue,
} from '../../services/matchmaking.service';
import { uniqueRoomCode, populateUsersMap, serializeRoom } from '../../services/battle.service';
import { serializeRoom as serialize } from '../../utils/serializers';
import { getMatchmakingRange } from '@codeclash/shared';

const router = Router();

const quickMatchSchema = z.object({
  body: z.object({
    preferredDifficulty: z.enum(['easy', 'medium', 'hard', 'all']).default('all'),
    preferredTopics: z.array(z.string()).default([]),
    mode: z.string().default('1v1_duel'),
    maxWaitTime: z.number().min(30).max(300).default(120),
  }),
});

async function createMatchedRoom(entry: ReturnType<typeof joinQueue>, opponent: ReturnType<typeof joinQueue>) {
  leaveQueue(entry.userId);
  leaveQueue(opponent.userId);

  const [userA, userB] = await Promise.all([
    User.findById(entry.userId),
    User.findById(opponent.userId),
  ]);
  if (!userA || !userB) throw new AppError(404, 'User not found');

  const code = await uniqueRoomCode();
  const difficulty =
    entry.preferredDifficulty !== 'all'
      ? entry.preferredDifficulty
      : opponent.preferredDifficulty !== 'all'
        ? opponent.preferredDifficulty
        : 'medium';

  const topics = [...new Set([...entry.preferredTopics, ...opponent.preferredTopics])];

  const room = await Room.create({
    code,
    name: `${userA.codeforcesHandle} vs ${userB.codeforcesHandle}`,
    host: userA._id,
    mode: entry.mode || 'ranked_duel',
    maxPlayers: 2,
    difficulty,
    topics,
    timeControl: 30 * 60,
    isPublic: false,
    players: [
      { user: userA._id, status: 'waiting', joinedAt: new Date() },
      { user: userB._id, status: 'waiting', joinedAt: new Date() },
    ],
  });

  return room;
}

router.post('/quick', authenticate, validate(quickMatchSchema), async (req: AuthRequest, res, next) => {
  try {
    const { preferredDifficulty, preferredTopics, mode, maxWaitTime } = req.body;
    const user = req.user!;

    if (isInQueue(user._id.toString())) {
      throw new AppError(400, 'Already in matchmaking queue');
    }

    const range = getMatchmakingRange(user.rating);
    const entry = joinQueue(user._id.toString(), {
      rating: user.rating,
      preferredTopics,
      preferredDifficulty,
      mode,
    });

    const opponent = findMatch(entry);

    if (opponent) {
      const room = await createMatchedRoom(entry, opponent);
      const usersMap = await populateUsersMap(room);
      const payload = serialize(room, usersMap);
      const io = req.app.get('io');

      io?.to(`user:${entry.userId}`).emit('match:found', { battleCode: room.code, room: payload });
      io?.to(`user:${opponent.userId}`).emit('match:found', { battleCode: room.code, room: payload });

      return res.json({
        success: true,
        data: { status: 'matched', battleCode: room.code, room: payload, ratingRange: range },
      });
    }

    setTimeout(() => {
      if (leaveQueue(user._id.toString())) {
        req.app.get('io')?.to(`user:${user._id}`).emit('match:timeout', {
          message: 'No match found within time limit',
        });
      }
    }, maxWaitTime * 1000);

    res.json({
      success: true,
      data: {
        status: 'searching',
        message: 'Searching for opponent with similar rating...',
        ratingRange: range,
        maxWaitTime,
        queueSize: getQueueStats().totalSize,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', authenticate, (req: AuthRequest, res) => {
  leaveQueue(req.user!._id.toString());
  res.json({ success: true, message: 'Left matchmaking queue' });
});

router.get('/status', authenticate, (req: AuthRequest, res) => {
  const entry = isInQueue(req.user!._id.toString());
  const stats = getQueueStats();
  res.json({
    success: true,
    data: entry
      ? { inQueue: true, queueSize: stats.totalSize }
      : { inQueue: false, queueSize: stats.totalSize },
  });
});

export const matchmakingRouter = router;
