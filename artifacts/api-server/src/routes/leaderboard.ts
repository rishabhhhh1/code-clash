import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetGlobalLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function leaderboardEntry(user: any, rankPos: number) {
  const winRate = user.totalBattles > 0 ? user.battleWins / user.totalBattles : 0;
  return {
    rank_position: rankPos,
    userId: user.id,
    username: user.username,
    cfHandle: user.cfHandle,
    rating: user.rating,
    rank: user.rank,
    battleWins: user.battleWins,
    totalBattles: user.totalBattles,
    winRate: Math.round(winRate * 100) / 100,
    winStreak: user.winStreak,
  };
}

router.get("/leaderboard/global", async (req, res): Promise<void> => {
  const parsed = GetGlobalLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const limit = parsed.data.limit ?? 50;
  const users = await db.select().from(usersTable)
    .orderBy(desc(usersTable.rating))
    .limit(limit);

  res.json(users.map((u, i) => leaderboardEntry(u, i + 1)));
});

router.get("/leaderboard/top-players", async (_req, res): Promise<void> => {
  const [byRatingUsers, byWinsUsers, byStreakUsers] = await Promise.all([
    db.select().from(usersTable).orderBy(desc(usersTable.rating)).limit(10),
    db.select().from(usersTable).orderBy(desc(usersTable.battleWins)).limit(10),
    db.select().from(usersTable).orderBy(desc(usersTable.winStreak)).limit(10),
  ]);

  res.json({
    byRating: byRatingUsers.map((u, i) => leaderboardEntry(u, i + 1)),
    byWins: byWinsUsers.map((u, i) => leaderboardEntry(u, i + 1)),
    byStreak: byStreakUsers.map((u, i) => leaderboardEntry(u, i + 1)),
  });
});

export default router;
