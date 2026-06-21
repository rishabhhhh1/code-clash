import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email: string;
      username: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
        username: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, username: true },
      });

      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};

export const generateToken = (user: { id: string; email: string; username: string }): string => {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
};
