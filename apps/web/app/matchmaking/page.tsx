'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { getWsUrl, getApiUrl } from '../../lib/api';

interface MatchmakingStatus {
  status: 'idle' | 'searching' | 'matched' | 'timeout';
  mode?: string;
  elapsed?: number;
  preferredDifficulty?: string;
  preferredTopics?: string[];
}

const TOPICS = [
  'arrays', 'strings', 'linked_lists', 'stacks', 'queues', 'heaps',
  'binary_search', 'sliding_window', 'greedy', 'dynamic_programming',
  'trees', 'graphs', 'backtracking', 'bit_manipulation', 'math',
  'intervals', 'two_pointers', 'hash_map', 'recursion',
];

export default function MatchmakingPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  
  const [mode, setMode] = useState<'quick' | 'ranked' | 'casual'>('quick');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'any'>('any');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [matchFound, setMatchFound] = useState(false);
  const [battleCode, setBattleCode] = useState('');

  useEffect(() => {
    // Connect to WebSocket
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    socketRef.current = io(getWsUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('match:found', (data) => {
      setMatchFound(true);
      setBattleCode(data.battleCode || data.battle?.code);
      setIsSearching(false);
      setTimeout(() => {
        router.push(`/battle/${data.battleCode || data.battle?.code}`);
      }, 2000);
    });

    socketRef.current.on('match:timeout', (data) => {
      setIsSearching(false);
      setError(data.message || 'No match found within time limit');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const handleStartMatchmaking = async () => {
    setError('');
    setIsSearching(true);
    setElapsed(0);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/matchmaking/${mode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferredDifficulty: difficulty,
            preferredTopics: selectedTopics,
          }),
        }
      );
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error || 'Failed to start matchmaking');
        setIsSearching(false);
      } else if (data.data.status === 'matched') {
        setMatchFound(true);
        setBattleCode(data.data.battleCode);
        setTimeout(() => {
          router.push(`/battle/${data.data.battleCode}`);
        }, 2000);
      }
    } catch (e) {
      setError('Network error occurred');
      setIsSearching(false);
    }
  };

  const handleCancelMatchmaking = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/matchmaking/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (e) {
      // Ignore errors
    }
    setIsSearching(false);
    setElapsed(0);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Find a Match</h1>
          <p className="text-muted-foreground">
            Compete against other coders in real-time battles
          </p>
        </div>

        {/* Match Found Overlay */}
        {matchFound && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-card p-8 rounded-2xl text-center space-y-4 animate-bounce">
              <div className="text-6xl">⚔️</div>
              <h2 className="text-2xl font-bold text-primary">Match Found!</h2>
              <p className="text-muted-foreground">
                Joining battle <span className="font-mono font-bold">{battleCode}</span>
              </p>
            </div>
          </div>
        )}

        {/* Mode Selection */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Select Mode</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setMode('quick')}
              className={`p-4 border-2 rounded-xl text-center transition-all ${
                mode === 'quick'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold">Quick Match</div>
              <div className="text-xs text-muted-foreground mt-1">Find opponent fast</div>
            </button>
            <button
              onClick={() => setMode('ranked')}
              className={`p-4 border-2 rounded-xl text-center transition-all ${
                mode === 'ranked'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-semibold">Ranked</div>
              <div className="text-xs text-muted-foreground mt-1">Skill-based matching</div>
            </button>
            <button
              onClick={() => setMode('casual')}
              className={`p-4 border-2 rounded-xl text-center transition-all ${
                mode === 'casual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-2xl mb-2">🎮</div>
              <div className="font-semibold">Casual</div>
              <div className="text-xs text-muted-foreground mt-1">Play for fun</div>
            </button>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Preferred Difficulty</h2>
          <div className="grid grid-cols-4 gap-2">
            {(['easy', 'medium', 'hard', 'any'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2 px-4 border-2 rounded-lg font-medium capitalize transition-all ${
                  difficulty === d
                    ? d === 'easy'
                      ? 'border-green-500 bg-green-500/10 text-green-500'
                      : d === 'medium'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                      : d === 'hard'
                      ? 'border-red-500 bg-red-500/10 text-red-500'
                      : 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Topics (Optional)</h2>
            {selectedTopics.length > 0 && (
              <button
                onClick={() => setSelectedTopics([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedTopics.includes(topic)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {topic.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Search Status / Start Button */}
        {isSearching ? (
          <div className="space-y-4">
            <div className="p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-lg font-semibold">Searching for opponents...</div>
              <div className="text-3xl font-mono font-bold text-primary">
                {formatTime(elapsed)}
              </div>
              <div className="text-sm text-muted-foreground">
                {mode === 'quick' && 'Matching based on availability'}
                {mode === 'ranked' && 'Matching by skill level (±200 rating)'}
                {mode === 'casual' && 'Finding a fun match'}
              </div>
            </div>
            <button
              onClick={handleCancelMatchmaking}
              className="w-full py-3 border-2 border-red-500/20 text-red-500 rounded-xl font-semibold hover:bg-red-500/5 transition-all"
            >
              Cancel Search
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartMatchmaking}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg"
          >
            Start Matching
          </button>
        )}

        {/* Tips */}
        <div className="p-4 bg-muted/30 rounded-xl space-y-2">
          <h3 className="font-semibold text-sm">Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Quick Match finds opponents fastest</li>
            <li>• Ranked mode matches players of similar skill</li>
            <li>• Select topics to match against specialists</li>
            <li>• You can cancel matchmaking at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
