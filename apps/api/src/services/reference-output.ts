import { executeCode, judgeCode } from './judge';
import { config } from '../config';

export interface InputOnlyTestCase {
  input: string;
  expectedOutput?: string;
  category: string;
  isHidden?: boolean;
}

export interface ResolvedTestCase {
  input: string;
  expectedOutput: string;
  category: string;
  isHidden?: boolean;
}

/**
 * Run a reference solution against test inputs to produce expected outputs.
 * Never guesses — outputs come only from executing the reference code.
 */
export async function resolveExpectedOutputs(
  referenceCode: string,
  language: string,
  inputs: InputOnlyTestCase[],
  timeLimitMs: number = config.judgeTimeoutMs,
  memoryLimitMb: number = config.judgeMemoryLimitMb
): Promise<ResolvedTestCase[]> {
  const resolved: ResolvedTestCase[] = [];

  for (const tc of inputs) {
    if (tc.expectedOutput && tc.expectedOutput !== 'to_be_computed') {
      resolved.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        category: tc.category,
        isHidden: tc.isHidden,
      });
      continue;
    }

    const result = await executeCode(referenceCode, language, tc.input, timeLimitMs, memoryLimitMb);

    if (result.compilationOutput) {
      throw new Error(`Reference solution compilation failed: ${result.compilationOutput}`);
    }

    if (result.exitCode !== 0 || result.stderr.length > 0) {
      throw new Error(
        `Reference solution failed on input "${tc.input.slice(0, 80)}": ${result.stderr || 'runtime error'}`
      );
    }

    if (!result.stdout.trim()) {
      throw new Error(`Reference solution produced empty output for input "${tc.input.slice(0, 80)}"`);
    }

    resolved.push({
      input: tc.input,
      expectedOutput: result.stdout.trim(),
      category: tc.category,
      isHidden: tc.isHidden,
    });
  }

  return resolved;
}

/**
 * Verify reference solution passes on example cases before bulk generation.
 */
export async function verifyReferenceOnExamples(
  referenceCode: string,
  language: string,
  examples: Array<{ input: string; output: string }>
): Promise<void> {
  for (const ex of examples.slice(0, 3)) {
    const result = await judgeCode(
      referenceCode,
      language,
      [{ input: ex.input, expectedOutput: ex.output }],
      config.judgeTimeoutMs,
      config.judgeMemoryLimitMb
    );

    if (result.status === 'compilation_error') {
      throw new Error(`Reference solution does not compile: ${result.compilationOutput}`);
    }

    const run = result.testResults[0];
    if (!run || run.status !== 'accepted') {
      throw new Error(`Reference solution wrong on example input: ${ex.input.slice(0, 80)}`);
    }
  }
}

export function pickReferenceSolution(
  referenceSolutions: Record<string, string> | null | undefined
): { code: string; language: string } | null {
  if (!referenceSolutions) return null;

  const order: Array<{ key: string; language: string }> = [
    { key: 'python', language: 'python' },
    { key: 'javascript', language: 'javascript' },
    { key: 'java', language: 'java' },
    { key: 'cpp', language: 'cpp' },
  ];

  for (const { key, language } of order) {
    const code = referenceSolutions[key];
    if (code && code.trim().length > 20 && !code.includes('Reference solution') && !code.includes('Implement your')) {
      return { code, language };
    }
  }

  return null;
}
