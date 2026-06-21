'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import ProblemStatement from '../../../components/problem/ProblemStatement';
import type { ProblemData } from '../../../components/problem/ProblemStatement';

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

export default function ProblemPracticePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(CODE_TEMPLATES.python);
  const [language, setLanguage] = useState('python');
  const [isSubmitRunning, setIsSubmitRunning] = useState(false);
  const [isRunRunning, setIsRunRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'testcase' | 'result'>('testcase');
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  useEffect(() => {
    fetchProblem();
  }, [slug]);

  const fetchProblem = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/problems/${slug}`
      );
      const data = await res.json();
      if (data.success) {
        setProblem(data.data);
        setCode(getStarterCode(data.data, language));
      } else {
        setProblem(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(getStarterCode(problem, lang));
  };

  const handleRunCode = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setRunResult({ error: 'Please log in to run code' });
      return;
    }

    setIsRunRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setActiveTab('result');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/problems/${slug}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language, code }),
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
    if (!token) {
      setSubmitResult({ error: 'Please log in to submit code' });
      return;
    }

    setIsSubmitRunning(true);
    setSubmitResult(null);
    setRunResult(null);
    setActiveTab('result');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/problems/${slug}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language, code }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setSubmitResult(data.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground text-sm font-medium">Loading problem details...</div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/20">
        <div className="text-center p-8 max-w-sm border rounded-2xl bg-card shadow-md">
          <h2 className="text-2xl font-bold mb-2">Problem Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            The problem with slug <span className="font-mono font-bold text-foreground">{slug}</span> could not be found.
          </p>
          <button
            onClick={() => router.push('/problems')}
            className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Problems List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header bar */}
      <div className="border-b px-6 py-3 flex items-center justify-between bg-card text-card-foreground">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/problems')}
            className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
          >
            &larr; Problems
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
            {problem.title}
          </h1>
          <span
            className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide ${
              problem.difficulty === 'easy'
                ? 'bg-green-500/10 text-green-500'
                : problem.difficulty === 'medium'
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {problem.difficulty}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">Single Player Practice Mode</div>
      </div>

      {/* Split Work Panels - responsive */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Side: Statement */}
        <div className="w-full lg:w-1/2 overflow-hidden border-b lg:border-b-0 lg:border-r bg-card/40">
          {problem ? (
            <ProblemStatement problem={problem as ProblemData} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground text-sm italic">Loading problem details...</div>
            </div>
          )}
        </div>

        {/* Right Side: Monaco & Console */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-hidden">
          {/* Controls Bar */}
          <div className="px-4 py-2 border-b flex items-center justify-between bg-card text-card-foreground">
            <div className="flex items-center gap-2">
              <label htmlFor="language" className="text-xs text-muted-foreground font-medium">
                Language:
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2.5 py-1 border rounded bg-transparent text-xs font-medium focus:outline-none"
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
                disabled={isRunRunning || isSubmitRunning}
                className="px-4 py-1.5 border rounded-lg text-xs font-semibold hover:bg-accent disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isRunRunning && (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Run
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isRunRunning || isSubmitRunning}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSubmitRunning && (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Submit
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 min-h-[300px] border-b">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
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

          {/* Testcases / Output Tabs */}
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
                  {problem.examples.slice(0, 2).map((ex, index) => (
                    <div key={index} className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Test Case {index + 1} Input</div>
                      <pre className="p-2 border rounded bg-card text-foreground">{ex.input}</pre>
                    </div>
                  ))}
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
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}
                        >
                          {submitResult.status}
                        </span>
                      </div>

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
                      </div>
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
