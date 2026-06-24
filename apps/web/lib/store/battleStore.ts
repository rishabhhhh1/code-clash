import { create } from 'zustand';

export interface Battle {
  id: string;
  code: string;
  creatorId: string;
  mode: string;
  status: 'waiting' | 'active' | 'completed';
  playerCount: number;
  maxPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  timeLimit: number;
  isPublic: boolean;
  problemId: string;
  participants: string[];
  spectators: string[];
  startTime?: string;
  endTime?: string;
  leaderboard: Array<{
    userId: string;
    rank: number;
    score: number;
    solveTime?: number;
    attempts: number;
    status: 'solved' | 'failed' | 'pending';
  }>;
  createdAt: string;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  examples: Array<{ input: string; output: string }>;
  constraints: string;
  topics: string[];
  timeLimit: number;
  memoryLimit: number;
  rating?: number;
  solveCount: number;
  submissions: number;
}

interface BattleStore {
  currentBattle: Battle | null;
  currentProblem: Problem | null;
  submitting: boolean;
  error: string | null;
  setBattle: (battle: Battle) => void;
  setProblem: (problem: Problem) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  updateLeaderboard: (leaderboard: Battle['leaderboard']) => void;
}

export const useBattleStore = create<BattleStore>((set) => ({
  currentBattle: null,
  currentProblem: null,
  submitting: false,
  error: null,

  setBattle: (battle: Battle) => set({ currentBattle: battle }),
  setProblem: (problem: Problem) => set({ currentProblem: problem }),
  setSubmitting: (submitting: boolean) => set({ submitting }),
  setError: (error: string | null) => set({ error }),
  reset: () => set({ currentBattle: null, currentProblem: null, submitting: false, error: null }),
  updateLeaderboard: (leaderboard: Battle['leaderboard']) =>
    set((state) => ({
      currentBattle: state.currentBattle ? { ...state.currentBattle, leaderboard } : null,
    })),
}));
