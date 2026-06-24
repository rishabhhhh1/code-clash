import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, problemsTable } from "@workspace/db";
import { ListProblemsQueryParams, GetRandomProblemQueryParams } from "@workspace/api-zod";
import axios from "axios";

const router: IRouter = Router();

router.get("/problems", async (req, res): Promise<void> => {
  const parsed = ListProblemsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { rating, topic, limit = 20 } = parsed.data;

  let query = db.select().from(problemsTable).$dynamic();

  if (rating) {
    query = query.where(eq(problemsTable.rating, rating)) as any;
  }
  if (topic) {
    query = query.where(sql`${problemsTable.tags}::text LIKE ${"%" + topic + "%"}`) as any;
  }
  query = query.limit(limit ?? 20) as any;

  const problems = await query;
  res.json(problems.map(formatProblem));
});

router.get("/problems/random", async (req, res): Promise<void> => {
  const parsed = GetRandomProblemQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { rating, topic } = parsed.data;

  let query = db.select().from(problemsTable).$dynamic();

  if (rating) {
    query = query.where(eq(problemsTable.rating, rating)) as any;
  }
  if (topic) {
    query = query.where(sql`${problemsTable.tags}::text LIKE ${"%" + topic + "%"}`) as any;
  }

  const problems = await (query as any).limit(100);
  if (problems.length === 0) {
    // Return a fallback problem
    const [p] = await db.select().from(problemsTable).limit(1);
    if (!p) {
      res.status(404).json({ error: "No problems found" });
      return;
    }
    res.json(formatProblem(p));
    return;
  }

  const randomProblem = problems[Math.floor(Math.random() * problems.length)];
  res.json(formatProblem(randomProblem));
});

router.post("/problems/fetch-cf", async (_req, res): Promise<void> => {
  try {
    const response = await axios.get("https://codeforces.com/api/problemset.problems", { timeout: 15000 });
    if (response.data.status !== "OK") {
      res.status(502).json({ error: "Codeforces API error" });
      return;
    }

    const problems = response.data.result.problems as any[];
    const stats = response.data.result.problemStatistics as any[];
    const statsMap = new Map(stats.map((s: any) => [`${s.contestId}${s.index}`, s.solvedCount]));

    // Filter to rated problems only
    const ratedProblems = problems.filter((p: any) => p.rating && p.rating >= 800 && p.rating <= 3500);
    const toInsert = ratedProblems.slice(0, 2000).map((p: any) => ({
      contestId: p.contestId,
      problemIndex: p.index,
      title: p.name,
      rating: p.rating,
      tags: p.tags || [],
      cfUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      solvedCount: statsMap.get(`${p.contestId}${p.index}`) as number | undefined,
    }));

    let fetched = 0;
    let cached = 0;
    for (const p of toInsert) {
      try {
        await db.insert(problemsTable).values(p).onConflictDoNothing();
        fetched++;
      } catch {
        cached++;
      }
    }

    res.json({ fetched, cached, message: `Processed ${fetched + cached} problems from Codeforces` });
  } catch (err: any) {
    res.status(502).json({ error: "Failed to fetch from Codeforces: " + err.message });
  }
});

function formatProblem(p: any) {
  return {
    id: p.id,
    contestId: p.contestId,
    problemIndex: p.problemIndex,
    title: p.title,
    rating: p.rating,
    tags: p.tags || [],
    cfUrl: p.cfUrl,
    solvedCount: p.solvedCount ?? null,
  };
}

export default router;
