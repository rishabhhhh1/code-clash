export type Rank =
  | 'newbie'
  | 'pupil'
  | 'specialist'
  | 'expert'
  | 'candidate_master'
  | 'master'
  | 'international_master'
  | 'grandmaster'
  | 'international_grandmaster'
  | 'legendary_grandmaster';

export type BattleMode =
  | '1v1_duel'
  | 'ranked_duel'
  | 'unranked_duel'
  | 'deathmatch'
  | 'multiplayer'
  | 'public_room'
  | 'private_room'
  | 'topic_battle'
  | 'battle_royale'
  | 'arena';

export type BattleStatus =
  | 'waiting'
  | 'starting'
  | 'active'
  | 'completed'
  | 'cancelled';

export type PlayerStatus =
  | 'waiting'
  | 'ready'
  | 'playing'
  | 'solved'
  | 'eliminated'
  | 'disconnected';

export type SubmissionVerdict =
  | 'accepted'
  | 'wrong_answer'
  | 'runtime_error'
  | 'compile_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'pending'
  | 'judging';

export type Language = 'cpp' | 'java' | 'python' | 'javascript';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const TOPICS = [
  'binary_search',
  'graphs',
  'trees',
  'dynamic_programming',
  'greedy',
  'strings',
  'math',
  'number_theory',
  'sliding_window',
  'bitmask',
  'two_pointers',
  'bfs',
  'dfs',
  'sorting',
  'hashing',
  'stack',
  'queue',
  'heap',
  'trie',
  'segment_tree',
  'divide_and_conquer',
  'backtracking',
  'union_find',
  'geometry',
  'combinatorics',
  'game_theory',
] as const;

export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, string> = {
  binary_search: 'Binary Search',
  graphs: 'Graphs',
  trees: 'Trees',
  dynamic_programming: 'Dynamic Programming',
  greedy: 'Greedy',
  strings: 'Strings',
  math: 'Math',
  number_theory: 'Number Theory',
  sliding_window: 'Sliding Window',
  bitmask: 'Bitmask',
  two_pointers: 'Two Pointers',
  bfs: 'BFS',
  dfs: 'DFS',
  sorting: 'Sorting',
  hashing: 'Hashing',
  stack: 'Stack',
  queue: 'Queue',
  heap: 'Heap',
  trie: 'Trie',
  segment_tree: 'Segment Tree',
  divide_and_conquer: 'Divide and Conquer',
  backtracking: 'Backtracking',
  union_find: 'Union Find',
  geometry: 'Geometry',
  combinatorics: 'Combinatorics',
  game_theory: 'Game Theory',
};

export const RANK_THRESHOLDS: Record<Rank, { min: number; max: number }> = {
  newbie: { min: 0, max: 1199 },
  pupil: { min: 1200, max: 1399 },
  specialist: { min: 1400, max: 1599 },
  expert: { min: 1600, max: 1899 },
  candidate_master: { min: 1900, max: 2099 },
  master: { min: 2100, max: 2299 },
  international_master: { min: 2300, max: 2399 },
  grandmaster: { min: 2400, max: 2599 },
  international_grandmaster: { min: 2600, max: 2899 },
  legendary_grandmaster: { min: 2900, max: 5000 },
};

export const RANK_LABELS: Record<Rank, string> = {
  newbie: 'Newbie',
  pupil: 'Pupil',
  specialist: 'Specialist',
  expert: 'Expert',
  candidate_master: 'Candidate Master',
  master: 'Master',
  international_master: 'International Master',
  grandmaster: 'Grandmaster',
  international_grandmaster: 'International Grandmaster',
  legendary_grandmaster: 'Legendary Grandmaster',
};

export const RANK_COLORS: Record<Rank, string> = {
  newbie: '#808080',
  pupil: '#008000',
  specialist: '#03a89e',
  expert: '#0000ff',
  candidate_master: '#aa00aa',
  master: '#ff8c00',
  international_master: '#ff8c00',
  grandmaster: '#ff0000',
  international_grandmaster: '#ff0000',
  legendary_grandmaster: '#ff0000',
};

export function getRankFromRating(rating: number): Rank {
  if (rating >= 2900) return 'legendary_grandmaster';
  if (rating >= 2600) return 'international_grandmaster';
  if (rating >= 2400) return 'grandmaster';
  if (rating >= 2300) return 'international_master';
  if (rating >= 2100) return 'master';
  if (rating >= 1900) return 'candidate_master';
  if (rating >= 1600) return 'expert';
  if (rating >= 1400) return 'specialist';
  if (rating >= 1200) return 'pupil';
  return 'newbie';
}

export function getMatchmakingRange(rating: number): { min: number; max: number } {
  const range = 200;
  return { min: Math.max(0, rating - range), max: rating + range };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SocketEvents {
  'room:join': (data: { roomCode: string }) => void;
  'room:leave': (data: { roomCode: string }) => void;
  'room:ready': (data: { roomCode: string }) => void;
  'room:unready': (data: { roomCode: string }) => void;
  'room:start': (data: { roomCode: string }) => void;
  'room:approve': (data: { roomCode: string; userId: string }) => void;
  'room:reject': (data: { roomCode: string; userId: string }) => void;
  'battle:submit': (data: { roomCode: string; problemIndex: number; contestId: number; language: Language }) => void;
  'chat:message': (data: { roomCode: string; message: string }) => void;
  'spectator:join': (data: { roomCode: string }) => void;
  'spectator:leave': (data: { roomCode: string }) => void;
  'lobby:subscribe': () => void;
  'lobby:unsubscribe': () => void;
}
