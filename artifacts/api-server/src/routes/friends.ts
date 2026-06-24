import { Router, type IRouter } from "express";
import { eq, or, and } from "drizzle-orm";
import { db, usersTable, friendshipsTable } from "@workspace/db";
import { SendFriendRequestBody, RespondFriendRequestBody, RespondFriendRequestParams } from "@workspace/api-zod";
import { authMiddleware } from "./users";

const router: IRouter = Router();

async function formatFriend(friendship: any, currentUserId: number) {
  const isRequester = friendship.userId === currentUserId;
  const friendId = isRequester ? friendship.friendId : friendship.userId;
  const [friend] = await db.select().from(usersTable).where(eq(usersTable.id, friendId));
  return {
    id: friendship.id,
    userId: currentUserId,
    friendId,
    friendUsername: friend?.username ?? "unknown",
    friendCfHandle: friend?.cfHandle ?? "",
    friendRating: friend?.rating ?? 0,
    friendRank: friend?.rank ?? "newbie",
    status: friendship.status,
    isOnline: false,
  };
}

router.get("/friends", authMiddleware, async (req: any, res): Promise<void> => {
  const friendships = await db.select().from(friendshipsTable)
    .where(or(eq(friendshipsTable.userId, req.userId), eq(friendshipsTable.friendId, req.userId)));

  const result = await Promise.all(friendships.map(f => formatFriend(f, req.userId)));
  res.json(result);
});

router.post("/friends/request", authMiddleware, async (req: any, res): Promise<void> => {
  const parsed = SendFriendRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.targetUsername));
  if (!targetUser) { res.status(404).json({ error: "User not found" }); return; }
  if (targetUser.id === req.userId) { res.status(400).json({ error: "Cannot friend yourself" }); return; }

  const existing = await db.select().from(friendshipsTable).where(
    or(
      and(eq(friendshipsTable.userId, req.userId), eq(friendshipsTable.friendId, targetUser.id)),
      and(eq(friendshipsTable.userId, targetUser.id), eq(friendshipsTable.friendId, req.userId))
    )
  );
  if (existing.length > 0) { res.status(400).json({ error: "Friend request already exists" }); return; }

  const [friendship] = await db.insert(friendshipsTable).values({
    userId: req.userId,
    friendId: targetUser.id,
    status: "pending",
  }).returning();

  res.json(await formatFriend(friendship, req.userId));
});

router.post("/friends/:friendshipId/respond", authMiddleware, async (req: any, res): Promise<void> => {
  const params = RespondFriendRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Bad params" }); return; }
  const parsed = RespondFriendRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [friendship] = await db.select().from(friendshipsTable).where(eq(friendshipsTable.id, params.data.friendshipId));
  if (!friendship) { res.status(404).json({ error: "Not found" }); return; }
  if (friendship.friendId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

  const newStatus = parsed.data.accepted ? "accepted" : "rejected";
  const [updated] = await db.update(friendshipsTable)
    .set({ status: newStatus })
    .where(eq(friendshipsTable.id, params.data.friendshipId))
    .returning();

  res.json(await formatFriend(updated, req.userId));
});

export default router;
