import { Router } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import {
  getProblemset,
  getRandomProblems,
  getProblemUrl,
  getContestUrl,
  getDifficultyFromRating,
  getContestList,
} from '../../services/codeforces';

const router = Router();

// Get problems list with search, difficulty, topic filters
router.get('/', async (req, res, next) => {
  try {
    const { tags, minRating, maxRating } = req.query;

    const tagList = tags ? (tags as string).split(',').map(t => t.trim()) : undefined;
    const minR = minRating ? parseInt(minRating as string) : undefined;
    const maxR = maxRating ? parseInt(maxRating as string) : undefined;

    const { problems } = await getProblemset(tagList);

    let filtered = problems;
    if (minR !== undefined) {
      filtered = filtered.filter(p => (p.rating || 0) >= minR);
    }
    if (maxR !== undefined) {
      filtered = filtered.filter(p => (p.rating || 0) <= maxR);
    }

    // Add difficulty field based on rating
    const problemsWithDifficulty = filtered.map(p => ({
      ...p,
      difficulty: getDifficultyFromRating(p.rating),
      url: getProblemUrl(p.contestId, p.index),
    }));

    res.json({
      success: true,
      data: {
        items: problemsWithDifficulty,
        total: problemsWithDifficulty.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get random problems for battle
router.get('/random', async (req, res, next) => {
  try {
    const { tags, count: countStr, minRating, maxRating } = req.query;
    const count = Math.min(10, Math.max(1, parseInt(countStr as string) || 1));

    const tagList = tags ? (tags as string).split(',').map(t => t.trim()) : undefined;
    const minR = minRating ? parseInt(minRating as string) : undefined;
    const maxR = maxRating ? parseInt(maxRating as string) : undefined;

    const problems = await getRandomProblems(count, tagList, minR, maxR);

    // Add difficulty and URL
    const problemsWithDetails = problems.map(p => ({
      ...p,
      difficulty: getDifficultyFromRating(p.rating),
      url: getProblemUrl(p.contestId, p.index),
    }));

    res.json({ success: true, data: problemsWithDetails });
  } catch (error) {
    next(error);
  }
});

// Get topics list (for filtering UI)
router.get('/topics', async (_req, res, next) => {
  try {
    const { problems } = await getProblemset();

    const topicCount: Record<string, number> = {};
    for (const p of problems) {
      for (const t of p.tags) {
        topicCount[t] = (topicCount[t] || 0) + 1;
      }
    }

    const topics = Object.entries(topicCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
});

// Get contests list
router.get('/contests', async (req, res, next) => {
  try {
    const { gym } = req.query;
    const contests = await getContestList(gym === 'true');

    res.json({ success: true, data: contests });
  } catch (error) {
    next(error);
  }
});

// Get problem by contestId and index
router.get('/:contestId/:index', async (req, res, next) => {
  try {
    const { contestId, index } = req.params;

    const { problems } = await getProblemset();
    const problem = problems.find(p => p.contestId === parseInt(contestId) && p.index === index);

    if (!problem) {
      throw new AppError(404, 'Problem not found');
    }

    const problemWithDetails = {
      ...problem,
      difficulty: getDifficultyFromRating(problem.rating),
      url: getProblemUrl(problem.contestId, problem.index),
      contestUrl: getContestUrl(problem.contestId),
    };

    res.json({ success: true, data: problemWithDetails });
  } catch (error) {
    next(error);
  }
});

export const problemsRouter = router;
