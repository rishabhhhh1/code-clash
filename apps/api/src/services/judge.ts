import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config } from '../config';

export interface TestCase {
  input: string;
  expectedOutput: string;
  category?: string;
}

export interface TestResult {
  testCaseIndex: number;
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit' | 'memory_limit';
  input: string;
  expectedOutput: string;
  actualOutput: string;
  runtime: number; // ms
  memory: number;  // KB
}

export interface JudgeResult {
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit' | 'memory_limit' | 'compilation_error';
  testResults: TestResult[];
  totalRuntime: number;
  peakMemory: number;
  compilationOutput?: string;
}

const TEMP_DIR = path.join(os.tmpdir(), 'codeclash-judge');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// --- File extensions and compilers ---
interface LangConfig {
  ext: string;
  compile?: (src: string, bin: string, dir: string) => string;
  run: (src: string, bin: string, dir: string) => string;
}

const LANG_CONFIG: Record<string, LangConfig> = {
  cpp: {
    ext: '.cpp',
    compile: (src: string, bin: string) => `g++ -O2 -std=c++17 -o "${bin}" "${src}" 2>&1`,
    run: (bin: string) => bin,
  },
  java: {
    ext: '.java',
    compile: (src: string, _: string, dir: string) => `javac -d "${dir}" "${src}" 2>&1`,
    run: (_: string, __: string, dir: string) => `java -cp "${dir}" Solution`,
  },
  python: {
    ext: '.py',
    run: (src: string) => `python "${src}"`,
  },
  javascript: {
    ext: '.js',
    run: (src: string) => `node "${src}"`,
  },
};

function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 });
    // Also check if the judge image exists
    const image = config.judgeDockerImage || 'codeclash-judge:latest';
    execSync(`docker image inspect ${image}`, { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function wrapUserCode(code: string, language: string, _input: string): string {
  // Wrap user code with I/O so LeetCode-style Solution class works
  // The user defines class Solution { method(...) {...} }
  // Our wrapper reads stdin, instantiates Solution, calls the method, prints output

  switch (language) {
    case 'python':
      return `${code}

# --- Judge I/O Wrapper (auto-generated) ---
import sys as __sys, json as __json

def __judge_wrapper():
    raw = __sys.stdin.read().strip()
    if not raw:
        return
    lines = [l.strip() for l in raw.split('\\n') if l.strip()]
    args = []
    for line in lines:
        try:
            args.append(__json.loads(line))
        except Exception:
            args.append(line)

    try:
        sol = Solution()
    except Exception as e:
        print(f"Error creating Solution: {e}", file=__sys.stderr)
        return

    # Find first public method (skip _dunder methods)
    methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
    if not methods:
        print("No callable method found on Solution", file=__sys.stderr)
        return

    try:
        result = getattr(sol, methods[0])(*args)
        print(__json.dumps(result))
    except Exception as e:
        print(f"Error: {e}", file=__sys.stderr)

if __name__ == '__main__':
    __judge_wrapper()
`;

    case 'javascript':
      return `${code}

// --- Judge I/O Wrapper (auto-generated) ---
(function() {
  const chunks = [];
  process.stdin.on('data', chunk => chunks.push(chunk));
  process.stdin.on('end', () => {
    const input = Buffer.concat(chunks).toString('utf-8').trim();
    if (!input) return;
    const lines = input.split('\\n').filter(l => l.trim());
    const args = lines.map(line => {
      try { return JSON.parse(line.trim()); }
      catch { return line.trim(); }
    });

    let sol;
    try { sol = new Solution(); }
    catch(e) { process.stderr.write('Error creating Solution: ' + e.message); return; }

    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(sol))
      .filter(m => m !== 'constructor' && typeof sol[m] === 'function');

    if (methods.length === 0) {
      process.stderr.write('No callable method found on Solution');
      return;
    }

    try {
      const result = sol[methods[0]](...args);
      console.log(JSON.stringify(result));
    } catch(e) {
      process.stderr.write('Error: ' + e.message);
    }
  });
  process.stdin.resume();
})();
`;

    case 'cpp':
      // C++ users typically write complete programs with main()
      // Add a basic stdin reader if no main() is detected
      if (code.includes('int main')) {
        return code; // User has their own main
      }
      return `${code}

#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <cstdlib>

// Auto-generated main for solutions without one
int main() {
    std::string line;
    std::ostringstream oss;
    while (std::getline(std::cin, line)) {
        oss << line << "\\n";
    }
    // User must implement their own I/O in the Solution class
    return 0;
}`;

    case 'java':
      // Java solutions need a Main class with main()
      if (code.includes('public static void main')) {
        return code; // User has their own main
      }
      // For single-file Java, keep as-is (Java requires class matching filename)
      return code;

    default:
      return code;
  }
}

async function runInDocker(
  code: string,
  language: string,
  input: string,
  timeLimitMs: number,
  memoryLimitMb: number
): Promise<{ stdout: string; stderr: string; exitCode: number; runtime: number; memory: number }> {
  const langConf = LANG_CONFIG[language];
  if (!langConf) throw new Error(`Unsupported language: ${language}`);

  const runId = `judge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const workDir = path.join(TEMP_DIR, runId);
  fs.mkdirSync(workDir, { recursive: true });

  const wrappedCode = wrapUserCode(code, language, input);
  const srcFile = path.join(workDir, `solution${langConf.ext}`);
  fs.writeFileSync(srcFile, wrappedCode);

  const startTime = Date.now();

  try {
    // Compile if needed
    if (langConf.compile) {
      const binFile = path.join(workDir, 'solution');
      const compileCmd = langConf.compile(srcFile, binFile, workDir);
      const compileResult = execSync(compileCmd, {
        timeout: 30000,
        encoding: 'utf-8',
        cwd: workDir,
      });
      if (compileResult && compileResult.trim().length > 0 && !fs.existsSync(binFile)) {
        return {
          stdout: '',
          stderr: compileResult,
          exitCode: -1,
          runtime: 0,
          memory: 0,
        };
      }
    }

    // Run in Docker
    const runCmd = langConf.run(srcFile, '', workDir);
    const dockerImage = config.judgeDockerImage || 'codeclash-judge:latest';
    const dockerCmd = [
      'run', '--rm',
      '--network=none',
      `--memory=${memoryLimitMb}m`,
      '--cpus=1',
      `-v`, `${workDir}:/judge:ro`,
      dockerImage,
      'bash', '-c', `cd /judge && ${runCmd} < /dev/stdin`,
    ];

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const proc = spawn('docker', dockerCmd, {
        timeout: timeLimitMs + 5000, // extra time for Docker overhead
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      // Send input
      proc.stdin?.write(input);
      proc.stdin?.end();

      proc.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });

      proc.on('error', () => {
        resolve({ stdout: '', stderr: 'Process error', exitCode: -1 });
      });

      // Timeout enforcement
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
      }, timeLimitMs);
    });

    const runtime = Date.now() - startTime;

    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: result.exitCode,
      runtime,
      memory: 0, // Docker memory tracking needs cgroup reads
    };
  } finally {
    // Cleanup
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

async function runAsChildProcess(
  code: string,
  language: string,
  input: string,
  timeLimitMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number; runtime: number; memory: number }> {
  const langConf = LANG_CONFIG[language];
  if (!langConf) throw new Error(`Unsupported language: ${language}`);

  const runId = `judge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const workDir = path.join(TEMP_DIR, runId);
  fs.mkdirSync(workDir, { recursive: true });

  const wrappedCode = wrapUserCode(code, language, input);
  const srcFile = path.join(workDir, `solution${langConf.ext}`);
  fs.writeFileSync(srcFile, wrappedCode);

  const startTime = Date.now();

  try {
    let runCmd: string;

    if (language === 'cpp') {
      const binFile = path.join(workDir, 'solution');
      try {
        execSync(`g++ -O2 -std=c++17 -o "${binFile}" "${srcFile}" 2>&1`, {
          timeout: 30000,
          encoding: 'utf-8',
        });
      } catch (e: any) {
        return { stdout: '', stderr: e.stdout || e.message, exitCode: -1, runtime: 0, memory: 0 };
      }
      runCmd = binFile;
    } else if (language === 'java') {
      try {
        execSync(`javac -d "${workDir}" "${srcFile}" 2>&1`, {
          timeout: 30000,
          encoding: 'utf-8',
        });
      } catch (e: any) {
        return { stdout: '', stderr: e.stdout || e.message, exitCode: -1, runtime: 0, memory: 0 };
      }
      runCmd = `java -cp "${workDir}" Solution`;
    } else if (language === 'python') {
      runCmd = `python "${srcFile}"`;
    } else if (language === 'javascript') {
      runCmd = `node "${srcFile}"`;
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const proc = spawn(runCmd.split(' ')[0], runCmd.split(' ').slice(1), {
        timeout: timeLimitMs,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.stdin?.write(input);
      proc.stdin?.end();

      proc.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });

      proc.on('error', (err) => {
        resolve({ stdout: '', stderr: err.message, exitCode: -1 });
      });

      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
      }, timeLimitMs);
    });

    const runtime = Date.now() - startTime;

    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: result.exitCode,
      runtime,
      memory: 0,
    };
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

function normalizeOutput(output: string): string {
  const trimmed = output
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/gm, '')
    .toLowerCase();

  // Try JSON parse + stringify for consistent formatting
  // Handles: [0, 1] vs [0,1], { "a": 1 } vs {"a":1}, etc.
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed);
  } catch {
    return trimmed;
  }
}

export async function executeCode(
  code: string,
  language: string,
  input: string,
  timeLimitMs: number = config.judgeTimeoutMs,
  memoryLimitMb: number = config.judgeMemoryLimitMb
): Promise<{ stdout: string; stderr: string; exitCode: number; runtime: number; compilationOutput?: string }> {
  const useDocker = isDockerAvailable();
  const runner = useDocker ? runInDocker : runAsChildProcess;
  const result = await runner(code, language, input, timeLimitMs, memoryLimitMb);

  if (result.exitCode === -1 && result.stderr.includes('error:')) {
    return { ...result, compilationOutput: result.stderr };
  }

  return result;
}

export async function judgeCode(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimitMs: number = config.judgeTimeoutMs,
  memoryLimitMb: number = config.judgeMemoryLimitMb
): Promise<JudgeResult> {
  const useDocker = isDockerAvailable();
  const runner = useDocker ? runInDocker : runAsChildProcess;

  const testResults: TestResult[] = [];
  let totalRuntime = 0;
  let peakMemory = 0;
  let compilationOutput: string | undefined;

  // Limit test cases for run mode (first 3 only)
  const casesToRun = testCases;

  for (let i = 0; i < casesToRun.length; i++) {
    const tc = casesToRun[i];

    try {
      const result = await runner(code, language, tc.input, timeLimitMs, memoryLimitMb);

      // Check compilation error
      if (result.exitCode === -1 && result.stderr.includes('error:')) {
        return {
          status: 'compilation_error',
          testResults: [],
          totalRuntime: 0,
          peakMemory: 0,
          compilationOutput: result.stderr,
        };
      }

      // Check timeout
      if (result.runtime >= timeLimitMs) {
        testResults.push({
          testCaseIndex: i,
          status: 'time_limit',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          runtime: result.runtime,
          memory: result.memory,
        });
        totalRuntime += result.runtime;
        continue;
      }

      // Check runtime error
      if (result.exitCode !== 0 && result.stderr.length > 0) {
        testResults.push({
          testCaseIndex: i,
          status: 'runtime_error',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: result.stdout || result.stderr,
          runtime: result.runtime,
          memory: result.memory,
        });
        totalRuntime += result.runtime;
        continue;
      }

      // Compare output
      const actual = normalizeOutput(result.stdout);
      const expected = normalizeOutput(tc.expectedOutput);

      const passed = actual === expected;

      testResults.push({
        testCaseIndex: i,
        status: passed ? 'accepted' : 'wrong_answer',
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.stdout,
        runtime: result.runtime,
        memory: result.memory,
      });

      totalRuntime += result.runtime;
      peakMemory = Math.max(peakMemory, result.memory);

      // Short-circuit on first failure for run mode
      if (!passed && casesToRun.length <= 10) {
        break;
      }
    } catch (err: any) {
      testResults.push({
        testCaseIndex: i,
        status: 'runtime_error',
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: err.message || 'Unknown error',
        runtime: 0,
        memory: 0,
      });
    }
  }

  // Determine overall status
  let status: JudgeResult['status'] = 'accepted';
  for (const tr of testResults) {
    if (tr.status !== 'accepted') {
      status = tr.status;
      break;
    }
  }

  return {
    status,
    testResults,
    totalRuntime,
    peakMemory,
    compilationOutput,
  };
}
