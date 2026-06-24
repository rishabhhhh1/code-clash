import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Room } from '../../models/Room';
import { User } from '../../models/User';
import { Submission } from '../../models/Submission';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import {
  uniqueRoomCode,
  assignFairProblem,
  canStartBattle,
  populateUsersMap,
  toProblemPayload,
  generateInviteCode,
  getRequiredPlayers,
  finalizeBattle,
} from '../../services/battle.service';
import { startSubmissionTracker, checkPlayerStatus } from '../../services/submission-tracker.service';
import { serializeRoom } from '../../utils/serializers';
import { getProblemUrl } from '../../services/codeforces';

const router = Router();

const BATTLE_MODES = [
  '1v1_duel', 'ranked_duel', 'unranked_duel', 'deathmatch', 'multiplayer',
  'public_room', 'private_room', 'topic_battle', 'battle_royale', 'arena',
] as const;

const createBattleSchema = z.object({
  body: z.object({
    mode: z.enum(BATTLE_MODES).default('1v1_duel'),
    maxPlayers: z.number().min(2).max(100).default(2),
    difficulty: z.enum(['easy', 'medium', 'hard', 'all']).default('medium'),
    topics: z.array(z.string()).default([]),
    timeControl: z.number().min(5).max(120).default(30),
    isPublic: z.boolean().default(true),
    joinApproval: z.boolean().default(false),
    name: z.string().optional(),
  }),
});

router.get('/lobby/public', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      isPublic: true,
      status: { $in: ['waiting', 'starting', 'active'] },
    };

    const [rooms, total, onlineCount, topPlayers, recentWinners] = await Promise.all([
      Room.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Room.countDocuments(filter),
      User.countDocuments({ isOnline: true }),
      User.find().sort({ battleWins: -1 }).limit(5),
      User.find({ battleWins: { $gt: 0 } }).sort({ updatedAt: -1 }).limit(5),
    ]);

    const serialized = await Promise.all(
      rooms.map(async (room) => {
        const usersMap = await populateUsersMap(room);
        return serializeRoom(room, usersMap);
      })
    );

    res.json({
      success: true,
      data: {
        items: serialized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          onlinePlayers: onlineCount,
          activeBattles: await Room.countDocuments({ status: 'active' }),
          waitingBattles: await Room.countDocuments({ status: 'waiting' }),
        },
        topPlayers: topPlayers.map((u) => ({
          id: u._id.toString(),
          codeforcesHandle: u.codeforcesHandle,
          rating: u.rating,
          battleWins: u.battleWins,
          winStreak: u.winStreak,
        })),
        recentWinners: recentWinners.map((u) => ({
          id: u._id.toString(),
          codeforcesHandle: u.codeforcesHandle,
          battleWins: u.battleWins,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/lobby/feed', async (_req, res, next) => {
  try {
    const recent = await Room.find({ status: { $in: ['active', 'completed'] } })
      .sort({ updatedAt: -1 })
      .limit(10);

    const feed = await Promise.all(
      recent.map(async (room) => {
        const usersMap = await populateUsersMap(room);
        const winner = room.winner ? usersMap.get(room.winner.toString()) : null;
        return {
          code: room.code,
          mode: room.mode,
          status: room.status,
          playerCount: room.players.length,
          winner: winner?.codeforcesHandle,
        };
      })
    );

    res.json({ success: true, data: feed });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, validate(createBattleSchema), async (req: AuthRequest, res, next) => {
  try {
    const { mode, maxPlayers, difficulty, topics, timeControl, isPublic, joinApproval, name } =
      req.body;

    const code = await uniqueRoomCode();
    const hostId = req.user!._id;

    const room = await Room.create({
      code,
      name: name || `${req.user!.codeforcesHandle}'s Battle`,
      host: hostId,
      mode,
      maxPlayers,
      difficulty,
      topics: topics.length ? topics : [],
      timeControl: timeControl * 60,
      isPublic,
      inviteCode: !isPublic ? generateInviteCode() : undefined,
      joinApproval,
      players: [{
        user: hostId,
        status: 'waiting',
        joinedAt: new Date(),
      }],
    });

    const usersMap = await populateUsersMap(room);
    res.status(201).json({ success: true, data: serializeRoom(room, usersMap) });
  } catch (error) {
    next(error);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');

    const usersMap = await populateUsersMap(room);
    const serialized = serializeRoom(room, usersMap);
    const problem = await toProblemPayload(serialized.contestId, serialized.problemIndex);

    res.json({ success: true, data: { ...serialized, problem } });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { inviteCode } = req.body ?? {};
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');
    if (room.status !== 'waiting') throw new AppError(400, 'Battle is not in waiting state');
    if (room.players.length >= room.maxPlayers) throw new AppError(400, 'Battle is full');
    if (!room.isPublic && room.inviteCode !== inviteCode) {
      throw new AppError(403, 'Invalid invite code');
    }

    const userId = req.user!._id;
    const alreadyJoined = room.players.some((p) => p.user.equals(userId));
    if (alreadyJoined) {
      return res.json({ success: true, message: 'Already in this battle' });
    }

    if (room.joinApproval && !room.host.equals(userId)) {
      if (!room.pendingPlayers.some((id) => id.equals(userId))) {
        room.pendingPlayers.push(userId);
        await room.save();

        const io = req.app.get('io');
        io?.to(`room:${room.code}`).emit('room:join_request', {
          userId: userId.toString(),
          username: req.user!.codeforcesHandle,
        });
        io?.to(`user:${room.host.toString()}`).emit('room:join_request', {
          userId: userId.toString(),
          username: req.user!.codeforcesHandle,
          roomCode: room.code,
        });

        return res.json({ success: true, message: 'Join request sent. Waiting for host approval.' });
      }
      return res.json({ success: true, message: 'Join request already pending' });
    }

    room.players.push({ user: userId, status: 'waiting', joinedAt: new Date() });
    await room.save();

    const usersMap = await populateUsersMap(room);
    const payload = serializeRoom(room, usersMap);

    const io = req.app.get('io');
    io?.to(`room:${room.code}`).emit('battle:player_joined', {
      userId: userId.toString(),
      username: req.user!.codeforcesHandle,
      room: payload,
    });

    res.json({ success: true, message: 'Joined battle successfully', data: payload });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/approve', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.body;
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');
    if (!room.host.equals(req.user!._id)) throw new AppError(403, 'Only host can approve');

    const pendingId = new Types.ObjectId(userId);
    room.pendingPlayers = room.pendingPlayers.filter((id) => !id.equals(pendingId));

    if (room.players.length < room.maxPlayers) {
      room.players.push({ user: pendingId, status: 'waiting', joinedAt: new Date() });
    }
    await room.save();

    const usersMap = await populateUsersMap(room);
    const io = req.app.get('io');
    io?.to(`user:${userId}`).emit('room:approved', { roomCode: room.code });
    io?.to(`room:${room.code}`).emit('battle:player_joined', { userId, room: serializeRoom(room, usersMap) });

    res.json({ success: true, data: serializeRoom(room, usersMap) });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.body;
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');
    if (!room.host.equals(req.user!._id)) throw new AppError(403, 'Only host can reject');

    const rejectId = new Types.ObjectId(userId);
    room.pendingPlayers = room.pendingPlayers.filter((id) => !id.equals(rejectId));
    await room.save();

    req.app.get('io')?.to(`user:${userId}`).emit('room:rejected', { roomCode: room.code });
    res.json({ success: true, message: 'Join request rejected' });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/ready', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');

    const player = room.players.find((p) => p.user.equals(req.user!._id));
    if (!player) throw new AppError(403, 'Not a participant');

    player.status = 'ready';
    await room.save();

    const usersMap = await populateUsersMap(room);
    const payload = serializeRoom(room, usersMap);
    req.app.get('io')?.to(`room:${room.code}`).emit('room:ready_update', payload);

    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/unready', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');

    const player = room.players.find((p) => p.user.equals(req.user!._id));
    if (!player) throw new AppError(403, 'Not a participant');

    player.status = 'waiting';
    await room.save();

    const usersMap = await populateUsersMap(room);
    const payload = serializeRoom(room, usersMap);
    req.app.get('io')?.to(`room:${room.code}`).emit('room:ready_update', payload);

    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');
    if (!room.host.equals(req.user!._id)) throw new AppError(403, 'Only the host can start');

    const check = await canStartBattle(room);
    if (!check.ok) throw new AppError(400, check.reason!);

    room.status = 'starting';
    await room.save();

    const io = req.app.get('io');
    io?.to(`room:${room.code}`).emit('battle:countdown', { seconds: 5 });

    await new Promise((r) => setTimeout(r, 5000));

    await assignFairProblem(room);
    room.status = 'active';
    room.startedAt = new Date();
    room.currentRound = 0;
    room.players.forEach((p) => {
      if (p.status === 'ready') p.status = 'playing';
    });
    await room.save();

    const usersMap = await populateUsersMap(room);
    const serialized = serializeRoom(room, usersMap);
    const problem = await toProblemPayload(serialized.contestId, serialized.problemIndex);

    startSubmissionTracker(io, room._id.toString());

    io?.to(`room:${room.code}`).emit('battle:started', { ...serialized, problem });
    io?.to(`room:${room.code}`).emit('feed:event', {
      type: 'start',
      message: 'Battle has begun! Same problem for all players.',
      problem: problem?.name,
    });

    res.json({ success: true, data: { ...serialized, problem } });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');
    if (room.status === 'active') throw new AppError(400, 'Cannot leave an active battle');

    const userId = req.user!._id;
    room.players = room.players.filter((p) => !p.user.equals(userId));
    room.pendingPlayers = room.pendingPlayers.filter((id) => !id.equals(userId));

    if (room.host.equals(userId) && room.players.length > 0) {
      room.host = room.players[0].user;
    } else if (room.players.length === 0) {
      room.status = 'cancelled';
    }

    await room.save();

    req.app.get('io')?.to(`room:${room.code}`).emit('battle:player_left', {
      userId: userId.toString(),
      username: req.user!.codeforcesHandle,
    });

    res.json({ success: true, message: 'Left battle successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/submit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');
    if (room.status !== 'active') throw new AppError(400, 'Battle is not active');

    const currentProblem = room.problems[room.currentRound] || room.problems[0];
    if (!currentProblem) throw new AppError(400, 'No problem assigned');

    const isPlayer = room.players.some((p) => p.user.equals(req.user!._id));
    if (!isPlayer) throw new AppError(403, 'Spectators cannot submit');

    await Submission.create({
      room: room._id,
      user: req.user!._id,
      problemContestId: currentProblem.contestId,
      problemIndex: currentProblem.index,
      language: 'codeforces',
      verdict: 'pending',
    });

    res.json({
      success: true,
      data: {
        status: 'pending',
        message: 'Open this problem on Codeforces and submit from your account. CodeClash tracks your verdict automatically.',
        codeforcesUrl: getProblemUrl(currentProblem.contestId, currentProblem.index),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:code/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = await checkPlayerStatus(req.params.code, req.user!._id.toString());
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/spectate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) throw new AppError(404, 'Battle not found');

    const userId = req.user!._id;
    const isPlayer = room.players.some((p) => p.user.equals(userId));
    if (isPlayer) throw new AppError(400, 'Players cannot spectate their own battle');

    if (!room.spectators.some((id) => id.equals(userId))) {
      room.spectators.push(userId);
      await room.save();
    }

    const usersMap = await populateUsersMap(room);
    res.json({ success: true, data: serializeRoom(room, usersMap) });
  } catch (error) {
    next(error);
  }
});

export const battlesRouter = router;
