import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, roomsTable, roomParticipantsTable, battlesTable, battleParticipantsTable, problemsTable, feedEventsTable } from "@workspace/db";
import {
  CreateRoomBody, GetRoomParams, JoinRoomParams, SetReadyParams, StartBattleParams,
  ApproveJoinRequestParams, ApproveJoinRequestBody,
} from "@workspace/api-zod";
import { authMiddleware } from "./users";
import crypto from "crypto";

const router: IRouter = Router();

function generateRoomCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

async function getFullRoom(roomId: number) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room) return null;

  const participants = await db.select({
    userId: roomParticipantsTable.userId,
    isReady: roomParticipantsTable.isReady,
    isHost: roomParticipantsTable.isHost,
    joinedAt: roomParticipantsTable.joinedAt,
    username: usersTable.username,
    cfHandle: usersTable.cfHandle,
    rating: usersTable.rating,
    rank: usersTable.rank,
  })
    .from(roomParticipantsTable)
    .leftJoin(usersTable, eq(roomParticipantsTable.userId, usersTable.id))
    .where(eq(roomParticipantsTable.roomId, roomId));

  const [host] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, room.hostId));

  return {
    id: room.id,
    roomCode: room.roomCode,
    hostId: room.hostId,
    hostUsername: host?.username ?? "unknown",
    battleType: room.battleType,
    difficulty: room.difficulty,
    topic: room.topic ?? null,
    status: room.status,
    maxPlayers: room.maxPlayers,
    requireApproval: room.requireApproval,
    isPrivate: room.isPrivate,
    inviteLink: room.inviteLink ?? null,
    participants: participants.map(p => ({
      userId: p.userId,
      username: p.username ?? "unknown",
      cfHandle: p.cfHandle ?? "",
      rating: p.rating ?? 0,
      rank: p.rank ?? "newbie",
      isReady: p.isReady,
      isHost: p.isHost,
      joinedAt: p.joinedAt.toISOString(),
    })),
    battleId: room.battleId ?? null,
    createdAt: room.createdAt.toISOString(),
  };
}

router.get("/rooms", async (req, res): Promise<void> => {
  const { status, battleType } = req.query as any;
  let query = db.select().from(roomsTable).$dynamic();
  if (status) query = query.where(eq(roomsTable.status, status)) as any;
  if (battleType) query = query.where(eq(roomsTable.battleType, battleType)) as any;
  const rooms = await (query as any).limit(50);

  const result = await Promise.all(rooms.map((r: any) => getFullRoom(r.id)));
  res.json(result.filter(Boolean));
});

router.post("/rooms", authMiddleware, async (req: any, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const roomCode = generateRoomCode();
  const inviteLink = `/room/${roomCode}`;

  const [room] = await db.insert(roomsTable).values({
    roomCode,
    hostId: req.userId,
    battleType: parsed.data.battleType,
    difficulty: parsed.data.difficulty,
    topic: parsed.data.topic,
    maxPlayers: parsed.data.maxPlayers,
    requireApproval: parsed.data.requireApproval ?? false,
    isPrivate: parsed.data.isPrivate ?? false,
    inviteLink,
    status: "waiting",
  }).returning();

  await db.insert(roomParticipantsTable).values({
    roomId: room.id,
    userId: req.userId,
    isReady: false,
    isHost: true,
  });

  // Feed event
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  await db.insert(feedEventsTable).values({
    eventType: "battle_started",
    message: `${user?.username} created a ${parsed.data.battleType} room`,
    userId: req.userId,
    battleType: parsed.data.battleType,
  }).catch(() => {});

  const full = await getFullRoom(room.id);
  res.status(201).json(full);
});

router.get("/rooms/:roomCode", async (req: any, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, params.data.roomCode));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }

  const full = await getFullRoom(room.id);
  res.json(full);
});

router.post("/rooms/:roomCode/join", authMiddleware, async (req: any, res): Promise<void> => {
  const params = JoinRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, params.data.roomCode));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (room.status !== "waiting") { res.status(400).json({ error: "Room is not open for joining" }); return; }

  const existingParticipant = await db.select().from(roomParticipantsTable)
    .where(and(eq(roomParticipantsTable.roomId, room.id), eq(roomParticipantsTable.userId, req.userId)));

  if (existingParticipant.length === 0) {
    const approvalStatus = room.requireApproval ? "pending" : "approved";
    await db.insert(roomParticipantsTable).values({
      roomId: room.id,
      userId: req.userId,
      isReady: false,
      isHost: false,
      approvalStatus,
    });
  }

  const full = await getFullRoom(room.id);
  res.json(full);
});

router.post("/rooms/:roomCode/ready", authMiddleware, async (req: any, res): Promise<void> => {
  const params = SetReadyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, params.data.roomCode));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }

  const [participant] = await db.select().from(roomParticipantsTable)
    .where(and(eq(roomParticipantsTable.roomId, room.id), eq(roomParticipantsTable.userId, req.userId)));
  if (!participant) { res.status(404).json({ error: "Not in room" }); return; }

  const [updated] = await db.update(roomParticipantsTable)
    .set({ isReady: !participant.isReady })
    .where(and(eq(roomParticipantsTable.roomId, room.id), eq(roomParticipantsTable.userId, req.userId)))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  res.json({
    userId: updated.userId,
    username: user?.username ?? "unknown",
    cfHandle: user?.cfHandle ?? "",
    rating: user?.rating ?? 0,
    rank: user?.rank ?? "newbie",
    isReady: updated.isReady,
    isHost: updated.isHost,
    joinedAt: updated.joinedAt.toISOString(),
  });
});

router.post("/rooms/:roomCode/start", authMiddleware, async (req: any, res): Promise<void> => {
  const params = StartBattleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, params.data.roomCode));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (room.hostId !== req.userId) { res.status(403).json({ error: "Only host can start" }); return; }

  // Pick a random problem
  const ratingMap: Record<string, number[]> = {
    easy: [800, 900, 1000, 1100, 1200],
    medium: [1300, 1400, 1500, 1600],
    hard: [1700, 1800, 1900, 2000, 2100, 2200],
    mixed: [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800],
  };
  const ratings = ratingMap[room.difficulty] || ratingMap.medium;
  const randomRating = ratings[Math.floor(Math.random() * ratings.length)];

  let problem = null;
  if (room.topic) {
    const [p] = await db.select().from(problemsTable)
      .where(eq(problemsTable.rating, randomRating))
      .limit(1);
    problem = p;
  }
  if (!problem) {
    const [p] = await db.select().from(problemsTable).where(eq(problemsTable.rating, randomRating)).limit(1);
    problem = p;
  }
  if (!problem) {
    // Fallback: get any problem
    const [p] = await db.select().from(problemsTable).limit(1);
    problem = p;
  }

  if (!problem) {
    res.status(400).json({ error: "No problems available. Run /api/problems/fetch-cf first." });
    return;
  }

  // Create the battle
  const [battle] = await db.insert(battlesTable).values({
    roomId: room.id,
    problemId: problem.id,
    battleType: room.battleType,
    status: "active",
  }).returning();

  // Add participants to battle
  const participants = await db.select().from(roomParticipantsTable).where(eq(roomParticipantsTable.roomId, room.id));
  for (const p of participants) {
    await db.insert(battleParticipantsTable).values({
      battleId: battle.id,
      userId: p.userId,
      solved: false,
      attempts: 0,
      penalty: 0,
    });
  }

  // Update room status
  await db.update(roomsTable).set({ status: "active", battleId: battle.id }).where(eq(roomsTable.id, room.id));

  // Feed event
  const [host] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  await db.insert(feedEventsTable).values({
    eventType: "battle_started",
    message: `${host?.username}'s ${room.battleType} battle has started!`,
    userId: req.userId,
    battleType: room.battleType,
  }).catch(() => {});

  // Build battle response
  const battleParticipants = await db.select({
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
    .where(eq(battleParticipantsTable.battleId, battle.id));

  res.json({
    id: battle.id,
    roomId: room.id,
    roomCode: room.roomCode,
    battleType: battle.battleType,
    status: battle.status,
    problem: {
      id: problem.id,
      contestId: problem.contestId,
      problemIndex: problem.problemIndex,
      title: problem.title,
      rating: problem.rating,
      tags: problem.tags || [],
      cfUrl: problem.cfUrl,
      solvedCount: problem.solvedCount ?? null,
    },
    participants: battleParticipants.map((p, i) => ({
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
    endedAt: null,
    winnerId: null,
    winnerUsername: null,
    durationSeconds: null,
  });
});

router.post("/rooms/:roomCode/approve/:userId", authMiddleware, async (req: any, res): Promise<void> => {
  const params = ApproveJoinRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }
  const parsed = ApproveJoinRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const targetUserId = parseInt(raw, 10);

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, params.data.roomCode));
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  if (room.hostId !== req.userId) { res.status(403).json({ error: "Only host can approve" }); return; }

  if (parsed.data.approved) {
    await db.update(roomParticipantsTable)
      .set({ approvalStatus: "approved" })
      .where(and(eq(roomParticipantsTable.roomId, room.id), eq(roomParticipantsTable.userId, targetUserId)));
  } else {
    await db.delete(roomParticipantsTable)
      .where(and(eq(roomParticipantsTable.roomId, room.id), eq(roomParticipantsTable.userId, targetUserId)));
  }

  const full = await getFullRoom(room.id);
  res.json(full);
});

export default router;
