import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  battleType: text("battle_type").notNull().default("duel"),
  difficulty: text("difficulty").notNull().default("medium"),
  topic: text("topic"),
  status: text("status").notNull().default("waiting"),
  maxPlayers: integer("max_players").notNull().default(2),
  requireApproval: boolean("require_approval").notNull().default(false),
  isPrivate: boolean("is_private").notNull().default(false),
  inviteLink: text("invite_link"),
  battleId: integer("battle_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const roomParticipantsTable = pgTable("room_participants", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => roomsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  isReady: boolean("is_ready").notNull().default(false),
  isHost: boolean("is_host").notNull().default(false),
  approvalStatus: text("approval_status").notNull().default("approved"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
export type RoomParticipant = typeof roomParticipantsTable.$inferSelect;
