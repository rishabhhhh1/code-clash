import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface TokenPayload {
  userId: string;
  codeforcesHandle?: string;
}

function readToken(req: Request): string | undefined {
  return req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = readToken(req);
    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = readToken(req);
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
      const user = await User.findById(decoded.userId);
      if (user) req.user = user;
    }
  } catch {
    // optional auth ignores invalid tokens
  }
  next();
};

export const generateToken = (user: IUser | string): string => {
  const userId = typeof user === 'string' ? user : user._id.toString();
  const codeforcesHandle =
    typeof user === 'string' ? undefined : user.codeforcesHandle;

  return jwt.sign({ userId, codeforcesHandle }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
};
