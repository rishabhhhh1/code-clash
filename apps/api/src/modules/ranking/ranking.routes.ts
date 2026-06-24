import { Router } from 'express';
import { User } from '../../models/User';
import { AppError } from '../../middleware/error';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { serializeUser } from '../../utils/serializers';

const router = Router();

router.get('/leaderboard', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select('codeforcesHandle username avatar rating rank totalBattles battleWins battleLosses winStreak')
        .sort({ rating: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      user: serializeUser(user),
      winRate: user.totalBattles > 0 ? (user.battleWins / user.totalBattles) * 100 : 0,
    }));

    res.json({
      success: true,
      data: { items: leaderboard, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/rank/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new AppError(404, 'User not found');

    const rank = await User.countDocuments({ rating: { $gt: user.rating } });
    res.json({
      success: true,
      data: { rank: rank + 1, rating: user.rating, rankTitle: user.rank },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/top', async (_req, res, next) => {
  try {
    const users = await User.find()
      .sort({ battleWins: -1 })
      .limit(10)
      .select('codeforcesHandle rating rank battleWins winStreak avatar');

    res.json({ success: true, data: users.map(serializeUser) });
  } catch (error) {
    next(error);
  }
});

export const rankingRouter = router;
