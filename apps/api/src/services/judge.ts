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
    run: (src: string) => `python3 "${src}"`,
  },
  javascript: {
    ext: '.js',
    run: (src: string) => `node "${src}"`,
  },
};

function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function wrapUserCode(code: string, language: string, input: string): string {
  // Wrap user code to read from stdin and write to stdout
  // The user's Solution class/function is already in the code
  // We just need to add the I/O wrapper
  switch (language) {
    case 'cpp':
      return `${code}

#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    std::ostringstream oss;
    while (std::getline(std::cin, line)) {
        oss << line << "\\n";
    }
    // The solution is already defined in the code above
    // For competitive programming, main() is usually provided by the platform
    return 0;
}`;
    case 'java':
      return code; // Java wraps differently
    case 'python':
      return code; // Python runs as-is
    case 'javascript':
      return code; // JS runs as-is
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

  const srcFile = path.join(workDir, `solution${langConf.ext}`);
  fs.writeFileSync(srcFile, code);

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

  const srcFile = path.join(workDir, `solution${langConf.ext}`);
  fs.writeFileSync(srcFile, code);

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
      runCmd = `python3 "${srcFile}"`;
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
  return output
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/gm, '')
    .toLowerCase();
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
