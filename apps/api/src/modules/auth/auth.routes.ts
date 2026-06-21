import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, generateToken, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import { config } from '../../config';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

// Register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new AppError(400, existingUser.email === email ? 'Email already in use' : 'Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        rating: true,
        rank: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          rating: user.rating,
          rank: user.rank,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// OAuth Login/Signup
router.post('/oauth/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { code } = req.body;

    console.log(`[OAuth] Received ${provider} login request`);
    console.log(`[OAuth] Code: ${code ? code.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`[OAuth] Google Client ID configured: ${!!config.google.clientId}`);
    console.log(`[OAuth] Google Client Secret configured: ${!!config.google.clientSecret}`);
    console.log(`[OAuth] Callback URL: ${config.google.callbackUrl}`);

    if (!code) {
      throw new AppError(400, 'Authorization code is required');
    }

    let email = '';
    let oauthId = '';
    let username = '';
    let avatar = '';
    let accessToken = '';
    let refreshToken = '';
    let expiresAt: Date | null = null;
    let scope = '';

    const isMock = code.startsWith('mock-') || 
      (provider === 'google' && (!config.google.clientId || !config.google.clientSecret)) ||
      (provider === 'github' && (!config.github.clientId || !config.github.clientSecret));

    if (isMock) {
      const uniqueSuffix = code.replace('mock-', '').substring(0, 8) || Math.random().toString(36).substring(2, 8);
      email = `mock_${provider}_${uniqueSuffix}@example.com`;
      username = `${provider}_user_${uniqueSuffix}`;
      oauthId = `${provider}-mock-id-${uniqueSuffix}`;
      avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
      accessToken = 'mock-access-token';
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      if (provider === 'google') {
        console.log('[OAuth] Exchanging code with Google token endpoint...');
        console.log(`[OAuth] Redirect URI being sent to Google: ${config.google.callbackUrl}`);

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: config.google.clientId,
            client_secret: config.google.clientSecret,
            redirect_uri: config.google.callbackUrl,
            grant_type: 'authorization_code',
          }),
        });

        const tokens = await tokenResponse.json() as any;
        console.log(`[OAuth] Google token response status: ${tokenResponse.status}`);
        
        if (!tokenResponse.ok) {
          console.error('[OAuth] Google token exchange FAILED:', JSON.stringify(tokens, null, 2));
          throw new AppError(400, tokens.error_description || 'Failed to exchange Google OAuth code');
        }

        console.log('[OAuth] Google token exchange SUCCESS. Fetching user info...');

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const userInfo = await userInfoResponse.json() as any;
        console.log(`[OAuth] Google userinfo response status: ${userInfoResponse.status}`);
        
        if (!userInfoResponse.ok) {
          console.error('[OAuth] Google userinfo FAILED:', JSON.stringify(userInfo, null, 2));
          throw new AppError(400, 'Failed to fetch Google user info');
        }

        console.log(`[OAuth] Google user: ${userInfo.email} (${userInfo.name})`);

        email = userInfo.email;
        oauthId = userInfo.sub;
        username = userInfo.name ? userInfo.name.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 15) : userInfo.email.split('@')[0];
        avatar = userInfo.picture || '';
        accessToken = tokens.access_token;
        refreshToken = tokens.refresh_token || '';
        expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
        scope = tokens.scope || '';
      } else if (provider === 'github') {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: config.github.clientId,
            client_secret: config.github.clientSecret,
            code,
            redirect_uri: config.github.callbackUrl,
          }),
        });

        const tokens = await tokenResponse.json() as any;
        if (!tokenResponse.ok || tokens.error) {
          throw new AppError(400, tokens.error_description || 'Failed to exchange GitHub OAuth code');
        }

        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: 'application/json',
            'User-Agent': 'CodeClash',
          },
        });

        const userInfo = await userResponse.json() as any;
        if (!userResponse.ok) {
          throw new AppError(400, 'Failed to fetch GitHub user info');
        }

        oauthId = String(userInfo.id);
        username = userInfo.login;
        avatar = userInfo.avatar_url || '';

        email = userInfo.email;
        if (!email) {
          const emailsResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              Accept: 'application/json',
              'User-Agent': 'CodeClash',
            },
          });
          if (emailsResponse.ok) {
            const emails = await emailsResponse.json() as any;
            const primaryEmail = emails.find((e: any) => e.primary && e.verified);
            email = primaryEmail ? primaryEmail.email : (emails[0]?.email || '');
          }
        }

        if (!email) {
          email = `${username}@users.noreply.github.com`;
        }
        accessToken = tokens.access_token;
        scope = tokens.scope || '';
      } else {
        throw new AppError(400, `Unsupported provider: ${provider}`);
      }
    }

    // Clean up username for constraints (only letters, numbers, underscores, max 20 chars)
    let sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      sanitizedUsername = `user_${oauthId.substring(0, 10)}`;
    }

    // Find user by email first
    let user = await prisma.user.findUnique({
      where: { email },
    });

    console.log(`[OAuth] User lookup by email (${email}): ${user ? 'FOUND' : 'NOT FOUND'}`);

    if (user) {
      // Check if OAuth account already linked
      const existingOAuth = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider,
            providerId: oauthId,
          },
        },
      });

      if (!existingOAuth) {
        // Link OAuth account to existing user
        await prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider,
            providerId: oauthId,
            email,
            username,
            avatar,
            accessToken,
            refreshToken,
            expiresAt,
            scope,
          },
        });
      } else {
        // Update existing OAuth account
        await prisma.oAuthAccount.update({
          where: { id: existingOAuth.id },
          data: {
            accessToken,
            refreshToken,
            expiresAt,
            scope,
            avatar: avatar || existingOAuth.avatar,
          },
        });
      }
    } else {
      // Verify username uniqueness, append suffix if duplicate
      let finalUsername = sanitizedUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${sanitizedUsername.substring(0, 15)}_${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email,
          username: finalUsername,
          avatar,
          oauthAccounts: {
            create: {
              provider,
              providerId: oauthId,
              email,
              username,
              avatar,
              accessToken,
              refreshToken,
              expiresAt,
              scope,
            },
          },
        },
      });
      console.log(`[OAuth] New user created: ${user.id} (${finalUsername})`);
    }

    // Generate token
    const token = generateToken(user);
    console.log(`[OAuth] JWT generated for user ${user.id} (${user.username})`);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[OAuth] Login successful. Returning token to frontend.`);
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          rating: user.rating,
          rank: user.rank,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error(`[OAuth] Error during ${req.params.provider} authentication:`, error.message || error);
    next(error);
  }
});

// Unlink OAuth account
router.delete('/oauth/:provider', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { provider } = req.params;
    const userId = req.user!.id;

    // Check if user has password or other OAuth accounts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        oauthAccounts: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const oauthCount = user.oauthAccounts.length;
    const hasPassword = !!user.passwordHash;

    if (!hasPassword && oauthCount <= 1) {
      throw new AppError(400, 'Cannot unlink the only authentication method. Set a password first.');
    }

    const oauthAccount = await prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!oauthAccount) {
      throw new AppError(404, 'OAuth account not found');
    }

    await prisma.oAuthAccount.delete({
      where: { id: oauthAccount.id },
    });

    res.json({ success: true, message: `${provider} account unlinked successfully` });
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
      email: true,
      username: true,
      avatar: true,
      bio: true,
      rating: true,
      rank: true,
      totalBattles: true,
      wins: true,
      losses: true,
      draws: true,
      leetcodeUsername: true,
      leetcodeSyncedAt: true,
      leetcodeTotalSolved: true,
      leetcodeEasySolved: true,
      leetcodeMediumSolved: true,
      leetcodeHardSolved: true,
      leetcodeAcceptanceRate: true,
      leetcodeContestRating: true,
      leetcodeGlobalRanking: true,
      createdAt: true,
    },
  });

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
