import { Router } from 'express';
import { Types } from 'mongoose';
import { User } from '../../models/User';
import { MatchHistory } from '../../models/MatchHistory';
import { Submission } from '../../models/Submission';
import { Friendship } from '../../models/Friendship';
import { Room } from '../../models/Room';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { serializeUser } from '../../utils/serializers';
import { getUserAchievements } from '../../services/achievement.service';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  res.json({ success: true, data: serializeUser(req.user!) });
});

router.patch('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { bio, favoriteTopics } = req.body;
    const user = req.user!;

    if (bio !== undefined) user.bio = bio;
    if (favoriteTopics !== undefined) user.favoriteTopics = favoriteTopics;
    await user.save();

    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { bio, favoriteTopics } = req.body;
    const user = req.user!;

    if (bio !== undefined) user.bio = bio;
    if (favoriteTopics !== undefined) user.favoriteTopics = favoriteTopics;
    await user.save();

    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const accepted = await Submission.find({ user: user._id, isAccepted: true }).select('runtime');

    const avgSolveTime =
      accepted.length > 0
        ? accepted.reduce((sum, s) => sum + (s.runtime || 0), 0) / accepted.length
        : 0;

    res.json({
      success: true,
      data: {
        winRate: user.totalBattles > 0 ? (user.battleWins / user.totalBattles) * 100 : 0,
        averageSolveTime: avgSolveTime,
        rating: user.rating,
        maxRating: user.maxRating,
        totalBattles: user.totalBattles,
        wins: user.battleWins,
        losses: user.battleLosses,
        winStreak: user.winStreak,
        maxWinStreak: user.maxWinStreak,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      MatchHistory.find({ user: req.user!._id })
        .populate('room', 'code mode difficulty status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MatchHistory.countDocuments({ user: req.user!._id }),
    ]);

    res.json({
      success: true,
      data: { items: history, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me/achievements', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const achievements = await getUserAchievements(req.user!._id.toString());
    res.json({ success: true, data: achievements });
  } catch (error) {
    next(error);
  }
});

router.get('/me/friends', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user!._id }, { addressee: req.user!._id }],
      status: 'accepted',
    }).populate('requester addressee', 'codeforcesHandle avatar rating rank battleWins');

    const friends = friendships.map((f) => {
      const friend =
        f.requester._id.toString() === req.user!._id.toString() ? f.addressee : f.requester;
      return friend;
    });

    res.json({ success: true, data: friends });
  } catch (error) {
    next(error);
  }
});

router.post('/friends/request', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { handle } = req.body;
    const target = await User.findOne({ codeforcesHandle: handle.toLowerCase() });
    if (!target) throw new AppError(404, 'User not found');
    if (target._id.equals(req.user!._id)) throw new AppError(400, 'Cannot friend yourself');

    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user!._id, addressee: target._id },
        { requester: target._id, addressee: req.user!._id },
      ],
    });

    if (existing) throw new AppError(400, 'Friend request already exists');

    await Friendship.create({
      requester: req.user!._id,
      addressee: target._id,
      status: 'pending',
    });

    req.app.get('io')?.to(`user:${target._id}`).emit('friend:request', {
      from: serializeUser(req.user!),
    });

    res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/friends/accept/:friendshipId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    if (!friendship) throw new AppError(404, 'Request not found');
    if (!friendship.addressee.equals(req.user!._id)) throw new AppError(403, 'Not authorized');

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
});

router.get('/:idOrHandle', async (req, res, next) => {
  try {
    const { idOrHandle } = req.params;
    let user;

    if (Types.ObjectId.isValid(idOrHandle)) {
      user = await User.findById(idOrHandle);
    }
    if (!user) {
      user = await User.findOne({ codeforcesHandle: idOrHandle.toLowerCase() });
    }
    if (!user) throw new AppError(404, 'User not found');

    const achievements = await getUserAchievements(user._id.toString());
    const recentBattles = await MatchHistory.find({ user: user._id })
      .populate('room', 'code mode')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: { ...serializeUser(user), achievements, recentBattles },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:idOrHandle/stats', async (req, res, next) => {
  try {
    const { idOrHandle } = req.params;
    let user;

    if (Types.ObjectId.isValid(idOrHandle)) {
      user = await User.findById(idOrHandle);
    }
    if (!user) {
      user = await User.findOne({ codeforcesHandle: idOrHandle.toLowerCase() });
    }
    if (!user) throw new AppError(404, 'User not found');

    res.json({
      success: true,
      data: {
        winRate: user.totalBattles > 0 ? (user.battleWins / user.totalBattles) * 100 : 0,
        rating: user.rating,
        maxRating: user.maxRating,
        totalBattles: user.totalBattles,
        wins: user.battleWins,
        losses: user.battleLosses,
        winStreak: user.winStreak,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router;
