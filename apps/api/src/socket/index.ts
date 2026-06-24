import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Room } from '../models/Room';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  codeforcesHandle?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        codeforcesHandle?: string;
      };

      socket.userId = decoded.userId;
      socket.codeforcesHandle = decoded.codeforcesHandle;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.codeforcesHandle || socket.userId} (${socket.userId})`);

    socket.join(`user:${socket.userId}`);

    socket.on('battle:join', async (data: { battleCode: string }) => {
      try {
        const { battleCode } = data;
        const room = await Room.findOne({ code: battleCode.toUpperCase() });

        if (!room) {
          socket.emit('error', { message: 'Battle not found' });
          return;
        }

        const isParticipant = room.players.some(
          (p) => p.user.toString() === socket.userId
        );
        const isSpectator = room.spectators.some(
          (id) => id.toString() === socket.userId
        );

        if (!isParticipant && !isSpectator) {
          socket.emit('error', { message: 'Not a participant' });
          return;
        }

        socket.join(`room:${room.code}`);
        socket.data.roomCode = room.code;

        socket.to(`room:${room.code}`).emit('battle:player_joined', {
          userId: socket.userId,
          username: socket.codeforcesHandle,
        });

        console.log(`${socket.codeforcesHandle || socket.userId} joined battle ${battleCode}`);
      } catch {
        socket.emit('error', { message: 'Failed to join battle' });
      }
    });

    socket.on('battle:leave', async () => {
      const roomCode = socket.data.roomCode as string | undefined;
      if (roomCode) {
        socket.to(`room:${roomCode}`).emit('battle:player_left', {
          userId: socket.userId,
          username: socket.codeforcesHandle,
        });
        socket.leave(`room:${roomCode}`);
        socket.data.roomCode = null;
      }
    });

    socket.on('submission:code', async (data: { battleCode: string; problemId: string }) => {
      try {
        const room = await Room.findOne({ code: data.battleCode.toUpperCase() });
        if (!room) {
          socket.emit('error', { message: 'Battle not found' });
          return;
        }

        io.to(`room:${room.code}`).emit('submission:result', {
          userId: socket.userId,
          username: socket.codeforcesHandle,
          problemId: data.problemId,
          status: 'pending',
        });
      } catch {
        socket.emit('error', { message: 'Failed to process submission' });
      }
    });

    socket.on('chat:message', (data: { battleCode: string; message: string }) => {
      const roomCode = socket.data.roomCode as string | undefined;
      if (roomCode) {
        io.to(`room:${roomCode}`).emit('chat:message', {
          userId: socket.userId,
          username: socket.codeforcesHandle,
          message: data.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('leaderboard:request', async () => {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      const userIds = room.players.map((p) => p.user);
      const users = await User.find({ _id: { $in: userIds } });
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));

      const players = room.players
        .map((p) => {
          const user = userMap.get(p.user.toString());
          return {
            userId: p.user.toString(),
            codeforcesHandle: user?.codeforcesHandle,
            avatar: user?.avatar,
            rating: user?.rating,
            score: p.score,
            rank: p.rank,
            problemsSolved: p.problemsSolved,
            isAlive: p.isAlive,
          };
        })
        .sort((a, b) => b.score - a.score);

      socket.emit('leaderboard:update', { players });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.codeforcesHandle || socket.userId}`);
    });

    socket.on('matchmaking:join_queue', (data) => {
      console.log(`${socket.codeforcesHandle || socket.userId} joined matchmaking queue`, data);
    });

    socket.on('matchmaking:leave_queue', () => {
      console.log(`${socket.codeforcesHandle || socket.userId} left matchmaking queue`);
    });

    socket.on('matchmaking:cancel', () => {
      console.log(`${socket.codeforcesHandle || socket.userId} cancelled matchmaking`);
    });
  });
}
