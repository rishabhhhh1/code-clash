import { prisma } from '../config/database';
import { generateProblemContent, generateTestCasesForProblem } from './ai-problem-generator';
import { getAlgorithmicTestCases } from './testcase-generators';
import { config } from '../config';
import {
  assignHiddenFlags,
  getMinTestCaseCount,
  getVisibleTestCaseCount,
  parseStoredTestCases,
  splitTestCases,
  StoredTestCase,
  validateProblemTestCases,
} from './problem-completion';
import {
  pickReferenceSolution,
  resolveExpectedOutputs,
  InputOnlyTestCase,
} from './reference-output';
import { deduplicateTestCases } from './testcase-validator';

// In-memory lock to prevent concurrent generation for the same problem
const generationLocks = new Map<string, Promise<void>>();

/**
 * Ensure a problem has been fully generated (content + test cases).
 * This is called lazily when a problem is first accessed.
 * Uses a lock to prevent concurrent generation for the same problem.
 */
export async function ensureProblemGenerated(problemId: string): Promise<void> {
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) throw new Error('Problem not found');

  if (problem.generationStatus === 'completed') return;

  if (generationLocks.has(problemId)) {
    await generationLocks.get(problemId);
    return;
  }

  const lock = doGenerate(problemId);
  generationLocks.set(problemId, lock);

  try {
    await lock;
  } finally {
    generationLocks.delete(problemId);
  }
}

async function doGenerate(problemId: string): Promise<void> {
  await prisma.problem.update({
    where: { id: problemId },
    data: { generationStatus: 'in_progress' },
  });

  try {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('Problem not found');

    console.log(`[Generator] Starting generation for: ${problem.title} (${problem.difficulty})`);

    const needsContent =
      !problem.inputFormat ||
      !problem.outputFormat ||
      !Array.isArray(problem.examples) ||
      problem.examples.length === 0 ||
      !Array.isArray(problem.constraints) ||
      problem.constraints.length === 0;

    let content = null;
    if (needsContent && config.openaiApiKey) {
      try {
        content = await generateProblemContent(
          problem.title,
          problem.difficulty,
          problem.topics,
          problem.description || undefined
        );
        console.log(`[Generator] AI content generated for: ${problem.title}`);
      } catch (err: any) {
        console.error(`[Generator] AI content generation failed for ${problem.title}:`, err.message);
      }
    }

    const existingCases = parseStoredTestCases(problem.testCases);
    const minCount = getMinTestCaseCount(problem.difficulty);
    const constraints = (content?.constraints || (problem.constraints as string[]) || []) as string[];

    let testCases: StoredTestCase[] = existingCases;

    if (testCases.length < minCount) {
      testCases = await generateAllTestCases(
        problem.title,
        problem.slug,
        problem.difficulty,
        problem.topics,
        content?.inputFormat || problem.inputFormat || '',
        content?.outputFormat || problem.outputFormat || '',
        constraints,
        (problem.referenceSolutions as Record<string, string> | null) || content?.referenceSolutions || null
      );
      console.log(`[Generator] Generated ${testCases.length} test cases for: ${problem.title}`);
    }

    const validation = validateProblemTestCases(testCases, constraints, problem.difficulty);

    const updateData: any = {
      generationError: null,
    };

    if (content) {
      updateData.description = content.description;
      updateData.inputFormat = content.inputFormat;
      updateData.outputFormat = content.outputFormat;
      updateData.examples = content.examples;
      updateData.constraints = content.constraints;
      updateData.hints = content.hints;
      updateData.starterCodeCpp = content.starterCode.cpp;
      updateData.starterCodeJava = content.starterCode.java;
      updateData.starterCodePython = content.starterCode.python;
      updateData.starterCodeJavaScript = content.starterCode.javascript;
      updateData.referenceSolutions = content.referenceSolutions;
    }

    if (testCases.length > 0) {
      updateData.testCases = testCases;
      updateData.totalTestCases = testCases.length;
    }

    if (validation.valid) {
      updateData.generationStatus = 'completed';
      updateData.generatedAt = new Date();
    } else {
      updateData.generationStatus = 'failed';
      updateData.generationError = validation.errors.join('; ').slice(0, 500);
    }

    await prisma.problem.update({
      where: { id: problemId },
      data: updateData,
    });

    console.log(`[Generator] Completed generation for: ${problem.title}`);
  } catch (err: any) {
    console.error(`[Generator] Generation failed for ${problemId}:`, err.message);
    await prisma.problem.update({
      where: { id: problemId },
      data: {
        generationStatus: 'failed',
        generationError: err.message,
      },
    });
  }
}

async function generateAllTestCases(
  title: string,
  slug: string,
  difficulty: string,
  topics: string[],
  inputFormat: string,
  outputFormat: string,
  constraints: string[],
  referenceSolutions: Record<string, string> | null
): Promise<StoredTestCase[]> {
  const minCount = getMinTestCaseCount(difficulty);
  const inputCases: InputOnlyTestCase[] = [];

  const algoCases = getAlgorithmicTestCases(slug);
  if (algoCases?.length) {
    for (const tc of algoCases) {
      inputCases.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        category: tc.category,
      });
    }
    console.log(`[Generator] Using ${algoCases.length} algorithmic test cases for: ${slug}`);
  }

  const remaining = minCount - inputCases.length;

  if (config.openaiApiKey && remaining > 0) {
    try {
      const aiCases = await generateTestCasesForProblem(
        title,
        difficulty,
        topics,
        inputFormat,
        outputFormat,
        constraints,
        remaining
      );

      for (const tc of aiCases) {
        inputCases.push({ input: tc.input, category: tc.category });
      }

      console.log(`[Generator] AI generated ${aiCases.length} additional inputs for: ${slug}`);
    } catch (err: any) {
      console.error(`[Generator] AI test case generation failed for ${slug}:`, err.message);
    }
  }

  const ref = pickReferenceSolution(referenceSolutions);
  if (!ref) {
    throw new Error('No reference solution available for test case output computation');
  }

  const resolved = await resolveExpectedOutputs(ref.code, ref.language, inputCases);
  const deduped = deduplicateTestCases(resolved) as StoredTestCase[];

  if (deduped.length < minCount) {
    throw new Error(`Only ${deduped.length} test cases after resolution, need ${minCount}`);
  }

  return assignHiddenFlags(deduped, difficulty);
}

function getTestCasesFromProblem(problem: { testCases: unknown; difficulty: string }) {
  const all = parseStoredTestCases(problem.testCases);
  return splitTestCases(all, problem.difficulty);
}

/**
 * Get visible test cases for a problem.
 */
export async function getVisibleTestCases(problemId: string): Promise<StoredTestCase[]> {
  await ensureProblemGenerated(problemId);
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { testCases: true, difficulty: true },
  });
  if (!problem) return [];
  return getTestCasesFromProblem(problem).visible;
}

/**
 * Get hidden test cases for a problem (used during submission).
 */
export async function getHiddenTestCases(problemId: string): Promise<StoredTestCase[]> {
  await ensureProblemGenerated(problemId);
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { testCases: true, difficulty: true },
  });
  if (!problem) return [];
  return getTestCasesFromProblem(problem).hidden;
}

/**
 * Get all test cases (visible + hidden) for a problem.
 */
export async function getAllTestCases(problemId: string): Promise<StoredTestCase[]> {
  await ensureProblemGenerated(problemId);
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { testCases: true },
  });
  return parseStoredTestCases(problem?.testCases);
}
