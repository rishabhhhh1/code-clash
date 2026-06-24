import { Types } from 'mongoose';
import { IUser } from '../models/User';
import { IRoom } from '../models/Room';

export function serializeUser(user: IUser | null | undefined) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    codeforcesHandle: user.codeforcesHandle,
    username: user.username || user.codeforcesHandle,
    avatar: user.avatar,
    bio: user.bio,
    rating: user.rating,
    maxRating: user.maxRating,
    rank: user.rank,
    contribution: user.contribution,
    battleWins: user.battleWins,
    battleLosses: user.battleLosses,
    winStreak: user.winStreak,
    maxWinStreak: user.maxWinStreak,
    totalBattles: user.totalBattles,
    favoriteTopics: user.favoriteTopics,
    codeforcesRating: user.rating,
    codeforcesMaxRating: user.maxRating,
    codeforcesRank: user.rank,
    isOnline: user.isOnline,
    createdAt: user.createdAt,
  };
}

export function serializePlayer(player: IRoom['players'][0], user?: IUser | null) {
  const u = user || (player.user as unknown as IUser);
  return {
    id: u?._id?.toString() || player.user.toString(),
    user: serializeUser(u),
    status: player.status,
    score: player.score,
    rank: player.rank,
    problemsSolved: player.problemsSolved,
    submissionsCount: player.submissionsCount,
    solveTime: player.solveTime,
    penalty: player.penalty,
    isAlive: player.status !== 'eliminated' && player.status !== 'disconnected',
    isReady: player.status === 'ready',
    joinedAt: player.joinedAt,
  };
}

export function serializeRoom(
  room: IRoom,
  usersMap?: Map<string, IUser>
) {
  const hostId = room.host.toString();
  const host = usersMap?.get(hostId);

  const players = room.players.map((p) => {
    const userId = p.user.toString();
    return serializePlayer(p, usersMap?.get(userId));
  });

  const currentProblem = room.problems[room.currentRound] || room.problems[0];

  return {
    id: room._id.toString(),
    code: room.code,
    name: room.name,
    creatorId: hostId,
    host: hostId,
    mode: room.mode,
    status: room.status,
    difficulty: room.difficulty,
    topics: room.topics,
    timeControl: Math.floor(room.timeControl / 60) || room.timeControl,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    isPublic: room.isPublic,
    inviteCode: room.inviteCode,
    joinApproval: room.joinApproval,
    pendingPlayers: room.pendingPlayers.map((id) => id.toString()),
    spectators: room.spectators.map((id) => id.toString()),
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    contestId: currentProblem?.contestId ?? null,
    problemIndex: currentProblem?.index ?? null,
    problems: room.problems,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    startTime: room.startedAt,
    endTime: room.endedAt
      ? room.endedAt
      : room.startedAt
        ? new Date(room.startedAt.getTime() + room.timeControl * 1000)
        : null,
    winner: room.winner?.toString(),
    players,
    creator: serializeUser(host),
    createdAt: room.createdAt,
  };
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
