export * from './types';

import {
  Difficulty,
  Topic,
  BattleMode,
  BattleStatus,
  Language,
  SubmissionStatus,
} from './types';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  rating: number;
  rank: string;
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  winRate: number;
  favoriteTopics: string[];
  averageSolveTime: number;
  highestPlacement: number;
}

// Problem types
export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  description: string;
  examples: TestCase[];
  constraints: string[];
  testCases: TestCase[];
  topics: Topic[];
  timeLimit: number;
  memoryLimit: number;
}

export interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

// Battle types
export interface Battle {
  id: string;
  code: string;
  creatorId: string;
  mode: BattleMode;
  status: BattleStatus;
  playerCount: number;
  maxPlayers: number;
  difficulty: Difficulty;
  topics: Topic[];
  timeControl: number;
  isPublic: boolean;
  inviteCode?: string;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
}

export interface BattlePlayer {
  id: string;
  battleId: string;
  userId: string;
  user: User;
  score: number;
  rank: number;
  problemsSolved: number;
  submissionsCount: number;
  isAlive: boolean;
  joinedAt: Date;
}

// Submission types
export interface Submission {
  id: string;
  battleId: string;
  userId: string;
  problemId: string;
  code: string;
  language: Language;
  status: SubmissionStatus;
  runtime?: number;
  memory?: number;
  score: number;
  createdAt: Date;
}

// Match history types
export interface MatchHistory {
  id: string;
  userId: string;
  battleId: string;
  battle: Battle;
  placement: number;
  ratingChange: number;
  topicsPlayed: Topic[];
  createdAt: Date;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  user: User;
  rating: number;
  battlesPlayed: number;
  winRate: number;
}

// Statistics types
export interface UserStats {
  accuracy: number;
  acceptedRate: number;
  averageSubmissionTime: number;
  mostSolvedTopic: Topic;
  weakestTopic: Topic;
  rankProgression: { date: Date; rank: string; rating: number }[];
}
