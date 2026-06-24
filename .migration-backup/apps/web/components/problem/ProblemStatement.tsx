'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface ProblemData {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  description: string;
  inputFormat?: string | null;
  outputFormat?: string | null;
  examples: Example[];
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

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  hard: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
};

function CollapsibleSection({
  title,
  defaultOpen = false,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4 border-t">{children}</div>}
    </div>
  );
}

export default function ProblemStatement({
  problem,
  onSynced,
}: {
  problem: ProblemData;
  onSynced?: (updated: ProblemData) => void;
}) {
  const diff = DIFFICULTY_STYLES[problem.difficulty] || DIFFICULTY_STYLES.medium;
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const needsSync =
    !problem.description ||
    problem.description.includes('imported from LeetCode') ||
    problem.description.length < 50;

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/problems/${problem.id}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setSyncError(data.error || 'Sync failed');
      }
    } catch (e: any) {
      setSyncError(e.message || 'Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  let mainDescription = problem.description || '';
  let extractedInputFormat = problem.inputFormat || '';
  let extractedOutputFormat = problem.outputFormat || '';
  const extractedConstraints: string[] = [...(problem.constraints || [])];

  if (mainDescription && !needsSync) {
    const inputMatch = mainDescription.match(/\*\*Input Format[:\*]*\*\*\s*([\s\S]*?)(?=\*\*Output Format|\*\*Constraints?\*\*|\*\*Example|\n---|\n##\s|$)/i);
    const outputMatch = mainDescription.match(/\*\*Output Format[:\*]*\*\*\s*([\s\S]*?)(?=\*\*Constraints?\*\*|\*\*Example|\n---|\n##\s|$)/i);
    const constraintMatch = mainDescription.match(/\*\*Constraints?[:\*]*\*\*\s*([\s\S]*?)(?=\*\*Example|\n---|\n##\s|$)/i);

    if (inputMatch && !extractedInputFormat) extractedInputFormat = inputMatch[1].trim();
    if (outputMatch && !extractedOutputFormat) extractedOutputFormat = outputMatch[1].trim();
    if (constraintMatch && extractedConstraints.length === 0) {
      const lines = constraintMatch[1].split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
      extractedConstraints.push(...lines);
    }

    if (inputMatch || outputMatch || constraintMatch) {
      mainDescription = mainDescription
        .replace(/\*\*Input Format[:\*]*\*\*\s*[\s\S]*?(?=\*\*Output Format|\*\*Constraints?\*\*|\*\*Example|\n---|\n##\s|$)/i, '')
        .replace(/\*\*Output Format[:\*]*\*\*\s*[\s\S]*?(?=\*\*Constraints?\*\*|\*\*Example|\n---|\n##\s|$)/i, '')
        .replace(/\*\*Constraints?[:\*]*\*\*\s*[\s\S]*?(?=\*\*Example|\n---|\n##\s|$)/i, '')
        .trim();
    }
  }

  if (needsSync) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">{problem.title}</h1>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide border ${diff.bg} ${diff.text} ${diff.border}`}>
              {problem.difficulty}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {problem.topics.map((topic) => (
              <span key={topic} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">
                {topic.replace(/-/g, ' ')}
              </span>
            ))}
          </div>

          <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Problem content not yet loaded
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Full problem details (description, examples, test cases, starter code) have not been fetched from LeetCode yet.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {syncing && (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {syncing ? 'Syncing from LeetCode...' : 'Sync from LeetCode'}
            </button>
            {syncError && (
              <p className="mt-2 text-xs text-red-500">{syncError}</p>
            )}
            {problem.problemLink && (
              <a
                href={problem.problemLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
              >
                View on LeetCode
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">{problem.title}</h1>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide border ${diff.bg} ${diff.text} ${diff.border}`}>
              {problem.difficulty}
            </span>
            {problem.acceptanceRate != null && (
              <span className="text-xs text-muted-foreground">Acceptance: {problem.acceptanceRate}%</span>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {problem.topics.map((topic) => (
              <span key={topic} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">
                {topic.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match && !String(children).includes('\n');
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="relative">
                    {match && (
                      <div className="absolute top-2 right-2 text-[10px] text-muted-foreground uppercase font-mono bg-muted px-1.5 py-0.5 rounded">
                        {match[1]}
                      </div>
                    )}
                    <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto border">
                      <code className={`text-sm font-mono ${className || ''}`} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
              p({ children }) {
                return <p className="text-sm leading-relaxed mb-3">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc pl-5 space-y-1 text-sm">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal pl-5 space-y-1 text-sm">{children}</ol>;
              },
              li({ children }) {
                return <li className="text-sm leading-relaxed">{children}</li>;
              },
              strong({ children }) {
                return <strong className="font-semibold text-foreground">{children}</strong>;
              },
              h2({ children }) {
                return <h2 className="text-base font-bold mt-4 mb-2">{children}</h2>;
              },
              h3({ children }) {
                return <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>;
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-sm">{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return <th className="border px-3 py-2 bg-muted font-semibold text-left">{children}</th>;
              },
              td({ children }) {
                return <td className="border px-3 py-2">{children}</td>;
              },
            }}
          >
            {mainDescription}
          </ReactMarkdown>
        </div>

        {extractedInputFormat && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Input Format</h3>
            <div className="text-sm text-foreground/80 leading-relaxed border-l-2 border-primary/20 pl-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{extractedInputFormat}</ReactMarkdown>
            </div>
          </div>
        )}

        {extractedOutputFormat && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Output Format</h3>
            <div className="text-sm text-foreground/80 leading-relaxed border-l-2 border-primary/20 pl-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{extractedOutputFormat}</ReactMarkdown>
            </div>
          </div>
        )}

        {problem.examples && problem.examples.length > 0 && (
          <CollapsibleSection title="Examples" defaultOpen={true} count={problem.examples.length}>
            <div className="space-y-4 pt-3">
              {problem.examples.map((ex, index) => (
                <div key={index} className="p-4 border rounded-lg bg-muted/30 font-mono text-xs space-y-2">
                  <div className="font-semibold text-muted-foreground text-[11px] mb-2 font-sans">
                    Example {index + 1}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="text-muted-foreground w-16 shrink-0 font-sans">Input:</span>
                      <span className="text-foreground break-all whitespace-pre-wrap">{ex.input}</span>
                    </div>
                    <div className="flex">
                      <span className="text-muted-foreground w-16 shrink-0 font-sans">Output:</span>
                      <span className="text-foreground break-all whitespace-pre-wrap">{ex.output}</span>
                    </div>
                    {ex.explanation && (
                      <div className="pt-2 mt-2 border-t border-muted/50 flex">
                        <span className="text-muted-foreground w-16 shrink-0 font-sans">Explanation:</span>
                        <span className="font-sans text-foreground/80 text-xs leading-relaxed">{ex.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {extractedConstraints.length > 0 && (
          <CollapsibleSection title="Constraints" defaultOpen={true} count={extractedConstraints.length}>
            <ul className="space-y-1.5 pt-3">
              {extractedConstraints.map((c, i) => (
                <li key={i} className="font-mono text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-foreground/40 mt-0.5">-</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {problem.hints && problem.hints.length > 0 && (
          <CollapsibleSection title="Hints" defaultOpen={false} count={problem.hints.length}>
            <ul className="space-y-2 pt-3">
              {problem.hints.map((hint, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-primary font-semibold">{i + 1}.</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <span>Time: {problem.timeLimit / 1000}s</span>
          <span>Memory: {problem.memoryLimit}MB</span>
          {problem.problemLink && (
            <a
              href={problem.problemLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              View on LeetCode
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ProblemData, Example };
