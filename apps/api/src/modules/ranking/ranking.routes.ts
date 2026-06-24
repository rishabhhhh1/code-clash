import { Router } from 'express';
import { Ranking } from '../../models/Ranking';
import { User } from '../../models/User';

const router = Router();

router.get('/leaderboard', async (req, res, next) => {
  try {
    const top = await Ranking.find({ period: 'global' }).sort({ rating: -1 }).limit(100).populate('userId');
    res.json({ success: true, data: top });
  } catch (error) {
    next(error);
  }
});

router.get('/weekly', async (req, res, next) => {
  try {
    const top = await Ranking.find({ period: 'weekly' }).sort({ rating: -1 }).limit(100).populate('userId');
    res.json({ success: true, data: top });
  } catch (error) {
    next(error);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const top = await Ranking.find({ period: 'monthly' }).sort({ rating: -1 }).limit(100).populate('userId');
    res.json({ success: true, data: top });
  } catch (error) {
    next(error);
  }
});

export const rankingRouter = router;
