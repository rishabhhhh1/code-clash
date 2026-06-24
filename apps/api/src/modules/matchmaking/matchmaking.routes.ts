import { Router } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { findMatchingOpponent, getRecommendedDifficulty } from '../../services/matchmaking';
import { generateBattleCode } from '../../utils/helpers';
import { Battle } from '../../models/Battle';
import { Problem } from '../../models/Problem';
import { serializeBattle } from '../../utils/serializers';

const router = Router();

// Start quick match
router.post('/quick', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const difficulty = getRecommendedDifficulty(user.rating);

    // Try to find matching opponent
    const opponentId = await findMatchingOpponent(user._id.toString(), user.rating);

    if (!opponentId) {
      // No opponent found, create waiting room
      const problem = await Problem.findOne({ difficulty, isActive: true });
      if (!problem) {
        throw new AppError(503, 'No problems available');
      }

      const battle = await Battle.create({
        code: generateBattleCode(),
        creatorId: user._id,
        mode: 'deathmatch',
        maxPlayers: 2,
        difficulty,
        topics: [],
        isPublic: false,
        problemId: problem._id,
        participants: [user._id],
        playerCount: 1,
        status: 'waiting',
        leaderboard: [
          {
            userId: user._id,
            rank: 1,
            score: 0,
            attempts: 0,
            status: 'pending',
          },
        ],
      });

      return res.status(201).json({
        success: true,
        message: 'Waiting for opponent...',
        data: serializeBattle(battle),
      });
    }

    // Opponent found, create battle
    const problem = await Problem.findOne({ difficulty, isActive: true });
    if (!problem) {
      throw new AppError(503, 'No problems available');
    }

    const battle = await Battle.create({
      code: generateBattleCode(),
      creatorId: user._id,
      mode: 'deathmatch',
      maxPlayers: 2,
      difficulty,
      topics: [],
      isPublic: false,
      problemId: problem._id,
      participants: [user._id, opponentId],
      playerCount: 2,
      status: 'waiting',
      leaderboard: [
        {
          userId: user._id,
          rank: 1,
          score: 0,
          attempts: 0,
          status: 'pending',
        },
        {
          userId: opponentId,
          rank: 2,
          score: 0,
          attempts: 0,
          status: 'pending',
        },
      ],
    });

    // Notify opponent via socket
    const io = res.app.get('io');
    io.emit('match:found', {
      opponentId,
      battleCode: battle.code,
    });

    res.status(201).json({ success: true, data: serializeBattle(battle) });
  } catch (error) {
    next(error);
  }
});

// Get matchmaking status
router.get('/status', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      inQueue: false,
      estimatedWait: 0,
    },
  });
});

export const matchmakingRouter = router;
