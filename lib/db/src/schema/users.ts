import { pgTable, serial, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  cfHandle: text("cf_handle").notNull(),
  rating: integer("rating").notNull().default(0),
  maxRating: integer("max_rating").notNull().default(0),
  rank: text("rank").notNull().default("newbie"),
  maxRank: text("max_rank").notNull().default("newbie"),
  contribution: integer("contribution").notNull().default(0),
  battleWins: integer("battle_wins").notNull().default(0),
  battleLosses: integer("battle_losses").notNull().default(0),
  totalBattles: integer("total_battles").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  favoriteTopics: json("favorite_topics").$type<string[]>().notNull().default([]),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
