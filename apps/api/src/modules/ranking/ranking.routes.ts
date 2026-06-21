import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();

router.get('/leaderboard', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, username: true, avatar: true,
          rating: true, rank: true, totalBattles: true, wins: true,
        },
        orderBy: { rating: 'desc' },
        skip, take: limit,
      }),
      prisma.user.count(),
    ]);

    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      user,
      winRate: user.totalBattles > 0 ? (user.wins / user.totalBattles) * 100 : 0,
    }));

    res.json({ success: true, data: { items: leaderboard, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/rank/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { rating: true, rank: true } });
    if (!user) throw new AppError(404, 'User not found');
    const rank = await prisma.user.count({ where: { rating: { gt: user.rating } } });
    res.json({ success: true, data: { rank: rank + 1, rating: user.rating, rankTitle: user.rank } });
  } catch (error) { next(error); }
});

function calculateEloChange(winnerRating: number, loserRating: number, kFactor: number = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
  const winnerChange = Math.round(kFactor * (1 - expectedWinner));
  const loserChange = Math.round(kFactor * (0 - expectedLoser));
  return { winnerChange, loserChange: Math.abs(loserChange) };
}

router.post('/update-ratings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { battleId, winnerId, loserId } = req.body;
    const [winner, loser] = await Promise.all([
      prisma.user.findUnique({ where: { id: winnerId }, select: { rating: true } }),
      prisma.user.findUnique({ where: { id: loserId }, select: { rating: true } }),
    ]);
    if (!winner || !loser) throw new AppError(404, 'User not found');

    const { winnerChange, loserChange } = calculateEloChange(winner.rating, loser.rating);

    await Promise.all([
      prisma.user.update({ where: { id: winnerId }, data: { rating: { increment: winnerChange }, wins: { increment: 1 }, totalBattles: { increment: 1 } } }),
      prisma.user.update({ where: { id: loserId }, data: { rating: { decrement: loserChange }, losses: { increment: 1 }, totalBattles: { increment: 1 } } }),
    ]);

    const RANK_THRESHOLDS = [
      { rank: 'legend', min: 4000 }, { rank: 'grandmaster', min: 3500 },
      { rank: 'master', min: 3000 }, { rank: 'diamond', min: 2500 },
      { rank: 'platinum', min: 2000 }, { rank: 'gold', min: 1500 },
      { rank: 'silver', min: 1000 }, { rank: 'bronze', min: 0 },
    ];

    const [updatedWinner, updatedLoser] = await Promise.all([
      prisma.user.findUnique({ where: { id: winnerId }, select: { rating: true } }),
      prisma.user.findUnique({ where: { id: loserId }, select: { rating: true } }),
    ]);

    const winnerRank = RANK_THRESHOLDS.find((r) => updatedWinner!.rating >= r.min)?.rank || 'bronze';
    const loserRank = RANK_THRESHOLDS.find((r) => updatedLoser!.rating >= r.min)?.rank || 'bronze';

    await Promise.all([
      prisma.user.update({ where: { id: winnerId }, data: { rank: winnerRank } }),
      prisma.user.update({ where: { id: loserId }, data: { rank: loserRank } }),
    ]);

    // Record match history
    await prisma.matchHistory.create({
      data: {
        userId: winnerId, battleId,
        placement: 1, ratingChange: winnerChange,
        topicsPlayed: [],
      },
    });
    await prisma.matchHistory.create({
      data: {
        userId: loserId, battleId,
        placement: 2, ratingChange: -loserChange,
        topicsPlayed: [],
      },
    });

    res.json({ success: true, data: { winnerChange, loserChange } });
  } catch (error) { next(error); }
});

export const rankingRouter = router;
