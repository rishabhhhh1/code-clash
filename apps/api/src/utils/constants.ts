export const BATTLE_MODES = {
  DEATHMATCH: 'deathmatch',
  BEST_OF_3: 'best_of_3',
  SURVIVAL: 'survival',
  SPEEDRUN: 'speedrun',
  TOPIC_DRAFT: 'topic_draft',
  CHAOS: 'chaos',
  BATTLE_ROYALE: 'battle_royale',
} as const;

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

export const PROBLEM_TOPICS = [
  'arrays',
  'binary_search',
  'graphs',
  'trees',
  'dp',
  'greedy',
  'strings',
  'math',
  'number_theory',
  'sliding_window',
  'bitmask',
  'two_pointers',
  'stack',
  'queue',
  'heap',
  'hash_table',
  'sorting',
  'union_find',
  'prefix_sum',
  'segment_tree',
] as const;

export const PROGRAMMING_LANGUAGES = [
  'python',
  'javascript',
  'java',
  'cpp',
  'go',
  'rust',
] as const;

export const SUBMISSION_STATUS = {
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  RUNTIME_ERROR: 'runtime_error',
  COMPILE_ERROR: 'compile_error',
  TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
  MEMORY_LIMIT_EXCEEDED: 'memory_limit_exceeded',
  PENDING: 'pending',
} as const;
