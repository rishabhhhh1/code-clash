import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, achievementsTable, userAchievementsTable } from "@workspace/db";
import { authMiddleware } from "./users";

const router: IRouter = Router();

const ACHIEVEMENTS_SEED = [
  { key: "first_win", title: "First Blood", description: "Win your first battle", icon: "trophy", category: "wins" },
  { key: "win_3", title: "Hat Trick", description: "Win 3 battles in a row", icon: "flame", category: "streaks" },
  { key: "win_5", title: "On Fire", description: "Achieve a 5-win streak", icon: "zap", category: "streaks" },
  { key: "win_10", title: "Unstoppable", description: "Achieve a 10-win streak", icon: "star", category: "streaks" },
  { key: "topic_master", title: "Topic Master", description: "Win 10 battles in one topic", icon: "book", category: "topics" },
  { key: "royale_winner", title: "Battle Royale King", description: "Win a Battle Royale", icon: "crown", category: "special" },
  { key: "arena_champion", title: "Arena Champion", description: "Win an Arena Mode battle", icon: "shield", category: "special" },
  { key: "win_50", title: "Veteran", description: "Win 50 battles", icon: "medal", category: "wins" },
  { key: "win_100", title: "Legend", description: "Win 100 battles", icon: "gem", category: "wins" },
];

async function ensureAchievementsSeeded() {
  const existing = await db.select().from(achievementsTable).limit(1);
  if (existing.length === 0) {
    for (const a of ACHIEVEMENTS_SEED) {
      await db.insert(achievementsTable).values(a).onConflictDoNothing();
    }
  }
}

router.get("/achievements", async (_req, res): Promise<void> => {
  await ensureAchievementsSeeded();
  const achievements = await db.select().from(achievementsTable);
  res.json(achievements);
});

router.get("/achievements/mine", authMiddleware, async (req: any, res): Promise<void> => {
  await ensureAchievementsSeeded();

  const userAchs = await db.select({
    id: userAchievementsTable.id,
    userId: userAchievementsTable.userId,
    achievementId: userAchievementsTable.achievementId,
    unlockedAt: userAchievementsTable.unlockedAt,
    key: achievementsTable.key,
    title: achievementsTable.title,
    description: achievementsTable.description,
    icon: achievementsTable.icon,
    category: achievementsTable.category,
  })
    .from(userAchievementsTable)
    .leftJoin(achievementsTable, eq(userAchievementsTable.achievementId, achievementsTable.id))
    .where(eq(userAchievementsTable.userId, req.userId));

  res.json(userAchs.map(ua => ({
    achievement: {
      id: ua.achievementId,
      key: ua.key!,
      title: ua.title!,
      description: ua.description!,
      icon: ua.icon!,
      category: ua.category!,
    },
    unlockedAt: ua.unlockedAt.toISOString(),
  })));
});

export default router;
