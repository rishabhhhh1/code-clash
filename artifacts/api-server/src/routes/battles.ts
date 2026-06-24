import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, battlesTable, battleParticipantsTable, problemsTable, roomsTable, feedEventsTable } from "@workspace/db";
import { GetBattleParams, GetBattleLeaderboardParams, RecordSubmissionParams, RecordSubmissionBody } from "@workspace/api-zod";
import { authMiddleware } from "./users";

const router: IRouter = Router();

async function formatBattle(battle: any) {
  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, battle.problemId));
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, battle.roomId));

  const participants = await db.select({
    userId: battleParticipantsTable.userId,
    solved: battleParticipantsTable.solved,
    solveTimeSeconds: battleParticipantsTable.solveTimeSeconds,
    attempts: battleParticipantsTable.attempts,
    penalty: battleParticipantsTable.penalty,
    rankPosition: battleParticipantsTable.rankPosition,
    isEliminated: battleParticipantsTable.isEliminated,
    lastVerdict: battleParticipantsTable.lastVerdict,
    username: usersTable.username,
    cfHandle: usersTable.cfHandle,
    rating: usersTable.rating,
    rank: usersTable.rank,
  })
    .from(battleParticipantsTable)
    .leftJoin(usersTable, eq(battleParticipantsTable.userId, usersTable.id))
    .where(eq(battleParticipantsTable.battleId, battle.id));

  let winnerUsername = null;
  if (battle.winnerId) {
    const [winner] = await db.select().from(usersTable).where(eq(usersTable.id, battle.winnerId));
    winnerUsername = winner?.username ?? null;
  }

  // Sort by solve status, then time, then attempts
  const sorted = [...participants].sort((a, b) => {
    if (a.solved && !b.solved) return -1;
    if (!a.solved && b.solved) return 1;
    if (a.solved && b.solved) return (a.solveTimeSeconds ?? 0) - (b.solveTimeSeconds ?? 0);
    return a.attempts - b.attempts;
  });

  return {
    id: battle.id,
    roomId: battle.roomId,
    roomCode: room?.roomCode ?? "unknown",
    battleType: battle.battleType,
    status: battle.status,
    problem: problem ? {
      id: problem.id,
      contestId: problem.contestId,
      problemIndex: problem.problemIndex,
      title: problem.title,
      rating: problem.rating,
      tags: problem.tags || [],
      cfUrl: problem.cfUrl,
      solvedCount: problem.solvedCount ?? null,
    } : null,
    participants: sorted.map((p, i) => ({
      userId: p.userId,
      username: p.username ?? "unknown",
      cfHandle: p.cfHandle ?? "",
      rating: p.rating ?? 0,
      rank: p.rank ?? "newbie",
      solved: p.solved,
      solveTimeSeconds: p.solveTimeSeconds ?? null,
      attempts: p.attempts,
      penalty: p.penalty,
      rank_position: i + 1,
      isEliminated: p.isEliminated,
      lastVerdict: p.lastVerdict ?? null,
    })),
    startedAt: battle.startedAt.toISOString(),
    endedAt: battle.endedAt?.toISOString() ?? null,
    winnerId: battle.winnerId ?? null,
    winnerUsername,
    durationSeconds: battle.durationSeconds ?? null,
  };
}

router.get("/battles/:battleId", async (req: any, res): Promise<void> => {
  const params = GetBattleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const raw = Array.isArray(req.params.battleId) ? req.params.battleId[0] : req.params.battleId;
  const battleId = parseInt(raw, 10);

  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, battleId));
  if (!battle) { res.status(404).json({ error: "Battle not found" }); return; }

  res.json(await formatBattle(battle));
});

router.get("/battles/:battleId/leaderboard", async (req: any, res): Promise<void> => {
  const params = GetBattleLeaderboardParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const raw = Array.isArray(req.params.battleId) ? req.params.battleId[0] : req.params.battleId;
  const battleId = parseInt(raw, 10);

  const participants = await db.select({
    userId: battleParticipantsTable.userId,
    solved: battleParticipantsTable.solved,
    solveTimeSeconds: battleParticipantsTable.solveTimeSeconds,
    attempts: battleParticipantsTable.attempts,
    penalty: battleParticipantsTable.penalty,
    isEliminated: battleParticipantsTable.isEliminated,
    lastVerdict: battleParticipantsTable.lastVerdict,
    username: usersTable.username,
    cfHandle: usersTable.cfHandle,
    rating: usersTable.rating,
    rank: usersTable.rank,
  })
    .from(battleParticipantsTable)
    .leftJoin(usersTable, eq(battleParticipantsTable.userId, usersTable.id))
    .where(eq(battleParticipantsTable.battleId, battleId));

  const sorted = [...participants].sort((a, b) => {
    if (a.solved && !b.solved) return -1;
    if (!a.solved && b.solved) return 1;
    if (a.solved && b.solved) return (a.solveTimeSeconds ?? 0) - (b.solveTimeSeconds ?? 0);
    return a.attempts - b.attempts;
  });

  res.json(sorted.map((p, i) => ({
    userId: p.userId,
    username: p.username ?? "unknown",
    cfHandle: p.cfHandle ?? "",
    rating: p.rating ?? 0,
    rank: p.rank ?? "newbie",
    solved: p.solved,
    solveTimeSeconds: p.solveTimeSeconds ?? null,
    attempts: p.attempts,
    penalty: p.penalty,
    rank_position: i + 1,
    isEliminated: p.isEliminated,
    lastVerdict: p.lastVerdict ?? null,
  })));
});

router.post("/battles/:battleId/submit", authMiddleware, async (req: any, res): Promise<void> => {
  const params = RecordSubmissionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }
  const parsed = RecordSubmissionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const raw = Array.isArray(req.params.battleId) ? req.params.battleId[0] : req.params.battleId;
  const battleId = parseInt(raw, 10);

  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, battleId));
  if (!battle) { res.status(404).json({ error: "Battle not found" }); return; }

  const [participant] = await db.select().from(battleParticipantsTable)
    .where(eq(battleParticipantsTable.battleId, battleId));

  const isAccepted = parsed.data.verdict === "OK";
  const solveTime = isAccepted
    ? Math.floor((new Date().getTime() - battle.startedAt.getTime()) / 1000)
    : null;

  const updateData: any = {
    attempts: (participant?.attempts ?? 0) + 1,
    lastVerdict: parsed.data.verdict,
  };
  if (isAccepted && !participant?.solved) {
    updateData.solved = true;
    updateData.solveTimeSeconds = solveTime;
    updateData.penalty = (participant?.attempts ?? 0) * 20 * 60 + (solveTime ?? 0);
  }

  const [updated] = await db.update(battleParticipantsTable)
    .set(updateData)
    .where(eq(battleParticipantsTable.battleId, battleId))
    .returning();

  // Check if battle is over (all solved or timeout)
  if (isAccepted) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

    // Update winner stats
    await db.update(usersTable).set({
      battleWins: (user?.battleWins ?? 0) + 1,
      totalBattles: (user?.totalBattles ?? 0) + 1,
      winStreak: (user?.winStreak ?? 0) + 1,
    }).where(eq(usersTable.id, req.userId)).catch(() => {});

    // End battle
    await db.update(battlesTable).set({
      status: "finished",
      winnerId: req.userId,
      endedAt: new Date(),
      durationSeconds: solveTime,
    }).where(eq(battlesTable.id, battleId)).catch(() => {});

    // Feed event
    await db.insert(feedEventsTable).values({
      eventType: "battle_won",
      message: `${user?.username} solved ${battle.battleType} battle in ${Math.floor((solveTime ?? 0) / 60)}m ${(solveTime ?? 0) % 60}s!`,
      userId: req.userId,
      battleType: battle.battleType,
    }).catch(() => {});
  }

  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  res.json({
    userId: req.userId,
    username: updatedUser?.username ?? "unknown",
    cfHandle: updatedUser?.cfHandle ?? "",
    rating: updatedUser?.rating ?? 0,
    rank: updatedUser?.rank ?? "newbie",
    solved: updated.solved,
    solveTimeSeconds: updated.solveTimeSeconds ?? null,
    attempts: updated.attempts,
    penalty: updated.penalty,
    rank_position: 1,
    isEliminated: updated.isEliminated,
    lastVerdict: updated.lastVerdict ?? null,
  });
});

export default router;
