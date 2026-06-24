import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable, feedEventsTable } from "@workspace/db";
import {
  RegisterUserBody,
  LoginUserBody,
  UpdateMeBody,
  GetUserProfileParams,
  GetUserBattleHistoryParams,
  SyncCodeforcesHandleBody,
} from "@workspace/api-zod";
import axios from "axios";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  console.warn("[WARN] JWT_SECRET not set — using insecure dev fallback. Set JWT_SECRET before deploying.");
}
const _JWT_SECRET = JWT_SECRET || "codeclash-dev-only-secret-do-not-use-in-prod";

function makeToken(userId: number, username: string) {
  // @ts-ignore
  return jwt.sign({ id: userId, username }, _JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { id: number; username: string } | null {
  try {
    // @ts-ignore
    return jwt.verify(token, _JWT_SECRET) as { id: number; username: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: any, res: any, next: any): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.userId = payload.id;
  req.username = payload.username;
  next();
}

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    cfHandle: user.cfHandle,
    rating: user.rating,
    maxRating: user.maxRating,
    rank: user.rank,
    maxRank: user.maxRank,
    contribution: user.contribution,
    battleWins: user.battleWins,
    battleLosses: user.battleLosses,
    totalBattles: user.totalBattles,
    winStreak: user.winStreak,
    favoriteTopics: user.favoriteTopics || [],
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password, cfHandle } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Try to fetch CF data
  let rating = 0, maxRating = 0, rank = "newbie", maxRank = "newbie", contribution = 0;
  try {
    const cfRes = await axios.get(`https://codeforces.com/api/user.info?handles=${cfHandle}`, { timeout: 5000 });
    if (cfRes.data.status === "OK" && cfRes.data.result?.[0]) {
      const cfUser = cfRes.data.result[0];
      rating = cfUser.rating || 0;
      maxRating = cfUser.maxRating || 0;
      rank = cfUser.rank || "newbie";
      maxRank = cfUser.maxRank || "newbie";
      contribution = cfUser.contribution || 0;
    }
  } catch { /* CF API might be down */ }

  const [user] = await db.insert(usersTable).values({
    username, passwordHash, cfHandle,
    rating, maxRating, rank, maxRank, contribution,
    favoriteTopics: [],
  }).returning();

  // Feed event
  await db.insert(feedEventsTable).values({
    eventType: "player_joined",
    message: `${username} joined CodeClash!`,
    userId: user.id,
  }).catch(() => {});

  const token = makeToken(user.id, user.username);
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = makeToken(user.id, user.username);
  res.json({ token, user: formatUser(user) });
});

router.get("/users/me", authMiddleware, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatUser(user));
});

router.patch("/users/me", authMiddleware, async (req: any, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: any = {};
  if (parsed.data.favoriteTopics !== undefined) updateData.favoriteTopics = parsed.data.favoriteTopics;
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.userId)).returning();
  res.json(formatUser(user));
});

router.get("/users/sync-codeforces", authMiddleware, async (req: any, res): Promise<void> => {
  // handled by POST below, redirect
  res.status(405).json({ error: "Use POST" });
});

router.post("/users/sync-codeforces", authMiddleware, async (req: any, res): Promise<void> => {
  const parsed = SyncCodeforcesHandleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { cfHandle } = parsed.data;

  let rating = 0, maxRating = 0, rank = "newbie", maxRank = "newbie", contribution = 0;
  try {
    const cfRes = await axios.get(`https://codeforces.com/api/user.info?handles=${cfHandle}`, { timeout: 8000 });
    if (cfRes.data.status === "OK" && cfRes.data.result?.[0]) {
      const cfUser = cfRes.data.result[0];
      rating = cfUser.rating || 0;
      maxRating = cfUser.maxRating || 0;
      rank = cfUser.rank || "newbie";
      maxRank = cfUser.maxRank || "newbie";
      contribution = cfUser.contribution || 0;
    }
  } catch {
    res.status(502).json({ error: "Failed to reach Codeforces API" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ cfHandle, rating, maxRating, rank, maxRank, contribution })
    .where(eq(usersTable.id, req.userId))
    .returning();
  res.json(formatUser(user));
});

router.get("/users/:username", async (req: any, res): Promise<void> => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.get("/users/:username/history", async (req: any, res): Promise<void> => {
  const params = GetUserBattleHistoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Return empty history for now - would join battles in production
  res.json([]);
});

export default router;
