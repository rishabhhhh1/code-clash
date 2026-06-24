import { pgTable, serial, text, integer, timestamp, json, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull(),
  problemIndex: text("problem_index").notNull(),
  title: text("title").notNull(),
  rating: integer("rating").notNull().default(0),
  tags: json("tags").$type<string[]>().notNull().default([]),
  cfUrl: text("cf_url").notNull(),
  solvedCount: integer("solved_count"),
  timeLimit: integer("time_limit"),
  memoryLimit: integer("memory_limit"),
  statementHtml: text("statement_html"),
  statementFetchedAt: timestamp("statement_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_problems_rating").on(t.rating),
  index("idx_problems_contest").on(t.contestId),
  unique("uq_problems_contest_idx").on(t.contestId, t.problemIndex),
]);

export const userSolvedProblemsTable = pgTable("user_solved_problems", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  contestId: integer("contest_id").notNull(),
  problemIndex: text("problem_index").notNull(),
  solvedAt: timestamp("solved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_usp_user").on(t.userId),
  unique("uq_usp_user_problem").on(t.userId, t.contestId, t.problemIndex),
]);

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true, createdAt: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;
export type UserSolvedProblem = typeof userSolvedProblemsTable.$inferSelect;
