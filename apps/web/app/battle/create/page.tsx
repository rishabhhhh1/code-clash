'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { battlesAPI } from '@/lib/api';
import { PROBLEM_TOPICS } from '@codeclash/shared';

export default function CreateBattle() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [mode, setMode] = useState('deathmatch');
  const [difficulty, setDifficulty] = useState('medium');
  const [topics, setTopics] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
    }
  }, [user, token, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const battle = await battlesAPI.createBattle(
        {
          mode,
          difficulty,
          topics,
          isPublic,
          maxPlayers,
        },
        token!
      );
      router.push(`/battle/${battle.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create battle');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Create Battle</h1>

          <form onSubmit={handleCreate} className="bg-slate-900 p-8 rounded-lg border border-slate-800 space-y-6">
            {/* Mode */}
            <div>
              <label className="block text-white font-bold mb-3">Battle Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="deathmatch">Deathmatch (1v1)</option>
                <option value="best_of_3">Best of 3</option>
                <option value="survival">Survival</option>
                <option value="speedrun">Speedrun</option>
                <option value="topic_draft">Topic Draft</option>
                <option value="chaos">Chaos</option>
                <option value="battle_royale">Battle Royale</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-white font-bold mb-3">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      difficulty === d
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div>
              <label className="block text-white font-bold mb-3">Topics (Optional)</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {PROBLEM_TOPICS.map((topic) => (
                  <label key={topic} className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={topics.includes(topic)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTopics([...topics, topic]);
                        } else {
                          setTopics(topics.filter((t) => t !== topic));
                        }
                      }}
                      className="rounded"
                    />
                    {topic}
                  </label>
                ))}
              </div>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-white font-bold mb-3">Max Players</label>
              <input
                type="number"
                min="2"
                max="100"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            {/* Public */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="public"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="public" className="text-white font-bold">
                Make battle public
              </label>
            </div>

            {error && <div className="bg-red-900 text-red-200 p-4 rounded-lg">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              {loading ? 'Creating...' : 'Create Battle'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
