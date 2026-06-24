import { useParams, useLocation } from "wouter";
import { useGetProblemDetail, useSyncSolvedProblems } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

function ratingColor(rating: number): string {
  if (rating < 1200) return "text-green-600";
  if (rating < 1400) return "text-cyan-600";
  if (rating < 1600) return "text-blue-600";
  if (rating < 1900) return "text-purple-600";
  if (rating < 2400) return "text-orange-500";
  if (rating < 2700) return "text-red-500";
  return "text-red-800";
}

function buildStatementDoc(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script>
  window.MathJax = {
    tex: { inlineMath: [['$$$','$$$'], ['\\\\(','\\\\)']], displayMath: [['$$$$$$','$$$$$$'], ['\\\\[','\\\\]']] },
    options: { skipHtmlTags: ['script','noscript','style','textarea','pre'] }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; padding: 20px; margin: 0; color: #1a1a1a; }
  .problem-statement { max-width: 800px; }
  .header { margin-bottom: 20px; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .time-limit, .memory-limit { font-size: 13px; color: #666; }
  .section-title { font-weight: 700; margin-top: 20px; margin-bottom: 8px; }
  .note { background: #f8f9fa; border-left: 3px solid #dee2e6; padding: 12px; margin: 8px 0; }
  pre { background: #f8f9fa; padding: 12px; border-radius: 4px; overflow-x: auto; }
  table { border-collapse: collapse; margin: 8px 0; }
  td, th { border: 1px solid #dee2e6; padding: 8px 12px; }
  .input-specification, .output-specification { margin: 12px 0; }
  .sample-tests { margin-top: 20px; }
  .sample-test { display: flex; gap: 16px; margin: 12px 0; }
  .input, .output { flex: 1; }
  .input .title, .output .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
  .test-example-line { font-family: monospace; white-space: pre-wrap; }
</style>
</head>
<body>${html}</body>
</html>`;
}

export default function ProblemDetail() {
  const params = useParams<{ contestId: string; index: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const contestId = parseInt(params.contestId ?? "0");
  const index = params.index?.toUpperCase() ?? "";

  const { data: problem, isLoading, error } = useGetProblemDetail(contestId, index);
  const syncMutation = useSyncSolvedProblems();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 w-full">
        <div className="space-y-4">
          <div className="h-8 w-72 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          <div className="h-64 w-full bg-muted rounded animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 w-full text-center">
        <p className="text-muted-foreground mb-4">Problem not found.</p>
        <Button variant="outline" onClick={() => setLocation("/problems")}>Back to Problems</Button>
      </div>
    );
  }

  const cfUrl = problem.cfUrl ?? `https://codeforces.com/problemset/problem/${contestId}/${index}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 w-full">
      {/* Back */}
      <button
        onClick={() => setLocation("/problems")}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1"
      >
        ← Back to Problems
      </button>

      {/* Header card */}
      <div className="border border-border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-muted-foreground">{contestId}{index}</span>
              {problem.solvedByUser === true && (
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Solved
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-3">{problem.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {problem.rating > 0 && (
                <span>
                  Difficulty: <span className={`font-medium ${ratingColor(problem.rating)}`}>{problem.rating}</span>
                </span>
              )}
              {problem.timeLimit != null && (
                <span>Time: <span className="font-medium text-foreground">{(problem.timeLimit / 1000).toFixed(0)}s</span></span>
              )}
              {problem.memoryLimit != null && (
                <span>Memory: <span className="font-medium text-foreground">{problem.memoryLimit} MB</span></span>
              )}
              {problem.solvedCount != null && (
                <span>Solved by: <span className="font-medium text-foreground">{problem.solvedCount.toLocaleString()}</span></span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <a href={cfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">View on Codeforces</Button>
            </a>
            {user && !problem.solvedByUser && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  syncMutation.mutate(undefined, {
                    onSuccess: (r) => toast({ title: "Sync complete", description: r.message }),
                    onError: () => toast({ title: "Sync failed", description: "Could not sync from Codeforces.", variant: "destructive" }),
                  });
                }}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? "Syncing…" : "Mark as synced"}
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        {(problem.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {(problem.tags as string[]).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Problem Statement */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-sm font-medium">Problem Statement</span>
          {!problem.statementAvailable && (
            <span className="text-xs text-muted-foreground">
              Statement loading… or unavailable (Codeforces may block automated fetches)
            </span>
          )}
        </div>

        {problem.statementAvailable && problem.statementHtml ? (
          <div className="p-0">
            <iframe
              srcDoc={buildStatementDoc(problem.statementHtml)}
              className="w-full border-0"
              style={{ minHeight: "600px", height: "auto" }}
              sandbox="allow-scripts allow-same-origin"
              onLoad={(e) => {
                const iframe = e.currentTarget;
                try {
                  const body = iframe.contentDocument?.body;
                  if (body) {
                    const observer = new ResizeObserver(() => {
                      iframe.style.height = body.scrollHeight + 40 + "px";
                    });
                    observer.observe(body);
                    iframe.style.height = body.scrollHeight + 40 + "px";
                  }
                } catch { /* cross-origin guard */ }
              }}
            />
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="text-muted-foreground text-sm max-w-md mx-auto">
              <p className="mb-2 font-medium">Statement not yet cached</p>
              <p>
                The Codeforces API does not expose problem statements directly. CodeClash fetches and
                caches statements from Codeforces on first view. This fetch may fail if Codeforces
                rate-limits the request.
              </p>
            </div>
            <a href={cfUrl} target="_blank" rel="noopener noreferrer">
              <Button>Open on Codeforces</Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
