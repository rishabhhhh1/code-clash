'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ difficulty: '', topic: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProblems();
  }, [page, filter]);

  const fetchProblems = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (filter.difficulty) params.append('difficulty', filter.difficulty);
      if (filter.topic) params.append('topic', filter.topic);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/problems?${params}`
      );
      const data = await res.json();
      if (data.success) {
        setProblems(data.data.items);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch problems');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'hard': return 'text-red-500 bg-red-500/10';
      default: return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Problems</h1>
        <p className="text-muted-foreground mt-1">Practice coding problems</p>
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
          value={filter.topic}
          onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Topics</option>
          <option value="arrays">Arrays</option>
          <option value="strings">Strings</option>
          <option value="dynamic_programming">Dynamic Programming</option>
          <option value="trees">Trees</option>
          <option value="graphs">Graphs</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading problems...</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No problems found</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Difficulty</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Topics</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/problems/${problem.slug}`} className="font-medium hover:text-primary transition-colors">
                        {problem.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {problem.topics.slice(0, 2).map((topic) => (
                          <span key={topic} className="px-2 py-1 text-xs bg-secondary rounded">
                            {topic.replace('_', ' ')}
                          </span>
                        ))}
                        {problem.topics.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-secondary rounded">
                            +{problem.topics.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
