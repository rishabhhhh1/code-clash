'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface CfProblemDetail {
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

export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [problem, setProblem] = useState<CfProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const match = slug.match(/^(\d+)-([A-Za-z]\d*)$/);
    if (!match) {
      setError('Invalid problem identifier. Use format like 1744-B.');
      setLoading(false);
      return;
    }

    const contestId = match[1];
    const index = match[2];

    fetch(`${apiUrl}/api/problems/${contestId}/${index}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProblem(data.data);
        } else {
          setError(data.error || 'Problem not found on Codeforces');
        }
      })
      .catch(() => setError('Failed to load problem from Codeforces'))
      .finally(() => setLoading(false));
  }, [slug, apiUrl]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading problem from Codeforces...
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="container mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-red-500">{error || 'Problem not found'}</p>
        <Link href="/problems" className="text-primary hover:underline">
          Back to problems
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/problems" className="text-sm text-muted-foreground hover:text-primary">
        ← Back to problems
      </Link>

      <div className="mt-6 p-6 border rounded-2xl bg-card space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            {problem.contestId}{problem.index}. {problem.name}
          </h1>
          <p className="text-muted-foreground mt-1">Problem data from Codeforces</p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          {problem.rating && (
            <span className="px-3 py-1 rounded-full bg-muted font-medium">
              Rating {problem.rating}
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-muted capitalize">
            {problem.difficulty}
          </span>
          {problem.points && (
            <span className="px-3 py-1 rounded-full bg-muted">
              {problem.points} points
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {problem.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs bg-secondary rounded">
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>

        <p className="text-muted-foreground">
          CodeClash does not host problem statements. Open the original Codeforces page to read the
          statement, write your solution, and submit from your Codeforces account.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
          >
            Open on Codeforces
          </a>
          <a
            href={problem.contestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border rounded-lg font-medium hover:bg-accent"
          >
            View Contest
          </a>
        </div>
      </div>
    </div>
  );
}
