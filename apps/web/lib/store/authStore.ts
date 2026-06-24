import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  codeforcesHandle: string;
  username: string;
  avatar: string;
  rating: number;
  maxRating: number;
  rank: string;
  contribution: number;
  battleWins: number;
  battleLosses: number;
  battleDraws: number;
  totalBattles: number;
  winStreak: number;
  isOnline: boolean;
  favoriteTopics: string[];
  createdAt: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (handle: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  syncProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      login: async (handle: string) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle }),
            credentials: 'include',
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Login failed');
          }

          const data = await res.json();
          set({ user: data.data.user, token: data.data.token, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      setUser: (user: User) => {
        set({ user });
      },

      syncProfile: async () => {
        const { token, user } = get();
        if (!user || !token) return;

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            set({ user: data.data });
          }
        } catch (error) {
          console.error('Sync profile error:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
