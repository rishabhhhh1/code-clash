'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import ProblemStatement from '../../../components/problem/ProblemStatement';
import type { ProblemData } from '../../../components/problem/ProblemStatement';
import { getWsUrl, getApiUrl } from '../../../lib/api';

interface Player {
  id: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    rating: number;
    rank: string;
  };
  score: number;
  rank: number;
  problemsSolved: number;
  isAlive: boolean;
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  description: string;
  inputFormat?: string | null;
  outputFormat?: string | null;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
  hints?: string[] | null;
  topics: string[];
  timeLimit: number;
  memoryLimit: number;
  acceptanceRate?: number | null;
  problemLink?: string | null;
  starterCodeCpp?: string | null;
  starterCodeJava?: string | null;
  starterCodePython?: string | null;
  starterCodeJavaScript?: string | null;
}

interface Battle {
  id: string;
  code: string;
  creatorId: string;
  problemId?: string | null;
  mode: string;
  status: string;
  difficulty: string;
  topics: string[];
  timeControl: number;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  startTime?: string | null;
  endTime?: string | null;
  players: Player[];
  problem?: Problem | null;
  creator: {
    id: string;
    username: string;
  };
}

const CODE_TEMPLATES: Record<string, string> = {
  python: `def solve(nums, target):\n    # Write your Python solution here\n    pass\n`,
  javascript: `function solve(nums, target) {\n    // Write your JavaScript solution here\n    \n}\n`,
  java: `class Solution {\n    public void solve(int[] nums, int target) {\n        // Write your Java solution here\n        \n    }\n}\n`,
  cpp: `class Solution {\npublic:\n    void solve(vector<int>& nums, int target) {\n        // Write your C++ solution here\n        \n    }\n};\n`,
};

function getStarterCode(problem: Problem | null | undefined, lang: string): string {
  if (!problem) return CODE_TEMPLATES[lang] || CODE_TEMPLATES.python;
  const langMap: Record<string, string | null | undefined> = {
    python: problem.starterCodePython,
    javascript: problem.starterCodeJavaScript,
    java: problem.starterCodeJava,
    cpp: problem.starterCodeCpp,
  };
  return langMap[lang] || CODE_TEMPLATES[lang] || CODE_TEMPLATES.python;
}

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code_, setCode] = useState(CODE_TEMPLATES.python);
  const [language, setLanguage] = useState('python');
  const [isSubmitRunning, setIsSubmitRunning] = useState(false);
  const [isRunRunning, setIsRunRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'testcase' | 'result'>('testcase');
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<any>(null);
  const hasLoadedCodeTemplate = useRef<Record<string, boolean>>({});

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchBattle();
  }, [code]);

  useEffect(() => {
    if (battle?.status === 'active' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Battle ended
            fetchBattle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [battle?.status, timeLeft]);

  // Socket.IO Sync
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = getWsUrl();
    socketRef.current = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.emit('battle:join', { battleCode: code });

    socketRef.current.on('battle:started', (updatedBattle: any) => {
      setBattle(updatedBattle);
      setTimeLeft(updatedBattle.timeControl * 60);
      setActivityLog((prev) => [...prev, 'Battle has started! Good luck.']);
    });

    socketRef.current.on('battle:player_joined', (data: any) => {
      fetchBattle();
      setActivityLog((prev) => [...prev, `${data.username} joined the lobby.`]);
    });

    socketRef.current.on('battle:player_left', (data: any) => {
      fetchBattle();
      setActivityLog((prev) => [...prev, `${data.username} left the lobby.`]);
    });

    socketRef.current.on('submission:result', (data: any) => {
      if (data.players) {
        setBattle((prev) => (prev ? { ...prev, players: data.players } : null));
      }
      setActivityLog((prev) => [
        ...prev,
        `${data.username} submitted code: ${
          data.status === 'accepted' ? '🟢 Accepted (+100 pts)' : '🔴 Wrong Answer'
        }`,
      ]);
      if (data.userId === currentUser?.id) {
        setSubmitResult({
          status: data.status,
          runtime: data.submission?.runtime,
          memory: data.submission?.memory,
          score: data.submission?.score,
        });
        setActiveTab('result');
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('battle:leave');
        socketRef.current.disconnect();
      }
    };
  }, [code, currentUser?.id]);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBattle = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles/${code}`
      );
      const data = await res.json();
      if (data.success) {
        setBattle(data.data);
        if (data.data.status === 'active' && !timeLeft) {
          const start = new Date(data.data.startTime).getTime();
          const end = new Date(data.data.endTime).getTime();
          const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
        // Load default code stub for active problem
        if (data.data.problem && !hasLoadedCodeTemplate.current[language]) {
          setCode(getStarterCode(data.data.problem, language));
          hasLoadedCodeTemplate.current[language] = true;
        }
      }
    } catch (error) {
      console.error('Failed to fetch battle');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBattle = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles/${code}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        fetchBattle();
      } else {
        alert(data.error || 'Failed to join battle');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartBattle = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles/${code}/start`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to start battle');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(getStarterCode(battle?.problem, lang));
  };

  const handleRunCode = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsRunRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setActiveTab('result');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles/${code}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language, code: code_ }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setRunResult(data.data);
      } else {
        setRunResult({ error: data.error || 'Failed to run code' });
      }
    } catch (e) {
      setRunResult({ error: 'Network error occurred while running code' });
    } finally {
      setIsRunRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsSubmitRunning(true);
    setSubmitResult(null);
    setRunResult(null);
    setActiveTab('result');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/battles/${code}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language, code: code_ }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setSubmitResult({ status: 'pending' });
      } else {
        setSubmitResult({ error: data.error || 'Failed to submit code' });
        setIsSubmitRunning(false);
      }
    } catch (e) {
      setSubmitResult({ error: 'Network error occurred while submitting' });
      setIsSubmitRunning(false);
    } finally {
      setIsSubmitRunning(false);
    }
  };

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground text-sm font-medium">Loading battle arena...</div>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/20">
        <div className="text-center p-8 max-w-sm border rounded-2xl bg-card shadow-md">
          <h2 className="text-2xl font-bold mb-2">Battle Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            The battle lobby with code <span className="font-mono font-bold text-foreground">{code}</span> does not exist or has been closed.
          </p>
          <button
            onClick={() => router.push('/lobby')}
            className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isUserJoined = battle.players.some((p) => p.user.id === currentUser?.id);
  const isHost = battle.creatorId === currentUser?.id;

  // LOBBY STATE (Waiting for players)
  if (battle.status === 'waiting') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-4rem)] flex flex-col justify-center">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left panel: Info & Invite */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    MULTIPLE MULTIPLAYER LOBBY
                  </div>
                  <h1 className="text-3xl font-bold mt-1 tracking-tight">Battle Room {battle.code}</h1>
                </div>
                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-semibold rounded-full border border-yellow-500/20">
                  Lobby Open
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 border rounded-xl bg-muted/30">
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                  <div className="text-sm font-semibold capitalize mt-0.5">{battle.difficulty}</div>
                </div>
                <div className="p-3 border rounded-xl bg-muted/30">
                  <div className="text-xs text-muted-foreground">Time Limit</div>
                  <div className="text-sm font-semibold mt-0.5">{battle.timeControl} minutes</div>
                </div>
                <div className="p-3 border rounded-xl bg-muted/30">
                  <div className="text-xs text-muted-foreground">Mode</div>
                  <div className="text-sm font-semibold capitalize mt-0.5">{battle.mode}</div>
                </div>
                <div className="p-3 border rounded-xl bg-muted/30">
                  <div className="text-xs text-muted-foreground">Max Players</div>
                  <div className="text-sm font-semibold mt-0.5">{battle.maxPlayers}</div>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">Selected Topics</div>
                <div className="flex flex-wrap gap-1.5">
                  {battle.topics.map((t) => (
                    <span key={t} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">
                      {t.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="text-sm font-medium">Invite Friends</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className="flex-1 px-3 py-2 border rounded-lg bg-muted/50 text-muted-foreground text-xs select-all focus:outline-none"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-4 py-2 border rounded-lg hover:bg-accent text-sm font-medium transition-all"
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Creator Launch Control */}
            {isUserJoined && (
              <div className="p-6 border border-primary/20 rounded-2xl bg-primary/5 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-semibold text-foreground">Launch the Battle</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isHost
                      ? 'Ready to code? Click start when everyone has joined!'
                      : 'Waiting for the host to launch the battle room...'}
                  </p>
                </div>
                {isHost ? (
                  <button
                    onClick={handleStartBattle}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-md text-sm"
                  >
                    Start Battle
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <div className="w-2.5 h-2.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    Pending host
                  </div>
                )}
              </div>
            )}

            {!isUserJoined && (
              <div className="p-6 border border-emerald-500/20 rounded-2xl bg-emerald-500/5 flex items-center justify-between shadow-sm animate-pulse">
                <div>
                  <h3 className="font-semibold text-emerald-500">Join the Lobby</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You have been invited to join this competitive battle!
                  </p>
                </div>
                <button
                  onClick={handleJoinBattle}
                  className="px-6 py-2.5 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-all shadow-md text-sm"
                >
                  Join Battle
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Active Players */}
          <div className="p-6 border rounded-2xl bg-card shadow-sm flex flex-col max-h-[500px]">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              Players ({battle.players.length}/{battle.maxPlayers})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {battle.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 border rounded-xl bg-muted/20"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground text-sm">
                      {player.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{player.user.username}</div>
                      <div className="text-xs text-muted-foreground">Rating: {player.user.rating}</div>
                    </div>
                  </div>
                  {battle.creatorId === player.user.id && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold rounded-md uppercase tracking-wider">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE CODING ROOM OR COMPLETED BOARD
  const problem = battle.problem;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header Panel */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card text-card-foreground">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded">Room: {battle.code}</span>
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              battle.status === 'active'
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            {battle.status.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline capitalize">
            {battle.difficulty} • {battle.mode.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {battle.status === 'active' && timeLeft > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase">Time Remaining:</span>
              <div
                className={`font-mono text-xl font-bold tracking-tight ${
                  timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-primary'
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-red-500 uppercase tracking-wider">
              Battle Finished
            </div>
          )}

          <div className="text-xs font-medium text-muted-foreground">
            {battle.playerCount}/{battle.maxPlayers} Players
          </div>
        </div>
      </div>

      {/* Main split work board - responsive */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Side: Problem Statement & Activity log */}
        <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r h-full overflow-hidden bg-card/40">
          <div className="flex-1 overflow-hidden">
            {problem ? (
              <ProblemStatement problem={problem as ProblemData} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground text-sm italic">Loading problem details...</div>
              </div>
            )}
          </div>

          {/* Activity Feed panel */}
          <div className="h-32 lg:h-40 border-t bg-muted/20 flex flex-col overflow-hidden">
            <div className="px-4 py-1.5 border-b bg-muted/50 flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Arena Feed
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
              {activityLog.length === 0 ? (
                <div className="text-muted-foreground italic text-center pt-8">No live activity events yet.</div>
              ) : (
                activityLog.map((log, index) => (
                  <div key={index} className="text-foreground/80">
                    <span className="text-primary mr-1">&gt;</span> {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Code Editor, Leaderboard & Controls */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-hidden">
          {/* Leaderboard panel on top */}
          <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Leaderboard
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              {battle.players
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((p, idx) => (
                  <span key={p.id} className="truncate max-w-[120px]">
                    #{idx + 1} <strong className="text-foreground">{p.user.username}</strong> ({p.score} pts)
                  </span>
                ))}
            </div>
          </div>

          {/* Monaco language select & controls bar */}
          <div className="px-4 py-2 border-b flex items-center justify-between bg-card text-card-foreground">
            <div className="flex items-center gap-2">
              <label htmlFor="language" className="text-xs text-muted-foreground font-medium">
                Language:
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={battle.status !== 'active'}
                className="px-2.5 py-1 border rounded bg-transparent text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRunCode}
                disabled={isRunRunning || isSubmitRunning || battle.status !== 'active'}
                className="px-4 py-1.5 border rounded-lg text-xs font-semibold hover:bg-accent disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isRunRunning && (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Run
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isRunRunning || isSubmitRunning || battle.status !== 'active'}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSubmitRunning && (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Submit
              </button>
            </div>
          </div>

          {/* Monaco Editor code board */}
          <div className="flex-1 min-h-[300px] border-b">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              value={code_}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderWhitespace: 'none',
                bracketPairColorization: { enabled: true },
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                readOnly: battle.status !== 'active',
                suggest: {
                  showMethods: true,
                  showFunctions: true,
                  showConstructors: true,
                  showFields: true,
                  showVariables: true,
                  showClasses: true,
                  showStructs: true,
                  showInterfaces: true,
                  showModules: true,
                  showProperties: true,
                  showEvents: true,
                  showOperators: true,
                  showUnits: true,
                  showValues: true,
                  showConstants: true,
                  showEnums: true,
                  showEnumMembers: true,
                  showKeywords: true,
                  showWords: true,
                  showColors: true,
                  showFiles: true,
                  showReferences: true,
                  showFolders: true,
                  showTypeParameters: true,
                  showSnippets: true,
                },
              }}
            />
          </div>

          {/* Output Testcases & Run Console */}
          <div className="h-64 flex flex-col bg-muted/40 overflow-hidden">
            <div className="border-b px-4 flex bg-muted/80">
              <button
                onClick={() => setActiveTab('testcase')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'testcase'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Testcases
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'result'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Result Console
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {activeTab === 'testcase' && (
                <div className="space-y-4">
                  {problem?.examples.slice(0, 2).map((ex, index) => (
                    <div key={index} className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Test Case {index + 1} Input</div>
                      <pre className="p-2 border rounded bg-card text-foreground">{ex.input}</pre>
                    </div>
                  )) || <div className="text-muted-foreground italic">No test cases available.</div>}
                </div>
              )}

              {activeTab === 'result' && (
                <div className="space-y-4">
                  {isRunRunning && (
                    <div className="text-muted-foreground italic flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      Running code stubs against test suite...
                    </div>
                  )}

                  {isSubmitRunning && (
                    <div className="text-muted-foreground italic flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      Submitting solution to remote judge...
                    </div>
                  )}

                  {!isRunRunning && !isSubmitRunning && runResult && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                            runResult.status === 'accepted'
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}
                        >
                          {runResult.status === 'accepted' ? 'Passed' : 'Failed'}
                        </span>
                      </div>

                      {runResult.error ? (
                        <div className="p-3 border border-red-500/10 rounded-lg bg-red-500/5 text-red-500 font-mono">
                          {runResult.error}
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {runResult.testCases?.map((tc: any) => (
                            <div key={tc.id} className="p-3 border rounded-lg bg-card space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-xs text-muted-foreground">Test Case #{tc.id}</span>
                                <span
                                  className={`text-[10px] font-bold rounded px-1.5 ${
                                    tc.passed
                                      ? 'bg-green-500/10 text-green-500'
                                      : 'bg-red-500/10 text-red-500'
                                  }`}
                                >
                                  {tc.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-muted/50 pt-1.5 mt-1.5">
                                <div>
                                  <div className="text-muted-foreground font-sans">Input</div>
                                  <div className="truncate font-semibold mt-0.5">{tc.input}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground font-sans">Expected</div>
                                  <div className="truncate font-semibold mt-0.5">{tc.expected}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground font-sans">Actual</div>
                                  <div
                                    className={`truncate font-semibold mt-0.5 ${
                                      tc.passed ? 'text-green-500' : 'text-red-500'
                                    }`}
                                  >
                                    {tc.actual}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!isRunRunning && !isSubmitRunning && submitResult && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Submission State:</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                            submitResult.status === 'accepted'
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : submitResult.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}
                        >
                          {submitResult.status}
                        </span>
                      </div>

                      {submitResult.error ? (
                        <div className="p-3 border border-red-500/10 rounded-lg bg-red-500/5 text-red-500 font-mono">
                          {submitResult.error}
                        </div>
                      ) : submitResult.status === 'pending' ? (
                        <div className="text-muted-foreground text-sm italic">
                          Evaluating submissions asynchronously. Leaderboard will update in real-time...
                        </div>
                      ) : (
                        <div className="p-4 border rounded-xl bg-card grid grid-cols-2 gap-4">
                          <div className="p-2.5 border rounded-lg bg-muted/20">
                            <div className="text-[10px] text-muted-foreground font-sans">Runtime</div>
                            <div className="text-base font-bold text-foreground mt-0.5">
                              {submitResult.runtime ? `${submitResult.runtime} ms` : 'N/A'}
                            </div>
                          </div>
                          <div className="p-2.5 border rounded-lg bg-muted/20">
                            <div className="text-[10px] text-muted-foreground font-sans">Memory</div>
                            <div className="text-base font-bold text-foreground mt-0.5">
                              {submitResult.memory ? `${submitResult.memory} MB` : 'N/A'}
                            </div>
                          </div>
                          <div className="p-2.5 border rounded-lg bg-muted/20 col-span-2 text-center border-primary/20 bg-primary/5">
                            <div className="text-[10px] text-primary font-sans font-semibold uppercase tracking-wider">
                              Points Earned
                            </div>
                            <div className="text-2xl font-black text-foreground mt-0.5">
                              +{submitResult.score} PTS
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!runResult && !submitResult && !isRunRunning && !isSubmitRunning && (
                    <div className="text-muted-foreground italic text-center pt-8">
                      Write your solution and click Run or Submit to see execution results.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
