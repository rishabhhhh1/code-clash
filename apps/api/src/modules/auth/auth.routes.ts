import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, generateToken, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { getUserInfo, getUserRating, getUserProfileUrl } from '../../services/codeforces';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  body: z.object({
    handle: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid Codeforces handle format'),
  }),
});

// Login with Codeforces handle
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { handle } = req.body;

    // Verify handle exists on Codeforces
    let cfUser;
    try {
      cfUser = await getUserInfo(handle);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      // If the error is clearly about the handle not existing on CF, say so
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no such user')) {
        throw new AppError(404, `Codeforces handle "${handle}" not found. Please check your handle or create a Codeforces account at https://codeforces.com/register`);
      }
      // Otherwise surface the actual error (network, timeout, API down, etc.)
      throw new AppError(503, `Could not reach Codeforces: ${msg}. Please try again in a moment.`);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { codeforcesHandle: handle },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          codeforcesHandle: handle,
          avatar: cfUser.titlePhoto || cfUser.avatar || null,
          codeforcesRating: cfUser.rating || null,
          codeforcesMaxRating: cfUser.maxRating || null,
          codeforcesRank: cfUser.rank || null,
          codeforcesTitlePhoto: cfUser.titlePhoto || null,
          codeforcesVerified: true,
          codeforcesLastSync: new Date(),
        },
      });
    } else {
      // Update existing user's Codeforces data
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: cfUser.titlePhoto || cfUser.avatar || user.avatar,
          codeforcesRating: cfUser.rating || user.codeforcesRating,
          codeforcesMaxRating: cfUser.maxRating || user.codeforcesMaxRating,
          codeforcesRank: cfUser.rank || user.codeforcesRank,
          codeforcesTitlePhoto: cfUser.titlePhoto || user.codeforcesTitlePhoto,
          codeforcesVerified: true,
          codeforcesLastSync: new Date(),
        },
      });
    }

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          codeforcesHandle: user.codeforcesHandle,
          avatar: user.avatar,
          rating: user.rating,
          rank: user.rank,
          codeforcesRating: user.codeforcesRating,
          codeforcesMaxRating: user.codeforcesMaxRating,
          codeforcesRank: user.codeforcesRank,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync Codeforces data for current user
router.post('/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Fetch latest data from Codeforces
    const cfUser = await getUserInfo(user.codeforcesHandle);
    const cfRating = await getUserRating(user.codeforcesHandle);

    const latestRating = cfRating.length > 0 ? cfRating[cfRating.length - 1].newRating : cfUser.rating;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatar: cfUser.titlePhoto || cfUser.avatar || user.avatar,
        codeforcesRating: latestRating || user.codeforcesRating,
        codeforcesMaxRating: cfUser.maxRating || user.codeforcesMaxRating,
        codeforcesRank: cfUser.rank || user.codeforcesRank,
        codeforcesTitlePhoto: cfUser.titlePhoto || user.codeforcesTitlePhoto,
        codeforcesVerified: true,
        codeforcesLastSync: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          codeforcesHandle: updatedUser.codeforcesHandle,
          avatar: updatedUser.avatar,
          rating: updatedUser.rating,
          rank: updatedUser.rank,
          codeforcesRating: updatedUser.codeforcesRating,
          codeforcesMaxRating: updatedUser.codeforcesMaxRating,
          codeforcesRank: updatedUser.codeforcesRank,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      codeforcesHandle: true,
      avatar: true,
      bio: true,
      rating: true,
      rank: true,
      totalBattles: true,
      wins: true,
      losses: true,
      draws: true,
      codeforcesRating: true,
      codeforcesMaxRating: true,
      codeforcesRank: true,
      codeforcesTitlePhoto: true,
      codeforcesVerified: true,
      codeforcesLastSync: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({ success: true, data: user });
});

// Logout
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

export const authRouter = router;
