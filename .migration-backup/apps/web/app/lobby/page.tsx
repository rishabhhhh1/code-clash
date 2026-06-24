'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Battle {
  id: string;
  code: string;
  mode: string;
  difficulty: string;
  topics: string[];
  timeControl: number;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  creator: {
    id: string;
    codeforcesHandle: string;
    rating: number;
  };
  createdAt: string;
}

export default function LobbyPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [filter, setFilter] = useState({ difficulty: '', mode: '' });

  useEffect(() => {
    fetchBattles();
  }, []);

  const fetchBattles = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles/lobby/public`);
      const data = await res.json();
      if (data.success) {
        setBattles(data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch battles');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      window.location.href = `/battle/${joinCode.toUpperCase()}`;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return '';
    }
  };

  const getModeName = (mode: string) => {
    const modes: Record<string, string> = {
      deathmatch: 'Deathmatch',
      royal: 'Battle Royale',
      bestof3: 'Best of 3',
      survival: 'Survival',
      speedrun: 'Speedrun',
      topicdraft: 'Topic Draft',
      chaos: 'Chaos',
    };
    return modes[mode] || mode;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Public Lobby</h1>
          <p className="text-muted-foreground mt-1">Join an open battle or create your own</p>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter battle code"
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              maxLength={6}
            />
            <button
              onClick={handleJoinByCode}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Join
            </button>
          </div>
          <Link
            href="/battle/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Battle
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.difficulty}
          onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={filter.mode}
          onChange={(e) => setFilter({ ...filter, mode: e.target.value })}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Modes</option>
          <option value="deathmatch">Deathmatch</option>
          <option value="royal">Battle Royale</option>
          <option value="bestof3">Best of 3</option>
          <option value="survival">Survival</option>
        </select>
      </div>

      {/* Battle List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading battles...</div>
      ) : battles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No battles available</p>
          <Link
            href="/battle/create"
            className="text-primary hover:underline"
          >
            Create the first battle!
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {battles
            .filter((b) => !filter.difficulty || b.difficulty === filter.difficulty)
            .filter((b) => !filter.mode || b.mode === filter.mode)
            .map((battle) => (
              <div
                key={battle.id}
                className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                onClick={() => window.location.href = `/battle/${battle.code}`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-bold">{battle.code}</span>
                      <span className="text-sm text-muted-foreground">by {battle.creator.codeforcesHandle}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">{getModeName(battle.mode)}</span>
                      <span className={getDifficultyColor(battle.difficulty)}>
                        {battle.difficulty.charAt(0).toUpperCase() + battle.difficulty.slice(1)}
                      </span>
                      <span>{battle.timeControl} min</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {battle.topics.slice(0, 3).map((topic) => (
                        <span key={topic} className="px-2 py-1 text-xs bg-secondary rounded">
                          {topic.replace('_', ' ')}
                        </span>
                      ))}
                      {battle.topics.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-secondary rounded">
                          +{battle.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {battle.playerCount}/{battle.maxPlayers}
                    </div>
                    <div className="text-sm text-muted-foreground">players</div>
                    {battle.playerCount < battle.maxPlayers ? (
                      <span className="text-xs text-green-500">Open</span>
                    ) : (
                      <span className="text-xs text-red-500">Full</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
