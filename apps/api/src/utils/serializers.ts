export const serializeUser = (user: any) => {
  return {
    id: user._id,
    codeforcesHandle: user.codeforcesHandle,
    username: user.username,
    avatar: user.avatar,
    rating: user.rating,
    maxRating: user.maxRating,
    rank: user.rank,
    contribution: user.contribution,
    battleWins: user.battleWins,
    battleLosses: user.battleLosses,
    battleDraws: user.battleDraws,
    totalBattles: user.totalBattles,
    winStreak: user.winStreak,
    isOnline: user.isOnline,
    favoriteTopics: user.favoriteTopics,
    createdAt: user.createdAt,
  };
};

export const serializeBattle = (battle: any) => {
  return {
    id: battle._id,
    code: battle.code,
    creatorId: battle.creatorId,
    mode: battle.mode,
    status: battle.status,
    playerCount: battle.playerCount,
    maxPlayers: battle.maxPlayers,
    difficulty: battle.difficulty,
    topics: battle.topics,
    timeLimit: battle.timeLimit,
    isPublic: battle.isPublic,
    problemId: battle.problemId,
    participants: battle.participants,
    spectators: battle.spectators,
    startTime: battle.startTime,
    endTime: battle.endTime,
    leaderboard: battle.leaderboard,
    createdAt: battle.createdAt,
  };
};

export const serializeProblem = (problem: any) => {
  return {
    id: problem._id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
    description: problem.description,
    examples: problem.examples,
    constraints: problem.constraints,
    topics: problem.topics,
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    rating: problem.rating,
    solveCount: problem.solveCount,
    submissions: problem.submissions,
  };
};
