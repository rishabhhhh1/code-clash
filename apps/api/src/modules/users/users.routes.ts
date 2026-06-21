import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';

const router = Router();

// Update profile
router.patch('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { avatar, bio, showLeetCodeStats, emailNotifications, battleInvites } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(showLeetCodeStats !== undefined && { showLeetCodeStats }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(battleInvites !== undefined && { battleInvites }),
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        rating: true,
        rank: true,
        showLeetCodeStats: true,
        emailNotifications: true,
        battleInvites: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Get connected OAuth accounts
router.get('/me/accounts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const accounts = await prisma.oAuthAccount.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        provider: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

// Connect LeetCode account
router.post('/me/leetcode', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { username } = req.body;

    if (!username) {
      throw new AppError(400, 'LeetCode username is required');
    }

    // Fetch LeetCode profile data via GraphQL API
    const leetcodeQuery = {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              realName
              userAvatar
              ranking
              reputation
            }
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
            }
          }
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            totalParticipants
            topPercentage
          }
          userContestRankingHistory(username: $username) {
            attended
            totalProblems
            trendingDirection
            finishTimeInSeconds
            rating
            ranking
            contest {
              title
              startTime
            }
          }
        }
      `,
      variables: { username },
    };

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify(leetcodeQuery),
    });

    const data = await response.json() as any;

    if (!data.data?.matchedUser) {
      throw new AppError(404, 'LeetCode user not found');
    }

    const matchedUser = data.data.matchedUser;
    const contestRanking = data.data.userContestRanking;

    const stats = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const totalSolved = stats.find((s: any) => s.difficulty === 'All')?.count || 0;
    const easySolved = stats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
    const mediumSolved = stats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
    const hardSolved = stats.find((s: any) => s.difficulty === 'Hard')?.count || 0;

    const totalSubmissions = stats.reduce((sum: number, s: any) => sum + (s.submissions || 0), 0);
    const acceptanceRate = totalSubmissions > 0 ? (totalSolved / totalSubmissions) * 100 : 0;

    // Update user with LeetCode data
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        leetcodeUsername: username,
        leetcodeSyncedAt: new Date(),
        leetcodeTotalSolved: totalSolved,
        leetcodeEasySolved: easySolved,
        leetcodeMediumSolved: mediumSolved,
        leetcodeHardSolved: hardSolved,
        leetcodeAcceptanceRate: Math.round(acceptanceRate * 100) / 100,
        leetcodeContestRating: contestRanking?.rating ? Math.round(contestRanking.rating) : null,
        leetcodeGlobalRanking: contestRanking?.globalRanking || null,
      },
      select: {
        id: true,
        leetcodeUsername: true,
        leetcodeSyncedAt: true,
        leetcodeTotalSolved: true,
        leetcodeEasySolved: true,
        leetcodeMediumSolved: true,
        leetcodeHardSolved: true,
        leetcodeAcceptanceRate: true,
        leetcodeContestRating: true,
        leetcodeGlobalRanking: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Sync LeetCode stats
router.post('/me/leetcode/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { leetcodeUsername: true },
    });

    if (!user?.leetcodeUsername) {
      throw new AppError(400, 'No LeetCode account connected');
    }

    // Re-fetch LeetCode data
    const leetcodeQuery = {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
            }
          }
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
          }
        }
      `,
      variables: { username: user.leetcodeUsername },
    };

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify(leetcodeQuery),
    });

    const data = await response.json() as any;

    if (!data.data?.matchedUser) {
      throw new AppError(404, 'LeetCode user not found');
    }

    const stats = data.data.matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const totalSolved = stats.find((s: any) => s.difficulty === 'All')?.count || 0;
    const easySolved = stats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
    const mediumSolved = stats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
    const hardSolved = stats.find((s: any) => s.difficulty === 'Hard')?.count || 0;
    const totalSubmissions = stats.reduce((sum: number, s: any) => sum + (s.submissions || 0), 0);
    const acceptanceRate = totalSubmissions > 0 ? (totalSolved / totalSubmissions) * 100 : 0;
    const contestRanking = data.data.userContestRanking;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        leetcodeSyncedAt: new Date(),
        leetcodeTotalSolved: totalSolved,
        leetcodeEasySolved: easySolved,
        leetcodeMediumSolved: mediumSolved,
        leetcodeHardSolved: hardSolved,
        leetcodeAcceptanceRate: Math.round(acceptanceRate * 100) / 100,
        leetcodeContestRating: contestRanking?.rating ? Math.round(contestRanking.rating) : null,
        leetcodeGlobalRanking: contestRanking?.globalRanking || null,
      },
      select: {
        leetcodeUsername: true,
        leetcodeSyncedAt: true,
        leetcodeTotalSolved: true,
        leetcodeEasySolved: true,
        leetcodeMediumSolved: true,
        leetcodeHardSolved: true,
        leetcodeAcceptanceRate: true,
        leetcodeContestRating: true,
        leetcodeGlobalRanking: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Disconnect LeetCode
router.delete('/me/leetcode', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        leetcodeUsername: null,
        leetcodeSyncedAt: null,
        leetcodeTotalSolved: null,
        leetcodeEasySolved: null,
        leetcodeMediumSolved: null,
        leetcodeHardSolved: null,
        leetcodeAcceptanceRate: null,
        leetcodeContestRating: null,
        leetcodeGlobalRanking: null,
      },
    });

    res.json({ success: true, message: 'LeetCode account disconnected' });
  } catch (error) {
    next(error);
  }
});

// Get user stats for 'me' (must be before /:id/stats)
router.get('/me/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        wins: true,
        losses: true,
        draws: true,
        totalBattles: true,
        rating: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const winRate = user.totalBattles > 0 ? (user.wins / user.totalBattles) * 100 : 0;

    const matchHistory = await prisma.matchHistory.findMany({
      where: { userId: id },
      select: { topicsPlayed: true },
    });

    const topicCounts: Record<string, number> = {};
    matchHistory.forEach((match) => {
      match.topicsPlayed.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
    const mostSolvedTopic = sortedTopics[0]?.[0] || 'arrays';
    const weakestTopic = sortedTopics[sortedTopics.length - 1]?.[0] || 'arrays';

    const submissions = await prisma.submission.findMany({
      where: { userId: id, status: 'accepted' },
      select: { runtime: true },
    });

    const avgSolveTime = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.runtime || 0), 0) / submissions.length
      : 0;

    res.json({
      success: true,
      data: {
        winRate,
        mostSolvedTopic,
        weakestTopic,
        averageSolveTime: avgSolveTime,
        rating: user.rating,
        totalBattles: user.totalBattles,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get match history for 'me' (must be before /:id/history)
router.get('/me/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const id = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.matchHistory.findMany({
        where: { userId: id },
        include: {
          battle: {
            select: {
              code: true,
              mode: true,
              difficulty: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.matchHistory.count({ where: { userId: id } }),
    ]);

    res.json({
      success: true,
      data: {
        items: history,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        rating: true,
        rank: true,
        totalBattles: true,
        wins: true,
        losses: true,
        draws: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Get user stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        wins: true,
        losses: true,
        draws: true,
        totalBattles: true,
        rating: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Calculate win rate
    const winRate = user.totalBattles > 0 ? (user.wins / user.totalBattles) * 100 : 0;

    // Get match history for topic stats
    const matchHistory = await prisma.matchHistory.findMany({
      where: { userId: id },
      select: { topicsPlayed: true },
    });

    // Count topic occurrences
    const topicCounts: Record<string, number> = {};
    matchHistory.forEach((match) => {
      match.topicsPlayed.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    // Find most and least played topics
    const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
    const mostSolvedTopic = sortedTopics[0]?.[0] || 'arrays';
    const weakestTopic = sortedTopics[sortedTopics.length - 1]?.[0] || 'arrays';

    // Get average solve time (from submissions)
    const submissions = await prisma.submission.findMany({
      where: { userId: id, status: 'accepted' },
      select: { runtime: true },
    });

    const avgSolveTime = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.runtime || 0), 0) / submissions.length
      : 0;

    res.json({
      success: true,
      data: {
        winRate,
        mostSolvedTopic,
        weakestTopic,
        averageSolveTime: avgSolveTime,
        rating: user.rating,
        totalBattles: user.totalBattles,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get match history
router.get('/:id/history', async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.matchHistory.findMany({
        where: { userId: id },
        include: {
          battle: {
            select: {
              code: true,
              mode: true,
              difficulty: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.matchHistory.count({ where: { userId: id } }),
    ]);

    res.json({
      success: true,
      data: {
        items: history,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router;
