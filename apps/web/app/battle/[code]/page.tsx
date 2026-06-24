'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import { getWsUrl, getApiUrl } from '../../../lib/api';

interface Player {
  id: string;
  user: {
    id: string;
    codeforcesHandle: string;
    avatar?: string | null;
    rating: number;
    rank: string;
  };
  score: number;
  rank: number;
  problemsSolved: number;
  isAlive: boolean;
}

interface CfProblem {
  id: string;
  contestId: number;
  index: string;
  name: string;
  title: string;
  difficulty: string;
  description: string;
  tags: string[];
  rating?: number;
  problemLink: string;
  url: string;
  contestUrl: string;
}

interface Battle {
  id: string;
  code: string;
  creatorId: string;
  contestId?: number | null;
  problemIndex?: string | null;
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
  problem?: CfProblem | null;
  creator: {
    id: string;
    codeforcesHandle: string;
  };
}

interface CfSubmission {
  id: number;
  verdict?: string;
  programmingLanguage: string;
  timeConsumedMillis?: number;
  memoryConsumedBytes?: number;
  creationTimeSeconds: number;
}

function displayHandle(player?: { codeforcesHandle?: string | null }) {
  return player?.codeforcesHandle || 'Codeforces user';
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function verdictLabel(verdict?: string) {
  if (!verdict) return 'Judging';
  if (verdict === 'OK') return 'Accepted';
  return verdict.replace(/_/g, ' ').toLowerCase();
}

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();
  const apiUrl = getApiUrl();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hasSolved, setHasSolved] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState<CfSubmission[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  const socketRef = useRef<any>(null);

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
            fetchBattle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [battle?.status, timeLeft]);

  useEffect(() => {
    if (battle?.status !== 'active' || !currentUser?.id) return;
    checkCodeforcesStatus(false);
    const poll = setInterval(() => checkCodeforcesStatus(false), 12000);
    return () => clearInterval(poll);
  }, [battle?.status, currentUser?.id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io(getWsUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.emit('battle:join', { battleCode: code });

    socketRef.current.on('battle:started', (updatedBattle: Battle) => {
      setBattle(updatedBattle);
      setTimeLeft(updatedBattle.timeControl * 60);
      setActivityLog((prev) => [...prev, 'Battle started. Submit on Codeforces when ready.']);
    });

    socketRef.current.on('battle:player_joined', (data: any) => {
      fetchBattle();
      setActivityLog((prev) => [...prev, `${data.username || 'A player'} joined the lobby.`]);
    });

    socketRef.current.on('battle:player_left', (data: any) => {
      fetchBattle();
      setActivityLog((prev) => [...prev, `${data.username || 'A player'} left the lobby.`]);
    });

    socketRef.current.on('submission:result', (data: any) => {
      if (data.players) {
        setBattle((prev) => (prev ? { ...prev, players: data.players } : null));
      }
      setActivityLog((prev) => [...prev, `${data.username || 'A player'} solved the Codeforces problem.`]);
      if (data.userId === currentUser?.id) {
        setHasSolved(true);
        setStatusMessage('Accepted on Codeforces. Score updated.');
      }
    });

    return () => {
      socketRef.current?.emit('battle:leave');
      socketRef.current?.disconnect();
    };
  }, [code, currentUser?.id]);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCurrentUser(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBattle = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/battles/${code}`);
      const data = await res.json();
      if (data.success) {
        setBattle(data.data);
        if (data.data.status === 'active' && data.data.endTime) {
          const end = new Date(data.data.endTime).getTime();
          setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
        }
      }
    } catch {
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

    const res = await fetch(`${apiUrl}/api/battles/${code}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (data.success) fetchBattle();
    else alert(data.error || 'Failed to join battle');
  };

  const handleStartBattle = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${apiUrl}/api/battles/${code}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) alert(data.error || 'Failed to start battle');
    else setBattle(data.data);
  };

  const startTracking = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const res = await fetch(`${apiUrl}/api/battles/${code}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ language: 'codeforces', code: '' }),
    });
    const data = await res.json();
    if (data.success) {
      setStatusMessage(data.data.message);
      if (data.data.codeforcesUrl) window.open(data.data.codeforcesUrl, '_blank', 'noopener,noreferrer');
    } else {
      setStatusMessage(data.error || 'Could not start tracking');
    }
  };

  const checkCodeforcesStatus = async (showSpinner = true) => {
    const token = localStorage.getItem('token');
    if (!token || checking) return;

    if (showSpinner) setChecking(true);
    try {
      const res = await fetch(`${apiUrl}/api/battles/${code}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setHasSolved(data.data.hasSolved);
        setRecentSubmissions(data.data.submissions || []);
        setStatusMessage(
          data.data.hasSolved
            ? 'Accepted on Codeforces. Score updated.'
            : 'No accepted Codeforces submission detected yet.'
        );
        fetchBattle();
      } else if (showSpinner) {
        setStatusMessage(data.error || 'Could not check Codeforces status');
      }
    } catch {
      if (showSpinner) setStatusMessage('Network error while checking Codeforces');
    } finally {
      if (showSpinner) setChecking(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-sm font-medium text-muted-foreground">Loading battle room...</div>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20">
        <div className="max-w-sm rounded-lg border bg-card p-8 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-bold">Battle Not Found</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            The battle lobby with code <span className="font-mono font-bold text-foreground">{code}</span> does not exist or has been closed.
          </p>
          <button
            onClick={() => router.push('/lobby')}
            className="w-full rounded-lg bg-primary py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isUserJoined = battle.players.some((p) => p.user.id === currentUser?.id);
  const isHost = battle.creatorId === currentUser?.id;
  const problem = battle.problem;
  const sortedPlayers = [...battle.players].sort((a, b) => b.score - a.score);

  if (battle.status === 'waiting') {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col justify-center px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Codeforces Battle Lobby
                  </div>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight">Room {battle.code}</h1>
                </div>
                <span className="rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-500">
                  Waiting
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                  <div className="mt-0.5 text-sm font-semibold capitalize">{battle.difficulty}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Time Limit</div>
                  <div className="mt-0.5 text-sm font-semibold">{battle.timeControl} minutes</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Mode</div>
                  <div className="mt-0.5 text-sm font-semibold capitalize">{battle.mode}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Players</div>
                  <div className="mt-0.5 text-sm font-semibold">{battle.players.length}/{battle.maxPlayers}</div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Selected Topics</div>
                <div className="flex flex-wrap gap-1.5">
                  {battle.topics.map((topic) => (
                    <span key={topic} className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {topic.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="text-sm font-medium">Invite Link</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className="flex-1 select-all rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:bg-accent"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </section>

            {isUserJoined ? (
              <section className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-6 shadow-sm">
                <div>
                  <h3 className="font-semibold text-foreground">Launch Battle</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isHost ? 'Start when everyone is ready.' : 'Waiting for the host to start the battle.'}
                  </p>
                </div>
                {isHost ? (
                  <button
                    onClick={handleStartBattle}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                  >
                    Start Battle
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Pending host
                  </div>
                )}
              </section>
            ) : (
              <section className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
                <div>
                  <h3 className="font-semibold text-emerald-500">Join Lobby</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Join with your Codeforces handle.</p>
                </div>
                <button
                  onClick={handleJoinBattle}
                  className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-600"
                >
                  Join Battle
                </button>
              </section>
            )}
          </div>

          <section className="flex max-h-[500px] flex-col rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Players ({battle.players.length}/{battle.maxPlayers})</h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {battle.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                      {displayHandle(player.user).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{displayHandle(player.user)}</div>
                      <div className="text-xs text-muted-foreground">Rating: {player.user.rating}</div>
                    </div>
                  </div>
                  {battle.creatorId === player.user.id && (
                    <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 text-card-foreground">
        <div className="flex items-center gap-3">
          <span className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold">Room: {battle.code}</span>
          <span className="rounded-md border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-500">
            {battle.status.toUpperCase()}
          </span>
          <span className="hidden text-xs capitalize text-muted-foreground sm:inline">
            {battle.difficulty} | {battle.mode.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {battle.status === 'active' && timeLeft > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Remaining</span>
              <div className={`font-mono text-xl font-bold tracking-tight ${timeLeft < 60 ? 'animate-pulse text-red-500' : 'text-primary'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold uppercase tracking-wider text-red-500">Battle Finished</div>
          )}
          <div className="text-xs font-medium text-muted-foreground">{battle.playerCount}/{battle.maxPlayers} Players</div>
        </div>
      </header>

      <main className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-y-auto border-r bg-card/40 p-6">
          {problem ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{problem.name}</h1>
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase text-primary">
                    {problem.rating ? `${problem.rating} rated` : problem.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {problem.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-background p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">{problem.description}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open on Codeforces
                  </a>
                  <a
                    href={problem.contestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
                  >
                    Contest Page
                  </a>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Codeforces Tracking</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={startTracking}
                    disabled={battle.status !== 'active'}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    Open and Track Submission
                  </button>
                  <button
                    onClick={() => checkCodeforcesStatus(true)}
                    disabled={checking}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                    Check Status
                  </button>
                </div>
                {statusMessage && (
                  <div className={`mt-4 rounded-lg border p-3 text-sm ${hasSolved ? 'border-green-500/20 bg-green-500/10 text-green-500' : 'bg-muted/30 text-muted-foreground'}`}>
                    {statusMessage}
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-background p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Codeforces Submissions</h2>
                {recentSubmissions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No submissions detected for your handle on this problem yet.</div>
                ) : (
                  <div className="space-y-2">
                    {recentSubmissions.map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-sm">
                        <div>
                          <div className="font-medium">{verdictLabel(submission.verdict)}</div>
                          <div className="text-xs text-muted-foreground">{submission.programmingLanguage}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{submission.timeConsumedMillis ?? 0} ms</div>
                          <div>{submission.memoryConsumedBytes ? `${Math.round(submission.memoryConsumedBytes / 1024)} KB` : 'Memory N/A'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm italic text-muted-foreground">
              Loading Codeforces problem...
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col bg-background">
          <section className="border-b p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</h2>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      #{index + 1} {displayHandle(player.user)}
                    </div>
                    <div className="text-xs text-muted-foreground">{player.problemsSolved ? 'Solved' : 'In progress'}</div>
                  </div>
                  <div className="text-lg font-bold text-primary">{player.score}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="border-b bg-muted/50 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Feed</span>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-xs">
              {activityLog.length === 0 ? (
                <div className="pt-8 text-center italic text-muted-foreground">No live activity events yet.</div>
              ) : (
                activityLog.map((log, index) => (
                  <div key={index} className="text-foreground/80">
                    <span className="mr-1 text-primary">&gt;</span> {log}
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
