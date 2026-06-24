import { Router, Response } from 'express';
import { z } from 'zod';
import { User } from '../../models/User';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { serializeUser } from '../../utils/serializers';

const router = Router();

const updateProfileSchema = z.object({
  body: z.object({
    favoriteTopics: z.array(z.string()).optional(),
  }),
});

// Get user profile
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

// Get current user stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const winRate = user.totalBattles > 0 
      ? (user.battleWins / user.totalBattles * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        rating: user.rating,
        maxRating: user.maxRating,
        rank: user.rank,
        totalBattles: user.totalBattles,
        battleWins: user.battleWins,
        battleLosses: user.battleLosses,
        battleDraws: user.battleDraws,
        winRate,
        winStreak: user.winStreak,
        contribution: user.contribution,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch('/:id', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify user is updating their own profile
    if (user._id.toString() !== req.user?._id.toString()) {
      throw new AppError(403, 'Cannot update other user profiles');
    }

    if (req.body.favoriteTopics) {
      user.favoriteTopics = req.body.favoriteTopics;
    }

    await user.save();
    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

// Get user battle history
router.get('/:id/history', async (req, res, next) => {
  try {
    const { MatchHistory } = await import('../../models/MatchHistory');
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const history = await MatchHistory.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('battleId');

    const total = await MatchHistory.countDocuments({ userId: req.params.id });

    res.json({
      success: true,
      data: {
        matches: history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router;
