'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Problem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  points?: number;
  type: string;
  difficulty: string;
  url: string;
  contestUrl: string;
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ minRating: '', maxRating: '', tags: '' });
  const [topics, setTopics] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    fetchProblems();
    fetchTopics();
  }, [filter]);

  const fetchProblems = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.minRating) params.append('minRating', filter.minRating);
      if (filter.maxRating) params.append('maxRating', filter.maxRating);
      if (filter.tags) params.append('tags', filter.tags);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/problems?${params}`
      );
      const data = await res.json();
      if (data.success) {
        setProblems(data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch problems');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/problems/topics`
      );
      const data = await res.json();
      if (data.success) {
        setTopics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch topics');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'hard': return 'text-red-500 bg-red-500/10';
      case 'expert': return 'text-purple-500 bg-purple-500/10';
      default: return '';
    }
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return '';
    if (rating < 1200) return 'text-gray-500';
    if (rating < 1400) return 'text-green-500';
    if (rating < 1600) return 'text-cyan-500';
    if (rating < 1900) return 'text-blue-500';
    if (rating < 2100) return 'text-violet-500';
    if (rating < 2400) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Problems</h1>
        <p className="text-muted-foreground mt-1">Browse Codeforces problems</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <select
          value={filter.minRating}
          onChange={(e) => setFilter({ ...filter, minRating: e.target.value })}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Min Rating</option>
          <option value="800">800+</option>
          <option value="1200">1200+</option>
          <option value="1400">1400+</option>
          <option value="1600">1600+</option>
          <option value="1900">1900+</option>
          <option value="2100">2100+</option>
        </select>
        <select
          value={filter.maxRating}
          onChange={(e) => setFilter({ ...filter, maxRating: e.target.value })}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Max Rating</option>
          <option value="1199">1199</option>
          <option value="1399">1399</option>
          <option value="1599">1599</option>
          <option value="1899">1899</option>
          <option value="2099">2099</option>
          <option value="2399">2399</option>
        </select>
        <select
          value={filter.tags}
          onChange={(e) => setFilter({ ...filter, tags: e.target.value })}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Topics</option>
          {topics.slice(0, 20).map((topic) => (
            <option key={topic.name} value={topic.name}>
              {topic.name} ({topic.count})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading problems from Codeforces...</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No problems found</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Problem</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Difficulty</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Topics</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={`${problem.contestId}-${problem.index}`} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{problem.contestId}{problem.index}. {problem.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {problem.rating && (
                      <span className={`font-medium ${getRatingColor(problem.rating)}`}>
                        {problem.rating}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {problem.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-1 text-xs bg-secondary rounded">
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-secondary rounded">
                          +{problem.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      Solve on Codeforces
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
