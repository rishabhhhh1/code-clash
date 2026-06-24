import { pgTable, serial, text, integer, timestamp, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull(),
  problemIndex: text("problem_index").notNull(),
  title: text("title").notNull(),
  rating: integer("rating").notNull().default(0),
  tags: json("tags").$type<string[]>().notNull().default([]),
  cfUrl: text("cf_url").notNull(),
  solvedCount: integer("solved_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_problems_rating").on(t.rating),
]);

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true, createdAt: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;
