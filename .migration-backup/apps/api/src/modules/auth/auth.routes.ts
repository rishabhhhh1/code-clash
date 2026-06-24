import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User';
import { authenticate, generateToken, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { getUserInfo, getUserRating } from '../../services/codeforces';
import { serializeUser } from '../../utils/serializers';
import { getRankFromRating } from '@codeclash/shared';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    handle: z
      .string()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid Codeforces handle format'),
  }),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const handle = req.body.handle.trim();

    let cfUser;
    try {
      cfUser = await getUserInfo(handle);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.toLowerCase().includes('not found')) {
        throw new AppError(
          404,
          `Codeforces handle "${handle}" not found. Create an account at https://codeforces.com/register`
        );
      }
      throw new AppError(503, `Could not reach Codeforces: ${msg}`);
    }

    const normalizedHandle = cfUser.handle;
    let user = await User.findOne({ codeforcesHandle: normalizedHandle.toLowerCase() });

    const rating = cfUser.rating ?? 1500;
    const maxRating = cfUser.maxRating ?? rating;
    const rank = getRankFromRating(rating);

    if (!user) {
      user = await User.create({
        codeforcesHandle: normalizedHandle.toLowerCase(),
        username: normalizedHandle,
        avatar: cfUser.titlePhoto || cfUser.avatar || '',
        rating,
        maxRating,
        rank,
        contribution: cfUser.contribution ?? 0,
      });
    } else {
      user.username = normalizedHandle;
      user.avatar = cfUser.titlePhoto || cfUser.avatar || user.avatar;
      user.rating = rating;
      user.maxRating = Math.max(user.maxRating, maxRating);
      user.rank = rank;
      user.contribution = cfUser.contribution ?? user.contribution;
      user.isOnline = true;
      await user.save();
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { user: serializeUser(user), token },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const cfUser = await getUserInfo(user.codeforcesHandle);
    const cfRating = await getUserRating(user.codeforcesHandle);
    const latestRating =
      cfRating.length > 0
        ? cfRating[cfRating.length - 1].newRating
        : cfUser.rating ?? user.rating;

    user.avatar = cfUser.titlePhoto || cfUser.avatar || user.avatar;
    user.rating = latestRating ?? user.rating;
    user.maxRating = Math.max(user.maxRating, cfUser.maxRating ?? user.maxRating);
    user.rank = getRankFromRating(user.rating);
    user.contribution = cfUser.contribution ?? user.contribution;
    await user.save();

    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  res.json({ success: true, data: serializeUser(req.user!) });
});

router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  if (req.user) {
    req.user.isOnline = false;
    req.user.lastSeen = new Date();
    await req.user.save();
  }

  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

export const authRouter = router;
