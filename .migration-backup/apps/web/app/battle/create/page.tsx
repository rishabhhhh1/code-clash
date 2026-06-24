'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TOPICS = [
  'arrays', 'strings', 'linked_lists', 'stacks', 'queues', 'heaps',
  'binary_search', 'sliding_window', 'greedy', 'dynamic_programming',
  'trees', 'graphs', 'backtracking', 'bit_manipulation', 'math', 'intervals',
  'two_pointers', 'hash_map', 'recursion', 'depth_first_search', 'breadth_first_search',
  'monotonic_stack', 'prefix_sum', 'topological_sort', 'design', 'divide_and_conquer', 'sorting',
];

const MODES = [
  { value: 'deathmatch', label: 'Deathmatch', desc: '1v1 first to solve wins' },
  { value: 'royal', label: 'Battle Royale', desc: '10-100+ players, last standing wins' },
  { value: 'bestof3', label: 'Best of 3', desc: 'Three rounds, most wins' },
  { value: 'survival', label: 'Survival', desc: 'Lives system, wrong = lose life' },
  { value: 'speedrun', label: 'Speedrun', desc: 'Solve fastest to win' },
  { value: 'topicdraft', label: 'Topic Draft', desc: 'Pick topics, random selection' },
  { value: 'chaos', label: 'Chaos', desc: 'Hidden topic until start' },
];

export default function CreateBattlePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    mode: 'deathmatch',
    maxPlayers: 2,
    difficulty: 'medium',
    topics: ['arrays'] as string[],
    timeControl: 10,
    isPublic: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create battle');
      }

      router.push(`/battle/${data.data.code}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topic: string) => {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create Battle</h1>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Battle Mode */}
        <div>
          <label className="block text-sm font-medium mb-2">Battle Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setForm({ ...form, mode: mode.value })}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  form.mode === mode.value
                    ? 'border-primary bg-primary/10'
                    : 'border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">{mode.label}</div>
                <div className="text-xs text-muted-foreground">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Player Count */}
        <div>
          <label className="block text-sm font-medium mb-2">Max Players</label>
          <select
            value={form.maxPlayers}
            onChange={(e) => setForm({ ...form, maxPlayers: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={2}>2 Players (1v1)</option>
            <option value={4}>4 Players</option>
            <option value={10}>10 Players</option>
            <option value={25}>25 Players</option>
            <option value={50}>50 Players</option>
            <option value={100}>100+ Players</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium mb-2">Difficulty</label>
          <div className="flex gap-3">
            {['easy', 'medium', 'hard'].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setForm({ ...form, difficulty: diff })}
                className={`flex-1 py-2 border rounded-md transition-colors ${
                  form.difficulty === diff
                    ? 'border-primary bg-primary/10'
                    : 'border hover:border-primary/50'
                }`}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div>
          <label className="block text-sm font-medium mb-2">Topics</label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1 text-sm border rounded-full transition-colors ${
                  form.topics.includes(topic)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border hover:border-primary/50'
                }`}
              >
                {topic.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Time Control */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Time Control: {form.timeControl} minutes
          </label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={form.timeControl}
            onChange={(e) => setForm({ ...form, timeControl: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5 min</span>
            <span>60 min</span>
          </div>
        </div>

        {/* Privacy */}
        <div>
          <label className="block text-sm font-medium mb-2">Privacy</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: true })}
              className={`flex-1 py-2 border rounded-md transition-colors ${
                form.isPublic
                  ? 'border-primary bg-primary/10'
                  : 'border hover:border-primary/50'
              }`}
            >
              Public Battle
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: false })}
              className={`flex-1 py-2 border rounded-md transition-colors ${
                !form.isPublic
                  ? 'border-primary bg-primary/10'
                  : 'border hover:border-primary/50'
              }`}
            >
              Private Battle
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || form.topics.length === 0}
          className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Creating...' : 'Create Battle'}
        </button>
      </form>
    </div>
  );
}
