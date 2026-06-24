import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { Room, IRoom } from '../models/Room';
import { User, IUser } from '../models/User';
import { MatchHistory } from '../models/MatchHistory';
import { getFairProblemForRoom } from './problem.service';
import { getProblemUrl, getContestUrl, getDifficultyFromRating, getProblemset } from './codeforces';
import { grantAchievements } from './achievement.service';
import { getRankFromRating } from '@codeclash/shared';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export async function uniqueRoomCode(): Promise<string> {
  let code = generateRoomCode();
  while (await Room.findOne({ code })) {
    code = generateRoomCode();
  }
  return code;
}

export function getRequiredPlayers(mode: string, maxPlayers: number): number {
  if (mode === '1v1_duel' || mode === 'ranked_duel' || mode === 'unranked_duel') return 2;
  if (mode === 'deathmatch') return 2;
  if (mode === 'battle_royale') return Math.min(maxPlayers, 10);
  return 2;
}

export function getBattleRoyaleRating(round: number): number {
  return 800 + round * 200;
}

export async function toProblemPayload(contestId?: number | null, index?: string | null) {
  if (!contestId || !index) return null;

  const { problems } = await getProblemset();
  const problem = problems.find((p) => p.contestId === contestId && p.index === index);
  if (!problem) return null;

  const url = getProblemUrl(problem.contestId, problem.index);
  return {
    id: `${problem.contestId}-${problem.index}`,
    contestId: problem.contestId,
    index: problem.index,
    name: problem.name,
    title: problem.name,
    slug: `${problem.contestId}-${problem.index}`,
    difficulty: getDifficultyFromRating(problem.rating),
    description:
      'This battle uses Codeforces as the source of truth. Open the problem on Codeforces, write your solution there, and submit from your own Codeforces account. CodeClash tracks your verdict automatically.',
    inputFormat: null,
    outputFormat: null,
    examples: [],
    constraints: [],
    hints: null,
    topics: problem.tags,
    tags: problem.tags,
    rating: problem.rating,
    points: problem.points,
    type: problem.type,
    timeLimit: 2000,
    memoryLimit: 256,
    acceptanceRate: null,
    problemLink: url,
    url,
    contestUrl: getContestUrl(problem.contestId),
  };
}

export async function populateUsersMap(room: IRoom): Promise<Map<string, IUser>> {
  const ids = new Set<string>();
  ids.add(room.host.toString());
  room.players.forEach((p) => ids.add(p.user.toString()));
  room.pendingPlayers.forEach((id) => ids.add(id.toString()));
  room.spectators.forEach((id) => ids.add(id.toString()));

  const users = await User.find({ _id: { $in: Array.from(ids) } });
  const map = new Map<string, IUser>();
  users.forEach((u) => map.set(u._id.toString(), u));
  return map;
}

export async function finalizeBattle(room: IRoom, winnerId?: Types.ObjectId) {
  room.status = 'completed';
  room.endedAt = new Date();
  if (winnerId) room.winner = winnerId;

  const sorted = [...room.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.solveTime && b.solveTime) return a.solveTime - b.solveTime;
    return b.problemsSolved - a.problemsSolved;
  });

  sorted.forEach((p, i) => {
    p.rank = i + 1;
  });

  await room.save();

  for (const player of sorted) {
    const user = await User.findById(player.user);
    if (!user) continue;

    const isWinner = winnerId?.equals(player.user) ?? player.rank === 1;
    const ratingChange = isWinner ? 25 : -15;

    if (isWinner) {
      user.battleWins += 1;
      user.winStreak += 1;
      user.maxWinStreak = Math.max(user.maxWinStreak, user.winStreak);
      user.rating += ratingChange;
    } else {
      user.battleLosses += 1;
      user.winStreak = 0;
      user.rating = Math.max(0, user.rating + ratingChange);
    }
    user.totalBattles += 1;
    user.maxRating = Math.max(user.maxRating, user.rating);
    user.rank = getRankFromRating(user.rating);
    await user.save();

    await MatchHistory.create({
      room: room._id,
      user: player.user,
      placement: player.rank,
      ratingChange,
      wasWinner: isWinner,
      problemsSolved: player.problemsSolved,
      totalTime: player.solveTime,
      mode: room.mode,
      topics: room.topics,
    });

    await grantAchievements(user._id, {
      isWinner,
      winStreak: user.winStreak,
      mode: room.mode,
      topics: room.topics,
    });
  }

  return room;
}

export async function assignFairProblem(room: IRoom): Promise<IRoom> {
  if (room.mode === 'battle_royale') {
    const rating = getBattleRoyaleRating(room.currentRound);
    room.difficulty = rating < 1200 ? 'easy' : rating < 1700 ? 'medium' : 'hard';
  }

  const problem = await getFairProblemForRoom(room);
  if (!problem) throw new Error('No problems found for this difficulty/topic combination');

  const roomProblem = {
    contestId: problem.contestId,
    index: problem.index,
    name: problem.name,
    rating: problem.rating,
    tags: problem.tags,
    solvedBy: [] as Types.ObjectId[],
  };

  if (room.mode === 'battle_royale' || room.mode === 'arena') {
    room.problems.push(roomProblem);
  } else {
    room.problems = [roomProblem];
  }

  return room;
}

export async function canStartBattle(room: IRoom): Promise<{ ok: boolean; reason?: string }> {
  const required = getRequiredPlayers(room.mode, room.maxPlayers);
  if (room.players.length < required) {
    return { ok: false, reason: `Need at least ${required} players` };
  }

  const allReady = room.players.every((p) => p.status === 'ready');
  if (!allReady) {
    return { ok: false, reason: 'All players must be ready' };
  }

  if (room.status !== 'waiting') {
    return { ok: false, reason: 'Battle has already started' };
  }

  return { ok: true };
}

export function generateInviteCode(): string {
  return randomUUID().substring(0, 8).toUpperCase();
}
