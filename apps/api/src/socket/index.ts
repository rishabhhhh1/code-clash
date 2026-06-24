import { Server } from 'socket.io';
import { Submission } from './models/Submission';
import { Battle } from './models/Battle';
import { User } from './models/User';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join:battle', async ({ battleCode, token }) => {
      try {
        const battle = await Battle.findOne({ code: battleCode }).populate('participants');
        if (!battle) return socket.emit('error', { message: 'Battle not found' });

        socket.join(`battle_${battle.code}`);
        socket.emit('joined:battle', { code: battle.code });

        // Notify room
        io.to(`battle_${battle.code}`).emit('battle:player_joined', {
          playerCount: battle.playerCount,
        });
      } catch (error) {
        console.error('join:battle error', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    socket.on('leave:battle', async ({ battleCode }) => {
      try {
        const battle = await Battle.findOne({ code: battleCode });
        if (!battle) return socket.emit('error', { message: 'Battle not found' });

        socket.leave(`battle_${battle.code}`);
        io.to(`battle_${battle.code}`).emit('battle:player_left', {});
      } catch (error) {
        console.error('leave:battle error', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });

    socket.on('submission:result', async (payload) => {
      // Expected payload: { submissionId, status, runtime, memory, testsPassed, totalTests }
      try {
        const sub = await Submission.findById(payload.submissionId);
        if (!sub) return;

        sub.status = payload.status;
        sub.runtime = payload.runtime;
        sub.memory = payload.memory;
        sub.testsPassed = payload.testsPassed;
        sub.totalTests = payload.totalTests;
        await sub.save();

        const battle = await Battle.findById(sub.battleId);
        if (!battle) return;

        // Update leaderboard
        const entry = battle.leaderboard.find((e: any) => e.userId.toString() === sub.userId.toString());
        if (entry) {
          entry.attempts = (entry.attempts || 0) + 1;
          if (payload.status === 'accepted') {
            entry.status = 'solved';
            entry.solveTime = entry.solveTime || Math.round((Date.now() - (battle.startTime?.getTime() || Date.now())) / 1000);
            entry.score = 1; // For deathmatch: solved = 1
          }
        }

        await battle.save();

        // Emit update
        io.to(`battle_${battle.code}`).emit('submission:result', {
          userId: sub.userId,
          status: sub.status,
          runtime: sub.runtime,
          memory: sub.memory,
          testsPassed: sub.testsPassed,
          totalTests: sub.totalTests,
        });

        // If deathmatch and someone solved, end battle
        if (battle.mode === 'deathmatch') {
          const solved = battle.leaderboard.find((e: any) => e.status === 'solved');
          if (solved) {
            battle.status = 'completed';
            battle.winnerId = solved.userId;
            battle.endTime = new Date();
            await battle.save();

            io.to(`battle_${battle.code}`).emit('battle:ended', {
              winnerId: solved.userId,
            });
          }
        }
      } catch (error) {
        console.error('submission:result handler error', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};
