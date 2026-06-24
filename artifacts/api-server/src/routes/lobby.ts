import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, usersTable, roomsTable, battlesTable, feedEventsTable } from "@workspace/db";
import { GetLobbyFeedQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/lobby/stats", async (_req, res): Promise<void> => {
  const [activeCount, waitingCount, todayCount, recentWinnerRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(battlesTable).where(eq(battlesTable.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(roomsTable).where(eq(roomsTable.status, "waiting")),
    db.select({ count: sql<number>`count(*)` }).from(battlesTable).where(
      sql`${battlesTable.startedAt} > now() - interval '24 hours'`
    ),
    db.select({
      id: usersTable.id,
      username: usersTable.username,
      cfHandle: usersTable.cfHandle,
      rating: usersTable.rating,
      rank: usersTable.rank,
      battleWins: usersTable.battleWins,
    }).from(usersTable).orderBy(desc(usersTable.battleWins)).limit(5),
  ]);

  const recentWinners = recentWinnerRows.map(u => ({
    userId: u.id,
    username: u.username,
    cfHandle: u.cfHandle,
    rating: u.rating,
    rank: u.rank,
    battleType: "duel",
    wonAt: new Date().toISOString(),
  }));

  res.json({
    onlinePlayers: Math.max(recentWinnerRows.length, 1),
    activeBattles: Number(activeCount[0]?.count ?? 0),
    waitingRooms: Number(waitingCount[0]?.count ?? 0),
    totalBattlesToday: Number(todayCount[0]?.count ?? 0),
    recentWinners,
  });
});

router.get("/lobby/feed", async (req, res): Promise<void> => {
  const parsed = GetLobbyFeedQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const limit = parsed.data.limit ?? 20;

  const events = await db.select({
    id: feedEventsTable.id,
    eventType: feedEventsTable.eventType,
    message: feedEventsTable.message,
    battleType: feedEventsTable.battleType,
    createdAt: feedEventsTable.createdAt,
    userId: feedEventsTable.userId,
    username: usersTable.username,
    cfHandle: usersTable.cfHandle,
    rating: usersTable.rating,
  })
    .from(feedEventsTable)
    .leftJoin(usersTable, eq(feedEventsTable.userId, usersTable.id))
    .orderBy(desc(feedEventsTable.createdAt))
    .limit(limit);

  res.json(events.map(e => ({
    id: e.id,
    eventType: e.eventType,
    message: e.message,
    username: e.username ?? null,
    cfHandle: e.cfHandle ?? null,
    rating: e.rating ?? null,
    battleType: e.battleType ?? null,
    timestamp: e.createdAt.toISOString(),
  })));
});

router.get("/lobby/active-battles", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable)
    .where(sql`${roomsTable.status} IN ('waiting', 'active')`)
    .orderBy(desc(roomsTable.createdAt))
    .limit(20);

  const result = await Promise.all(rooms.map(async (room) => {
    const host = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, room.hostId));
    return {
      roomCode: room.roomCode,
      battleType: room.battleType,
      playerCount: 1,
      maxPlayers: room.maxPlayers,
      status: room.status as "waiting" | "active",
      hostUsername: host[0]?.username ?? "unknown",
      topic: room.topic ?? null,
      difficulty: room.difficulty,
      startedAt: null,
    };
  }));

  res.json(result);
});

export default router;
