'use client';

import { useState, useEffect } from 'react';

interface AdminStats {
  users: number;
  problems: number;
  battles: number;
  submissions: number;
  activeProblems: number;
  premiumProblems: number;
  freeProblems: number;
  difficultyBreakdown: { easy: number; medium: number; hard: number };
  recentBattles: any[];
  recentUsers: any[];
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
  isActive: boolean;
  isPremium: boolean;
  acceptanceRate: number | null;
  leetcodeId: number | null;
  category: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminPage() {
  const [tab, setTab] = useState<'dashboard' | 'problems' | 'users'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemsPage, setProblemsPage] = useState(1);
  const [problemsTotal, setProblemsTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (tab === 'problems') fetchProblems();
  }, [tab, problemsPage, search, diffFilter, activeFilter]);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.data);
      else setError(data.error || 'Failed to load stats');
    } catch {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProblems() {
    try {
      const params = new URLSearchParams({
        page: problemsPage.toString(),
        limit: '50',
      });
      if (search) params.set('search', search);
      if (diffFilter) params.set('difficulty', diffFilter);
      if (activeFilter) params.set('active', activeFilter);

      const res = await fetch(`${API}/api/admin/problems?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setProblems(data.data.items);
        setProblemsTotal(data.data.totalPages);
      }
    } catch {
      setError('Failed to load problems');
    }
  }

  async function toggleProblem(id: string, field: 'toggle' | 'premium') {
    try {
      const res = await fetch(`${API}/api/admin/problems/${id}/${field}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) fetchProblems();
    } catch {
      setError('Failed to update problem');
    }
  }

  if (loading && !stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20 text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage CodeClash problems, users, and settings</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(['dashboard', 'problems', 'users'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Problems" value={stats.problems} />
            <StatCard label="Battles" value={stats.battles} />
            <StatCard label="Submissions" value={stats.submissions} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Problems by Difficulty</h3>
              <div className="space-y-2">
                <DiffBar label="Easy" count={stats.difficultyBreakdown.easy} total={stats.problems} color="bg-green-500" />
                <DiffBar label="Medium" count={stats.difficultyBreakdown.medium} total={stats.problems} color="bg-yellow-500" />
                <DiffBar label="Hard" count={stats.difficultyBreakdown.hard} total={stats.problems} color="bg-red-500" />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Problem Types</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Active</span><span>{stats.activeProblems}</span></div>
                <div className="flex justify-between"><span>Inactive</span><span>{stats.problems - stats.activeProblems}</span></div>
                <div className="flex justify-between"><span>Premium</span><span>{stats.premiumProblems}</span></div>
                <div className="flex justify-between"><span>Free</span><span>{stats.freeProblems}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Recent Battles</h3>
              <div className="space-y-2 text-sm">
                {stats.recentBattles.map((b: any) => (
                  <div key={b.id} className="flex justify-between">
                    <span>{b.code} ({b.mode})</span>
                    <span className="text-muted-foreground">{b.status}</span>
                  </div>
                ))}
                {stats.recentBattles.length === 0 && <p className="text-muted-foreground">No battles yet</p>}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Recent Users</h3>
              <div className="space-y-2 text-sm">
                {stats.recentUsers.map((u: any) => (
                  <div key={u.id} className="flex justify-between">
                    <a href={`/profile/${u.username}`} className="hover:text-primary">{u.username}</a>
                    <span className="text-muted-foreground">rating {u.rating}</span>
                  </div>
                ))}
                {stats.recentUsers.length === 0 && <p className="text-muted-foreground">No users yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problems Tab */}
      {tab === 'problems' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setProblemsPage(1); }}
              className="px-3 py-2 border rounded bg-background text-sm flex-1 min-w-[200px]"
            />
            <select
              value={diffFilter}
              onChange={(e) => { setDiffFilter(e.target.value); setProblemsPage(1); }}
              className="px-3 py-2 border rounded bg-background text-sm"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setProblemsPage(1); }}
              className="px-3 py-2 border rounded bg-background text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left px-4 py-2">Title</th>
                  <th className="text-left px-4 py-2">Difficulty</th>
                  <th className="text-left px-4 py-2">Topics</th>
                  <th className="text-left px-4 py-2">Accept%</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Premium</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{p.leetcodeId || '-'}</td>
                    <td className="px-4 py-2">
                      <a href={`/problems/${p.slug}`} className="hover:text-primary">{p.title}</a>
                    </td>
                    <td className={`px-4 py-2 font-medium ${DIFFICULTY_COLORS[p.difficulty] || ''}`}>
                      {p.difficulty}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate">
                      {p.topics.slice(0, 3).join(', ')}{p.topics.length > 3 ? '...' : ''}
                    </td>
                    <td className="px-4 py-2">{p.acceptanceRate != null ? `${p.acceptanceRate}%` : '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${p.isPremium ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                        {p.isPremium ? 'Premium' : 'Free'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleProblem(p.id, 'toggle')}
                          className="px-2 py-1 text-xs border rounded hover:bg-muted"
                        >
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => toggleProblem(p.id, 'premium')}
                          className="px-2 py-1 text-xs border rounded hover:bg-muted"
                        >
                          {p.isPremium ? 'Make Free' : 'Make Premium'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {problems.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No problems found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setProblemsPage((p) => Math.max(1, p - 1))}
              disabled={problemsPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              Page {problemsPage} of {problemsTotal}
            </span>
            <button
              onClick={() => setProblemsPage((p) => Math.min(problemsTotal, p + 1))}
              disabled={problemsPage === problemsTotal}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="text-center py-20 text-muted-foreground">
          User management coming soon. Use the Rankings page to view users.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function DiffBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-16">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
        <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
    </div>
  );
}
