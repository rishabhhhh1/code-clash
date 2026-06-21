import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
        username: string;
      };

      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join battle room
    socket.on('battle:join', async (data: { battleCode: string }) => {
      try {
        const { battleCode } = data;
        const battle = await prisma.battle.findUnique({
          where: { code: battleCode.toUpperCase() },
        });

        if (!battle) {
          socket.emit('error', { message: 'Battle not found' });
          return;
        }

        // Check if user is a participant
        const player = await prisma.battlePlayer.findFirst({
          where: {
            battleId: battle.id,
            userId: socket.userId,
          },
        });

        if (!player) {
          socket.emit('error', { message: 'Not a participant' });
          return;
        }

        // Join the battle room
        socket.join(`battle:${battle.id}`);
        socket.data.battleId = battle.id;

        // Notify others
        socket.to(`battle:${battle.id}`).emit('battle:player_joined', {
          userId: socket.userId,
          username: socket.username,
        });

        console.log(`${socket.username} joined battle ${battleCode}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to join battle' });
      }
    });

    // Leave battle room
    socket.on('battle:leave', async () => {
      const battleId = socket.data.battleId;
      if (battleId) {
        socket.to(`battle:${battleId}`).emit('battle:player_left', {
          userId: socket.userId,
          username: socket.username,
        });
        socket.leave(`battle:${battleId}`);
        socket.data.battleId = null;
      }
    });

    // Submission event
    socket.on('submission:code', async (data: { battleCode: string; problemId: string; code: string; language: string }) => {
      try {
        const { battleCode, problemId, code, language } = data;
        const battle = await prisma.battle.findUnique({
          where: { code: battleCode.toUpperCase() },
        });

        if (!battle) {
          socket.emit('error', { message: 'Battle not found' });
          return;
        }

        // Broadcast submission status to battle room
        io.to(`battle:${battle.id}`).emit('submission:result', {
          userId: socket.userId,
          username: socket.username,
          problemId,
          status: 'pending',
        });

        console.log(`${socket.username} submitted code for problem ${problemId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process submission' });
      }
    });

    // Chat message
    socket.on('chat:message', (data: { battleCode: string; message: string }) => {
      const battleId = socket.data.battleId;
      if (battleId) {
        io.to(`battle:${battleId}`).emit('chat:message', {
          userId: socket.userId,
          username: socket.username,
          message: data.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Leaderboard update
    socket.on('leaderboard:request', async () => {
      const battleId = socket.data.battleId;
      if (battleId) {
        const players = await prisma.battlePlayer.findMany({
          where: { battleId },
          include: {
            user: {
              select: { id: true, username: true, avatar: true, rating: true },
            },
          },
          orderBy: { score: 'desc' },
        });

        socket.emit('leaderboard:update', { players });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);
    });

    // Matchmaking events
    socket.on('matchmaking:join_queue', (data) => {
      console.log(`${socket.username} joined matchmaking queue`, data);
    });

    socket.on('matchmaking:leave_queue', () => {
      console.log(`${socket.username} left matchmaking queue`);
    });

    socket.on('matchmaking:cancel', () => {
      console.log(`${socket.username} cancelled matchmaking`);
    });
  });
}
