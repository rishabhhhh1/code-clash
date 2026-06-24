import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { connectDatabase } from './config/database';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { battlesRouter } from './modules/battles/battles.routes';
import { problemsRouter } from './modules/problems/problems.routes';
import { rankingRouter } from './modules/ranking/ranking.routes';
import { matchmakingRouter } from './modules/matchmaking/matchmaking.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { setupSocketHandlers } from './socket';

const app = express();
const httpServer = createServer(app);

// CORS origins - allow both local and production
const allowedOrigins = [
  config.appUrl,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

// In production, also allow the Vercel URL from env
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.set('io', io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'production' ? 200 : 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CodeClash API',
    version: '0.1.0',
    status: 'running',
    docs: '/health',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/battles', battlesRouter);
app.use('/api/problems', problemsRouter);
app.use('/api/rankings', rankingRouter);
app.use('/api/matchmaking', matchmakingRouter);
app.use('/api/admin', adminRouter);

// Socket.IO handlers
setupSocketHandlers(io);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectDatabase();
    console.log('MongoDB connected');

    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, io };
