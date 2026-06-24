import { Router } from 'express';
import { z } from 'zod';
import { Battle } from '../../models/Battle';
import { Problem } from '../../models/Problem';
import { Submission } from '../../models/Submission';
import { User } from '../../models/User';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { generateBattleCode } from '../../utils/helpers';
import { serializeBattle } from '../../utils/serializers';
import { BATTLE_MODES } from '../../utils/constants';

const router = Router();

const createBattleSchema = z.object({
  body: z.object({
    mode: z.enum(['deathmatch', 'best_of_3', 'survival', 'speedrun', 'topic_draft', 'chaos', 'battle_royale']),
    maxPlayers: z.number().min(2).max(100).default(2),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    topics: z.array(z.string()).optional(),
    isPublic: z.boolean().default(true),
  }),
});

const joinBattleSchema = z.object({
  body: z.object({
    battleCode: z.string(),
  }),
});

const submitCodeSchema = z.object({
  body: z.object({
    code: z.string(),
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'go', 'rust']),
  }),
});

// Create a new battle
router.post('/', authenticate, validate(createBattleSchema), async (req: AuthRequest, res, next) => {
  try {
    const code = generateBattleCode();

    // Select random problem based on difficulty and topics
    const query: any = { difficulty: req.body.difficulty, isActive: true };
    if (req.body.topics && req.body.topics.length > 0) {
      query.topics = { $in: req.body.topics };
    }

    const problem = await Problem.findOne(query);
    if (!problem) {
      throw new AppError(404, 'No problems found matching criteria');
    }

    const battle = await Battle.create({
      code,
      creatorId: req.user!._id,
      mode: req.body.mode,
      maxPlayers: req.body.maxPlayers,
      difficulty: req.body.difficulty,
      topics: req.body.topics || [],
      isPublic: req.body.isPublic,
      problemId: problem._id,
      participants: [req.user!._id],
      playerCount: 1,
      status: 'waiting',
      leaderboard: [
        {
          userId: req.user!._id,
          rank: 1,
          score: 0,
          attempts: 0,
          status: 'pending',
        },
      ],
    });

    res.status(201).json({ success: true, data: serializeBattle(battle) });
  } catch (error) {
    next(error);
  }
});

// Get battle details
router.get('/:code', async (req, res, next) => {
  try {
    const battle = await Battle.findOne({ code: req.params.code })
      .populate('creatorId')
      .populate('problemId')
      .populate('participants');

    if (!battle) {
      throw new AppError(404, 'Battle not found');
    }

    res.json({ success: true, data: serializeBattle(battle) });
  } catch (error) {
    next(error);
  }
});

// Join battle
router.post('/:code/join', authenticate, validate(joinBattleSchema), async (req: AuthRequest, res, next) => {
  try {
    const battle = await Battle.findOne({ code: req.params.code });
    if (!battle) {
      throw new AppError(404, 'Battle not found');
    }

    if (battle.status !== 'waiting') {
      throw new AppError(400, 'Battle has already started');
    }

    if (battle.playerCount >= battle.maxPlayers) {
      throw new AppError(400, 'Battle is full');
    }

    if (battle.participants.includes(req.user!._id)) {
      throw new AppError(400, 'Already joined this battle');
    }

    battle.participants.push(req.user!._id);
    battle.playerCount = battle.participants.length;
    battle.leaderboard.push({
      userId: req.user!._id,
      rank: battle.playerCount,
      score: 0,
      attempts: 0,
      status: 'pending',
    });

    await battle.save();

    // Emit socket event to notify others
    const io = res.app.get('io');
    io.to(`battle_${battle.code}`).emit('battle:player_joined', {
      userId: req.user!._id,
      username: req.user!.username,
      playerCount: battle.playerCount,
    });

    res.json({ success: true, data: serializeBattle(battle) });
  } catch (error) {
    next(error);
  }
});

// Start battle
router.post('/:code/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const battle = await Battle.findOne({ code: req.params.code });
    if (!battle) {
      throw new AppError(404, 'Battle not found');
    }

    if (battle.creatorId.toString() !== req.user!._id.toString()) {
      throw new AppError(403, 'Only battle creator can start');
    }

    if (battle.status !== 'waiting') {
      throw new AppError(400, 'Battle already started');
    }

    battle.status = 'active';
    battle.startTime = new Date();
    await battle.save();

    const io = res.app.get('io');
    io.to(`battle_${battle.code}`).emit('battle:started', {
      startTime: battle.startTime,
      timeLimit: battle.timeLimit,
    });

    res.json({ success: true, data: serializeBattle(battle) });
  } catch (error) {
    next(error);
  }
});

// Submit code
router.post('/:code/submit', authenticate, validate(submitCodeSchema), async (req: AuthRequest, res, next) => {
  try {
    const battle = await Battle.findOne({ code: req.params.code });
    if (!battle) {
      throw new AppError(404, 'Battle not found');
    }

    if (battle.status !== 'active') {
      throw new AppError(400, 'Battle is not active');
    }

    const submission = await Submission.create({
      battleId: battle._id,
      userId: req.user!._id,
      problemId: battle.problemId,
      code: req.body.code,
      language: req.body.language,
      status: 'pending',
    });

    // Emit socket event for real-time update
    const io = res.app.get('io');
    io.to(`battle_${battle.code}`).emit('submission:received', {
      userId: req.user!._id,
      submissionId: submission._id,
    });

    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
});

// Get public lobby
router.get('/lobby/public', async (req, res, next) => {
  try {
    const battles = await Battle.find({
      isPublic: true,
      status: 'waiting',
    })
      .populate('creatorId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        activeBattles: battles.map(serializeBattle),
        onlinePlayers: await User.countDocuments({ isOnline: true }),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const battlesRouter = router;
