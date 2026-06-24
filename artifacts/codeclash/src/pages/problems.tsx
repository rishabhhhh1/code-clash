import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useListProblems, useSyncSolvedProblems } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RATING_PRESETS = [
  { label: "All difficulties", min: undefined, max: undefined },
  { label: "Easy (800–1199)", min: 800, max: 1199 },
  { label: "Medium (1200–1599)", min: 1200, max: 1599 },
  { label: "Hard (1600–1999)", min: 1600, max: 1999 },
  { label: "Expert (2000–2399)", min: 2000, max: 2399 },
  { label: "Master (2400–3500)", min: 2400, max: 3500 },
];

const POPULAR_TAGS = [
  "implementation", "math", "greedy", "dp", "data structures",
  "brute force", "constructive algorithms", "graphs", "sortings",
  "binary search", "dfs and similar", "trees", "strings",
  "number theory", "combinatorics", "two pointers", "bitmasks",
  "geometry", "shortest paths", "flows",
];

function ratingColor(rating: number): string {
  if (rating < 1200) return "text-green-600";
  if (rating < 1400) return "text-cyan-600";
  if (rating < 1600) return "text-blue-600";
  if (rating < 1900) return "text-purple-600";
  if (rating < 2400) return "text-orange-500";
  if (rating < 2700) return "text-red-500";
  return "text-red-800";
}

function ratingLabel(rating: number): string {
  if (rating < 1200) return "Easy";
  if (rating < 1400) return "Medium";
  if (rating < 1600) return "Hard";
  if (rating < 1900) return "Expert";
  if (rating < 2400) return "Master";
  return "Grandmaster";
}

export default function Problems() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [ratingPreset, setRatingPreset] = useState(0);
  const [tag, setTag] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [sort, setSort] = useState<"rating" | "contestId" | "name">("rating");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [solved, setSolved] = useState<"all" | "true" | "false">("all");

  const preset = RATING_PRESETS[ratingPreset];

  const params: Record<string, any> = {
    page,
    pageSize: 50,
    sort,
    order,
  };
  if (debouncedSearch) params.search = debouncedSearch;
  if (preset.min !== undefined) params.ratingMin = preset.min;
  if (preset.max !== undefined) params.ratingMax = preset.max;
  if (tag) params.tag = tag;
  if (solved !== "all" && user) params.solved = solved;

  const { data, isLoading } = useListProblems(params);
  const syncMutation = useSyncSolvedProblems();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
    setSearchTimer(t);
  }, [searchTimer]);

  const handleTagApply = () => {
    setTag(tagInput.trim().toLowerCase());
    setPage(1);
  };

  const handleTagClear = () => {
    setTag("");
    setTagInput("");
    setPage(1);
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: "Sync complete",
          description: result.message,
        });
      },
      onError: () => {
        toast({
          title: "Sync failed",
          description: "Could not sync from Codeforces. Make sure your CF handle is set in your profile.",
          variant: "destructive",
        });
      },
    });
  };

  const problems = data?.problems ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Problems</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total.toLocaleString()} problems from Codeforces
          </p>
        </div>
        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? "Syncing…" : "Sync Solved"}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="border border-border rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <Input
            placeholder="Search problems…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64"
          />

          {/* Difficulty preset */}
          <Select
            value={String(ratingPreset)}
            onValueChange={(v) => { setRatingPreset(Number(v)); setPage(1); }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {RATING_PRESETS.map((p, i) => (
                <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={`${sort}-${order}`}
            onValueChange={(v) => {
              const [s, o] = v.split("-") as [typeof sort, typeof order];
              setSort(s);
              setOrder(o);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating-asc">Difficulty ↑</SelectItem>
              <SelectItem value="rating-desc">Difficulty ↓</SelectItem>
              <SelectItem value="contestId-desc">Newest contest</SelectItem>
              <SelectItem value="contestId-asc">Oldest contest</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
            </SelectContent>
          </Select>

          {/* Solved filter — only for logged-in users */}
          {user && (
            <Select
              value={solved}
              onValueChange={(v) => { setSolved(v as typeof solved); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Solved</SelectItem>
                <SelectItem value="false">Unsolved</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tag:</span>
          <Input
            placeholder="e.g. dp"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTagApply()}
            className="w-40 h-8 text-sm"
          />
          <Button size="sm" variant="outline" className="h-8" onClick={handleTagApply}>Apply</Button>
          {tag && (
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={handleTagClear}>
              Clear: <span className="font-medium ml-1">{tag}</span> ×
            </Button>
          )}
          <div className="flex flex-wrap gap-1 ml-2">
            {POPULAR_TAGS.slice(0, 10).map((t) => (
              <button
                key={t}
                onClick={() => { setTagInput(t); setTag(t); setPage(1); }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  tag === t
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Problem</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Difficulty</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Tags</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24 hidden lg:table-cell">Solved</th>
              {user && <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">Status</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-64 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-40 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-12 bg-muted rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : problems.length === 0 ? (
              <tr>
                <td colSpan={user ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">
                  No problems found. Try adjusting your filters.
                </td>
              </tr>
            ) : (
              problems.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
                >
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {p.contestId}{p.problemIndex}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${p.contestId}/${p.problemIndex}`}>
                      <span className="font-medium group-hover:text-primary transition-colors cursor-pointer">
                        {p.title}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.rating > 0 ? (
                      <span className={`font-mono font-medium ${ratingColor(p.rating)}`}>
                        {p.rating}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(p.tags as string[]).slice(0, 3).map((t) => (
                        <button
                          key={t}
                          onClick={() => { setTag(t); setTagInput(t); setPage(1); }}
                          className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        >
                          {t}
                        </button>
                      ))}
                      {(p.tags as string[]).length > 3 && (
                        <span className="text-xs text-muted-foreground">+{(p.tags as string[]).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden lg:table-cell">
                    {p.solvedCount != null ? p.solvedCount.toLocaleString() : "—"}
                  </td>
                  {user && (
                    <td className="px-4 py-3 text-center">
                      {p.solvedByUser === true ? (
                        <span className="text-xs font-medium text-green-600">✓</span>
                      ) : p.solvedByUser === false ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const pageNum = start + i;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-xs text-muted-foreground text-center mt-6">
          <Link href="/login"><span className="underline cursor-pointer hover:text-foreground">Log in</span></Link> to track your solved status and filter by solved/unsolved.
        </p>
      )}
    </div>
  );
}
