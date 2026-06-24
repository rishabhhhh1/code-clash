import { Router } from 'express';
import { z } from 'zod';
import { Problem } from '../../models/Problem';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { serializeProblem } from '../../utils/serializers';
import { PROBLEM_TOPICS, DIFFICULTY_LEVELS } from '../../utils/constants';

const router = Router();

const getProblemSchema = z.object({
  query: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    topic: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

// Get all problems with filters
router.get('/', validate(getProblemSchema), async (req, res, next) => {
  try {
    const page = (req.query.page as any) || 1;
    const limit = Math.min((req.query.limit as any) || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { isActive: true };

    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }

    if (req.query.topic) {
      query.topics = req.query.topic;
    }

    const problems = await Problem.find(query)
      .sort({ rating: 1 })
      .limit(limit)
      .skip(skip);

    const total = await Problem.countDocuments(query);

    res.json({
      success: true,
      data: {
        problems: problems.map(serializeProblem),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get random problem
router.get('/random', async (req, res, next) => {
  try {
    const difficulty = (req.query.difficulty as string) || 'medium';
    const problem = await Problem.findOne({
      difficulty,
      isActive: true,
    });

    if (!problem) {
      throw new AppError(404, 'No problems found');
    }

    res.json({ success: true, data: serializeProblem(problem) });
  } catch (error) {
    next(error);
  }
});

// Get problem by ID
router.get('/:id', async (req, res, next) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      throw new AppError(404, 'Problem not found');
    }

    res.json({ success: true, data: serializeProblem(problem) });
  } catch (error) {
    next(error);
  }
});

// Get all topics
router.get('/metadata/topics', (req, res) => {
  res.json({ success: true, data: PROBLEM_TOPICS });
});

export const problemsRouter = router;
