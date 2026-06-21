// Rank types
export type Rank = 
  | 'bronze' 
  | 'silver' 
  | 'gold' 
  | 'platinum' 
  | 'diamond' 
  | 'master' 
  | 'grandmaster' 
  | 'legend';

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

// Battle modes
export type BattleMode = 
  | 'deathmatch' 
  | 'royal' 
  | 'bestof3' 
  | 'survival' 
  | 'speedrun' 
  | 'topicdraft' 
  | 'chaos';

// Battle status
export type BattleStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

// Submission status
export type SubmissionStatus = 
  | 'pending' 
  | 'accepted' 
  | 'wrong_answer' 
  | 'time_limit' 
  | 'runtime_error' 
  | 'compilation_error';

// Programming languages
export type Language = 'cpp' | 'java' | 'python' | 'javascript';

// Problem topics
export type Topic = 
  | 'arrays'
  | 'strings'
  | 'linked_lists'
  | 'stacks'
  | 'queues'
  | 'heaps'
  | 'binary_search'
  | 'sliding_window'
  | 'greedy'
  | 'dynamic_programming'
  | 'trees'
  | 'graphs'
  | 'backtracking'
  | 'bit_manipulation'
  | 'math'
  | 'intervals'
  | 'two_pointers'
  | 'hash_map'
  | 'recursion'
  | 'depth_first_search'
  | 'breadth_first_search'
  | 'monotonic_stack'
  | 'prefix_sum'
  | 'topological_sort'
  | 'design'
  | 'divide_and_conquer'
  | 'sorting';

// Time control options (in minutes)
export type TimeControl = 5 | 10 | 15 | 30 | 45 | 60 | number;

// Rank thresholds
export const RANK_THRESHOLDS: Record<Rank, number> = {
  bronze: 0,
  silver: 1000,
  gold: 1500,
  platinum: 2000,
  diamond: 2500,
  master: 3000,
  grandmaster: 3500,
  legend: 4000,
};

// Rank display names
export const RANK_NAMES: Record<Rank, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  legend: 'Legend',
};

// Difficulty display names
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

// Battle mode display names
export const BATTLE_MODE_NAMES: Record<BattleMode, string> = {
  deathmatch: 'Deathmatch',
  royal: 'Battle Royale',
  bestof3: 'Best of 3',
  survival: 'Survival',
  speedrun: 'Speedrun',
  topicdraft: 'Topic Draft',
  chaos: 'Chaos',
};

// Topic display names
export const TOPIC_NAMES: Record<Topic, string> = {
  arrays: 'Arrays',
  strings: 'Strings',
  linked_lists: 'Linked Lists',
  stacks: 'Stacks',
  queues: 'Queues',
  heaps: 'Heaps',
  binary_search: 'Binary Search',
  sliding_window: 'Sliding Window',
  greedy: 'Greedy',
  dynamic_programming: 'Dynamic Programming',
  trees: 'Trees',
  graphs: 'Graphs',
  backtracking: 'Backtracking',
  bit_manipulation: 'Bit Manipulation',
  math: 'Math',
  intervals: 'Intervals',
  two_pointers: 'Two Pointers',
  hash_map: 'Hash Map',
  recursion: 'Recursion',
  depth_first_search: 'Depth First Search',
  breadth_first_search: 'Breadth First Search',
  monotonic_stack: 'Monotonic Stack',
  prefix_sum: 'Prefix Sum',
  topological_sort: 'Topological Sort',
  design: 'Design',
  divide_and_conquer: 'Divide and Conquer',
  sorting: 'Sorting',
};

// Player count options
export const PLAYER_COUNT_OPTIONS = [2, 4, 10, 25, 50, 100] as const;

// Time control options
export const TIME_CONTROL_OPTIONS = [5, 10, 15, 30, 45, 60] as const;
