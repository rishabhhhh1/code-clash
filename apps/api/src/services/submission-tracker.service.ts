import { Server as SocketIOServer } from 'socket.io';
import { Room } from '../models/Room';
import { User } from '../models/User';
import { Submission } from '../models/Submission';
import {
  fetchUserSubmissions,
  checkUserSolvedProblem,
} from './codeforces';
import { populateUsersMap, finalizeBattle } from './battle.service';
import { serializeRoom, serializePlayer } from '../utils/serializers';

const activePollers = new Map<string, NodeJS.Timeout>();

function verdictToStatus(verdict?: string): string {
  if (!verdict) return 'pending';
  if (verdict === 'OK') return 'accepted';
  if (verdict === 'WRONG_ANSWER') return 'wrong_answer';
  if (verdict === 'RUNTIME_ERROR') return 'runtime_error';
  if (verdict === 'COMPILATION_ERROR') return 'compile_error';
  if (verdict === 'TIME_LIMIT_EXCEEDED') return 'time_limit_exceeded';
  if (verdict === 'MEMORY_LIMIT_EXCEEDED') return 'memory_limit_exceeded';
  return 'pending';
}

export function startSubmissionTracker(io: SocketIOServer, roomId: string) {
  if (activePollers.has(roomId)) return;

  const interval = setInterval(async () => {
    try {
      const room = await Room.findById(roomId);
      if (!room || room.status !== 'active') {
        stopSubmissionTracker(roomId);
        return;
      }

      const currentProblem = room.problems[room.currentRound] || room.problems[0];
      if (!currentProblem) return;

      const sinceSeconds = room.startedAt
        ? Math.floor(room.startedAt.getTime() / 1000)
        : undefined;

      let stateChanged = false;

      for (const player of room.players) {
        if (player.status === 'solved' || player.status === 'eliminated') continue;

        const user = await User.findById(player.user);
        if (!user) continue;

        const submissions = await fetchUserSubmissions(user.codeforcesHandle, 1, 30);
        const problemSubs = submissions.filter(
          (s) =>
            s.problem.contestId === currentProblem.contestId &&
            s.problem.index.toUpperCase() === currentProblem.index.toUpperCase() &&
            (!sinceSeconds || s.creationTimeSeconds >= sinceSeconds)
        );

        player.submissionsCount = problemSubs.length;

        const accepted = problemSubs.find((s) => s.verdict === 'OK');
        if (accepted && player.problemsSolved === 0) {
          player.status = 'solved';
          player.problemsSolved = 1;
          player.score += 100 + Math.max(0, 50 - player.submissionsCount * 5);
          player.solveTime = accepted.relativeTimeSeconds || 0;
          currentProblem.solvedBy.push(player.user);
          stateChanged = true;

          await Submission.create({
            room: room._id,
            user: player.user,
            problemContestId: currentProblem.contestId,
            problemIndex: currentProblem.index,
            language: accepted.programmingLanguage,
            codeforcesRunId: accepted.id,
            verdict: 'accepted',
            runtime: accepted.timeConsumedMillis,
            memory: accepted.memoryConsumedBytes,
            isAccepted: true,
            attemptNumber: player.submissionsCount,
          });

          io.to(`room:${room.code}`).emit('feed:event', {
            type: 'solve',
            message: `${user.codeforcesHandle} solved the problem!`,
            userId: user._id.toString(),
            username: user.codeforcesHandle,
            solveTime: player.solveTime,
            attempts: player.submissionsCount,
          });
        } else if (problemSubs.length > player.submissionsCount) {
          const latest = problemSubs[0];
          if (latest && latest.verdict && latest.verdict !== 'OK') {
            io.to(`room:${room.code}`).emit('feed:event', {
              type: 'attempt',
              message: `${user.codeforcesHandle} got ${verdictToStatus(latest.verdict)}`,
              userId: user._id.toString(),
              username: user.codeforcesHandle,
              verdict: verdictToStatus(latest.verdict),
            });
          }
        }
      }

      if (stateChanged) {
        await room.save();

        const usersMap = await populateUsersMap(room);
        const payload = serializeRoom(room, usersMap);
        const players = room.players.map((p) =>
          serializePlayer(p, usersMap.get(p.user.toString()))
        );

        io.to(`room:${room.code}`).emit('leaderboard:update', { players, room: payload });
        io.to(`room:${room.code}`).emit('submission:result', {
          players,
          room: payload,
        });

        if (room.mode === '1v1_duel' || room.mode === 'deathmatch' || room.mode === 'ranked_duel') {
          const winner = room.players.find((p) => p.status === 'solved');
          if (winner) {
            await finalizeBattle(room, winner.user);
            stopSubmissionTracker(roomId);
            io.to(`room:${room.code}`).emit('battle:ended', {
              room: serializeRoom(room, usersMap),
              winner: usersMap.get(winner.user.toString()),
            });
          }
        }

        if (room.mode === 'battle_royale') {
          const alive = room.players.filter((p) => p.status !== 'eliminated' && p.status !== 'solved');
          const unsolved = room.players.filter((p) => p.status !== 'solved' && p.status !== 'eliminated');

          if (unsolved.length === 0 && alive.length <= 1) {
            const winner = room.players.find((p) => p.status === 'solved');
            if (winner) {
              await finalizeBattle(room, winner.user);
              stopSubmissionTracker(roomId);
              io.to(`room:${room.code}`).emit('battle:ended', {
                room: serializeRoom(room, usersMap),
                winner: usersMap.get(winner.user.toString()),
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Submission tracker error:', err);
    }
  }, 10000);

  activePollers.set(roomId, interval);
}

export function stopSubmissionTracker(roomId: string) {
  const interval = activePollers.get(roomId);
  if (interval) {
    clearInterval(interval);
    activePollers.delete(roomId);
  }
}

export async function checkPlayerStatus(
  roomCode: string,
  userId: string
) {
  const room = await Room.findOne({ code: roomCode.toUpperCase() });
  if (!room) throw new Error('Room not found');

  const currentProblem = room.problems[room.currentRound] || room.problems[0];
  if (!currentProblem) throw new Error('No problem assigned');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const sinceSeconds = room.startedAt
    ? Math.floor(room.startedAt.getTime() / 1000)
    : undefined;

  const accepted = await checkUserSolvedProblem(
    user.codeforcesHandle,
    currentProblem.contestId,
    currentProblem.index,
    sinceSeconds
  );

  const submissions = await fetchUserSubmissions(user.codeforcesHandle, 1, 20);
  const problemSubs = submissions.filter(
    (s) =>
      s.problem.contestId === currentProblem.contestId &&
      s.problem.index.toUpperCase() === currentProblem.index.toUpperCase()
  );

  return {
    hasSolved: Boolean(accepted),
    submissions: problemSubs.slice(0, 5).map((s) => ({
      id: s.id,
      verdict: s.verdict,
      programmingLanguage: s.programmingLanguage,
      timeConsumedMillis: s.timeConsumedMillis,
      memoryConsumedBytes: s.memoryConsumedBytes,
      creationTimeSeconds: s.creationTimeSeconds,
    })),
    codeforcesUrl: `https://codeforces.com/problemset/problem/${currentProblem.contestId}/${currentProblem.index}`,
  };
}
