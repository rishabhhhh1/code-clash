'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useBattleStore } from '@/lib/store/battleStore';
import { battlesAPI } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import MonacoEditor from '@monaco-editor/react';

export default function BattleRoom() {
  const router = useRouter();
  const params = useParams();
  const battleCode = params.code as string;
  const { user, token } = useAuthStore();
  const { currentBattle, currentProblem, setBattle, setProblem, setSubmitting } = useBattleStore();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socket = useSocket(battleCode, token);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }

    const loadBattle = async () => {
      try {
        const battle = await battlesAPI.getBattle(battleCode);
        setBattle(battle);

        // Fetch problem
        if (battle.problemId) {
          const problem = await battlesAPI.getBattle(battle.problemId);
          setProblem(problem);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load battle');
      } finally {
        setLoading(false);
      }
    };

    loadBattle();
  }, [battleCode, user, token, router, setBattle, setProblem]);

  const handleSubmit = async () => {
    if (!token || !code.trim()) return;

    setSubmitting(true);
    try {
      await battlesAPI.submitCode(battleCode, { code, language }, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async () => {
    if (!token) return;

    try {
      const updatedBattle = await battlesAPI.startBattle(battleCode, token);
      setBattle(updatedBattle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start battle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white text-xl">Loading battle...</p>
      </div>
    );
  }

  if (!currentBattle) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-red-400 text-xl">{error || 'Battle not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Battle: {currentBattle.code}</h1>
            <p className="text-gray-400 text-sm">Status: {currentBattle.status}</p>
          </div>
          <div className="text-right text-white">
            <p className="font-bold">{currentBattle.playerCount}/{currentBattle.maxPlayers} Players</p>
            <p className="text-sm text-gray-400">{currentBattle.difficulty}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Problem Statement */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-4">Problem</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-purple-400 mb-2">Statement</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Load problem content here. This is a placeholder for the actual problem description.
              </p>
            </div>

            {currentProblem?.examples && (
              <div>
                <h3 className="text-lg font-bold text-green-400 mb-2">Examples</h3>
                <div className="space-y-2">
                  {currentProblem.examples.map((ex, idx) => (
                    <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700">
                      <p className="text-gray-300 text-sm">
                        <strong>Input:</strong> {ex.input}
                      </p>
                      <p className="text-gray-300 text-sm">
                        <strong>Output:</strong> {ex.output}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor & Leaderboard */}
        <div className="space-y-4">
          {/* Editor */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-bold">Code Editor</h3>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-1 bg-slate-800 text-white text-sm rounded border border-slate-700"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <MonacoEditor
              height="300px"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!code.trim()}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              ✅ Submit
            </button>
            {currentBattle.status === 'waiting' && currentBattle.creatorId === user?.id && (
              <button
                onClick={handleStart}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                ▶️ Start Battle
              </button>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-white font-bold mb-3">Leaderboard</h3>
            <div className="space-y-2">
              {currentBattle.leaderboard.map((entry, idx) => (
                <div key={idx} className="bg-slate-800 p-3 rounded flex justify-between items-center text-sm">
                  <div>
                    <p className="text-white font-bold">#{entry.rank}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      entry.status === 'solved' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {entry.status === 'solved' ? '✅ Solved' : `${entry.attempts} attempts`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
