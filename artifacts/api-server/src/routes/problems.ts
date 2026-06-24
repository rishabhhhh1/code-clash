import { Router, type IRouter } from "express";
import { eq, and, sql, gte, lte, asc, desc, ilike, or } from "drizzle-orm";
import { db, problemsTable, userSolvedProblemsTable } from "@workspace/db";
import axios from "axios";
import { authMiddleware } from "./users";

const router: IRouter = Router();

function formatProblem(p: any, solvedByUser?: boolean) {
  return {
    id: p.id,
    contestId: p.contestId,
    problemIndex: p.problemIndex,
    title: p.title,
    rating: p.rating,
    tags: p.tags || [],
    cfUrl: p.cfUrl,
    solvedCount: p.solvedCount ?? null,
    timeLimit: p.timeLimit ?? null,
    memoryLimit: p.memoryLimit ?? null,
    solvedByUser: solvedByUser ?? null,
  };
}

router.get("/problems", async (req, res): Promise<void> => {
  const {
    search,
    ratingMin,
    ratingMax,
    tag,
    sort = "rating",
    order = "asc",
    page = "1",
    pageSize = "50",
    solved,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize) || 50));
  const offset = (pageNum - 1) * size;

  let userId: number | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { verifyToken } = await import("./users");
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      userId = payload?.id ?? null;
    } catch {
      // not authenticated — continue without solved filter
    }
  }

  const conditions: any[] = [];

  if (search) {
    conditions.push(ilike(problemsTable.title, `%${search}%`));
  }
  if (ratingMin) {
    conditions.push(gte(problemsTable.rating, parseInt(ratingMin)));
  }
  if (ratingMax) {
    conditions.push(lte(problemsTable.rating, parseInt(ratingMax)));
  }
  if (tag) {
    conditions.push(sql`${problemsTable.tags}::text ILIKE ${"%" + tag + "%"}`);
  }

  let solvedKeys: Set<string> | null = null;
  if (userId !== null) {
    const solvedRows = await db
      .select({ contestId: userSolvedProblemsTable.contestId, problemIndex: userSolvedProblemsTable.problemIndex })
      .from(userSolvedProblemsTable)
      .where(eq(userSolvedProblemsTable.userId, userId));
    solvedKeys = new Set(solvedRows.map((r) => `${r.contestId}${r.problemIndex}`));

    if (solved === "true" && solvedKeys.size > 0) {
      const solvedConditions = [...solvedKeys].map((key) => {
        const rows = solvedRows.filter((r) => `${r.contestId}${r.problemIndex}` === key);
        return rows.map((r) =>
          and(eq(problemsTable.contestId, r.contestId), eq(problemsTable.problemIndex, r.problemIndex))
        );
      }).flat();
      if (solvedConditions.length > 0) {
        conditions.push(or(...solvedConditions));
      }
    } else if (solved === "false" && solvedKeys.size > 0) {
      // unsolved: problems NOT in solvedKeys — we can't easily do this with drizzle dynamic, so we filter post-query for small sets
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let orderExpr: any;
  if (sort === "rating") orderExpr = order === "desc" ? desc(problemsTable.rating) : asc(problemsTable.rating);
  else if (sort === "contestId") orderExpr = order === "desc" ? desc(problemsTable.contestId) : asc(problemsTable.contestId);
  else if (sort === "name") orderExpr = order === "desc" ? desc(problemsTable.title) : asc(problemsTable.title);
  else orderExpr = asc(problemsTable.rating);

  const [problems, countResult] = await Promise.all([
    db.select().from(problemsTable).where(where).orderBy(orderExpr).limit(size).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(problemsTable).where(where),
  ]);

  let result = problems;

  // Post-filter for "unsolved" (exclude solved problems from result)
  if (solved === "false" && solvedKeys && solvedKeys.size > 0) {
    result = problems.filter((p) => !solvedKeys!.has(`${p.contestId}${p.problemIndex}`));
  }

  const totalCount = countResult[0]?.count ?? 0;

  res.json({
    problems: result.map((p) => formatProblem(p, solvedKeys ? solvedKeys.has(`${p.contestId}${p.problemIndex}`) : undefined)),
    total: totalCount,
    page: pageNum,
    pageSize: size,
    totalPages: Math.ceil(totalCount / size),
  });
});

router.get("/problems/my-solved", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).user.userId;
  const solved = await db
    .select()
    .from(userSolvedProblemsTable)
    .where(eq(userSolvedProblemsTable.userId, userId));

  res.json(solved.map((s) => ({
    contestId: s.contestId,
    problemIndex: s.problemIndex,
    solvedAt: s.solvedAt,
  })));
});

router.post("/problems/sync-solved", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).user.userId;

  const [userRow] = await db
    .select({ cfHandle: sql<string>`cf_handle` })
    .from(sql`users`)
    .where(sql`id = ${userId}`)
    .limit(1) as any[];

  if (!userRow?.cfHandle) {
    res.status(400).json({ error: "No Codeforces handle linked to your account" });
    return;
  }

  const cfHandle = userRow.cfHandle;

  try {
    const response = await axios.get(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}&from=1&count=100000`,
      { timeout: 20000 }
    );

    if (response.data.status !== "OK") {
      res.status(502).json({ error: "Codeforces API error: " + response.data.comment });
      return;
    }

    const submissions: any[] = response.data.result;
    const solvedSet = new Map<string, { contestId: number; problemIndex: string }>();

    for (const sub of submissions) {
      if (sub.verdict === "OK" && sub.problem?.contestId && sub.problem?.index) {
        const key = `${sub.problem.contestId}${sub.problem.index}`;
        if (!solvedSet.has(key)) {
          solvedSet.set(key, { contestId: sub.problem.contestId, problemIndex: sub.problem.index });
        }
      }
    }

    let synced = 0;
    for (const { contestId, problemIndex } of solvedSet.values()) {
      await db.insert(userSolvedProblemsTable)
        .values({ userId, contestId, problemIndex })
        .onConflictDoNothing();
      synced++;
    }

    res.json({ synced, cfHandle, message: `Synced ${synced} solved problems from Codeforces` });
  } catch (err: any) {
    res.status(502).json({ error: "Failed to sync from Codeforces: " + err.message });
  }
});

router.get("/problems/random", async (req, res): Promise<void> => {
  const { rating, topic } = req.query as Record<string, string>;

  let query = db.select().from(problemsTable).$dynamic();

  if (rating) {
    query = query.where(eq(problemsTable.rating, parseInt(rating))) as any;
  }
  if (topic) {
    query = query.where(sql`${problemsTable.tags}::text LIKE ${"%" + topic + "%"}`) as any;
  }

  const problems = await (query as any).limit(100);
  if (problems.length === 0) {
    const [p] = await db.select().from(problemsTable).limit(1);
    if (!p) { res.status(404).json({ error: "No problems found" }); return; }
    res.json(formatProblem(p));
    return;
  }

  const randomProblem = problems[Math.floor(Math.random() * problems.length)];
  res.json(formatProblem(randomProblem));
});

router.get("/problems/:contestId/:index", async (req, res): Promise<void> => {
  const contestId = parseInt(req.params.contestId);
  const problemIndex = req.params.index?.toUpperCase();

  if (!contestId || !problemIndex) {
    res.status(400).json({ error: "Invalid contestId or index" });
    return;
  }

  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(and(eq(problemsTable.contestId, contestId), eq(problemsTable.problemIndex, problemIndex)))
    .limit(1);

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const needsFetch =
    !problem.statementHtml ||
    !problem.statementFetchedAt ||
    Date.now() - new Date(problem.statementFetchedAt).getTime() > ONE_DAY;

  if (needsFetch) {
    try {
      const url = `https://codeforces.com/problemset/problem/${contestId}/${problemIndex}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CodeClash/1.0)",
          "Accept": "text/html",
        },
      });

      const html: string = response.data;

      // Extract problem statement, input/output specs, time/memory limits
      const statementMatch = html.match(/<div class="problem-statement">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
      const timeLimitMatch = html.match(/time limit per test<\/div>\s*<div[^>]*>([\d.]+)\s*second/i);
      const memoryLimitMatch = html.match(/memory limit per test<\/div>\s*<div[^>]*>(\d+)\s*megabyte/i);

      const statementHtml = statementMatch ? statementMatch[0] : null;
      const timeLimit = timeLimitMatch ? Math.round(parseFloat(timeLimitMatch[1]) * 1000) : null;
      const memoryLimit = memoryLimitMatch ? parseInt(memoryLimitMatch[1]) : null;

      await db
        .update(problemsTable)
        .set({
          statementHtml: statementHtml || null,
          timeLimit: timeLimit || problem.timeLimit,
          memoryLimit: memoryLimit || problem.memoryLimit,
          statementFetchedAt: new Date(),
        })
        .where(eq(problemsTable.id, problem.id));

      problem.statementHtml = statementHtml;
      if (timeLimit) problem.timeLimit = timeLimit;
      if (memoryLimit) problem.memoryLimit = memoryLimit;
    } catch {
      // Fetch failed — return cached data with limitation note
    }
  }

  let userId: number | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { verifyToken } = await import("./users");
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      userId = payload?.id ?? null;
    } catch { /* ignore */ }
  }

  let solvedByUser: boolean | null = null;
  if (userId !== null) {
    const [solved] = await db
      .select()
      .from(userSolvedProblemsTable)
      .where(and(
        eq(userSolvedProblemsTable.userId, userId),
        eq(userSolvedProblemsTable.contestId, contestId),
        eq(userSolvedProblemsTable.problemIndex, problemIndex)
      ))
      .limit(1);
    solvedByUser = !!solved;
  }

  res.json({
    ...formatProblem(problem, solvedByUser ?? undefined),
    statementHtml: problem.statementHtml || null,
    statementAvailable: !!problem.statementHtml,
  });
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

export default router;
