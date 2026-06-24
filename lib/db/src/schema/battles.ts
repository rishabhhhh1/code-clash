import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { roomsTable } from "./rooms";
import { problemsTable } from "./problems";

export const battlesTable = pgTable("battles", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => roomsTable.id),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id),
  battleType: text("battle_type").notNull(),
  status: text("status").notNull().default("active"),
  winnerId: integer("winner_id").references(() => usersTable.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});

export const battleParticipantsTable = pgTable("battle_participants", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").notNull().references(() => battlesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  solved: boolean("solved").notNull().default(false),
  solveTimeSeconds: integer("solve_time_seconds"),
  attempts: integer("attempts").notNull().default(0),
  penalty: integer("penalty").notNull().default(0),
  rankPosition: integer("rank_position"),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  lastVerdict: text("last_verdict"),
});

export const insertBattleSchema = createInsertSchema(battlesTable).omit({ id: true, startedAt: true });
export type InsertBattle = z.infer<typeof insertBattleSchema>;
export type Battle = typeof battlesTable.$inferSelect;
export type BattleParticipant = typeof battleParticipantsTable.$inferSelect;
