import { config } from '../config';
import { validateAllTestCases, TestCase } from './testcase-validator';

export interface StoredTestCase {
  input: string;
  expectedOutput: string;
  category: string;
  isHidden?: boolean;
}

export interface ProblemContentFields {
  description?: string | null;
  inputFormat?: string | null;
  outputFormat?: string | null;
  examples?: unknown;
  constraints?: unknown;
  hints?: unknown;
  testCases?: unknown;
  generationStatus?: string | null;
}

export function getMinTestCaseCount(difficulty: string): number {
  const cfg = config.testCasesPerDifficulty[difficulty as keyof typeof config.testCasesPerDifficulty]
    || config.testCasesPerDifficulty.medium;
  return cfg.total ?? (cfg.visible + cfg.hidden);
}

export function getVisibleTestCaseCount(difficulty: string): number {
  const cfg = config.testCasesPerDifficulty[difficulty as keyof typeof config.testCasesPerDifficulty]
    || config.testCasesPerDifficulty.medium;
  return cfg.visible;
}

export function parseStoredTestCases(raw: unknown): StoredTestCase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((tc) => tc && typeof tc === 'object' && 'input' in tc)
    .map((tc: any) => ({
      input: String(tc.input ?? ''),
      expectedOutput: String(tc.expectedOutput ?? tc.output ?? ''),
      category: String(tc.category ?? 'basic'),
      isHidden: Boolean(tc.isHidden),
    }))
    .filter((tc) => tc.input.length > 0 && tc.expectedOutput.length > 0);
}

export function isProblemContentComplete(problem: ProblemContentFields, difficulty: string): boolean {
  if (problem.generationStatus === 'completed') return true;

  const examples = Array.isArray(problem.examples) ? problem.examples : [];
  const constraints = Array.isArray(problem.constraints) ? problem.constraints : [];
  const hints = Array.isArray(problem.hints) ? problem.hints : [];
  const testCases = parseStoredTestCases(problem.testCases);
  const minCount = getMinTestCaseCount(difficulty);

  return Boolean(
    problem.inputFormat &&
    problem.outputFormat &&
    examples.length > 0 &&
    constraints.length > 0 &&
    hints.length > 0 &&
    testCases.length >= minCount
  );
}

export function splitTestCases(
  testCases: StoredTestCase[],
  difficulty: string
): { visible: StoredTestCase[]; hidden: StoredTestCase[] } {
  const visibleLimit = getVisibleTestCaseCount(difficulty);
  const visible: StoredTestCase[] = [];
  const hidden: StoredTestCase[] = [];

  for (const tc of testCases) {
    if (!tc.isHidden && visible.length < visibleLimit) {
      visible.push({ ...tc, isHidden: false });
    } else {
      hidden.push({ ...tc, isHidden: true });
    }
  }

  while (visible.length < Math.min(visibleLimit, testCases.length) && hidden.length > 0) {
    const tc = hidden.shift()!;
    visible.push({ ...tc, isHidden: false });
  }

  return { visible, hidden };
}

export function assignHiddenFlags(
  testCases: StoredTestCase[],
  difficulty: string
): StoredTestCase[] {
  const visibleLimit = getVisibleTestCaseCount(difficulty);
  return testCases.map((tc, index) => ({
    ...tc,
    isHidden: tc.isHidden ?? index >= visibleLimit,
  }));
}

export function validateProblemTestCases(
  testCases: StoredTestCase[],
  constraints: string[],
  difficulty: string
): { valid: boolean; errors: string[] } {
  const minCount = getMinTestCaseCount(difficulty);
  const errors: string[] = [];

  if (testCases.length < minCount) {
    errors.push(`Expected at least ${minCount} test cases, got ${testCases.length}`);
  }

  const result = validateAllTestCases(testCases as TestCase[], constraints);
  if (!result.valid) {
    errors.push(...result.errors.slice(0, 5));
    if (result.invalidTestCases > 0) {
      errors.push(`${result.invalidTestCases} invalid test case(s)`);
    }
  }

  return { valid: errors.length === 0, errors };
}
