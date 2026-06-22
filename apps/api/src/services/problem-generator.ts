import { prisma } from '../config/database';
import { generateProblemContent, generateTestCasesForProblem, GeneratedTestCase } from './ai-problem-generator';
import { getAlgorithmicTestCases, TestCase as AlgoTestCase } from './testcase-generators';
import { config } from '../config';

// In-memory lock to prevent concurrent generation for the same problem
const generationLocks = new Map<string, Promise<void>>();

interface StoredTestCase {
  input: string;
  expectedOutput: string;
  category: string;
  isHidden: boolean;
}

/**
 * Ensure a problem has been fully generated (content + test cases).
 * This is called lazily when a problem is first accessed.
 * Uses a lock to prevent concurrent generation for the same problem.
 */
export async function ensureProblemGenerated(problemId: string): Promise<void> {
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) throw new Error('Problem not found');

  // Already generated
  if (problem.generationStatus === 'completed') return;

  // Check for existing lock
  if (generationLocks.has(problemId)) {
    await generationLocks.get(problemId);
    return;
  }

  // Create new lock
  const lock = doGenerate(problemId);
  generationLocks.set(problemId, lock);

  try {
    await lock;
  } finally {
    generationLocks.delete(problemId);
  }
}

async function doGenerate(problemId: string): Promise<void> {
  // Mark as in progress
  await prisma.problem.update({
    where: { id: problemId },
    data: { generationStatus: 'in_progress' },
  });

  try {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('Problem not found');

    console.log(`[Generator] Starting generation for: ${problem.title} (${problem.difficulty})`);

    // Step 1: Generate problem content (description, examples, constraints, starter code)
    const needsContent =
      !problem.description ||
      problem.description.length < 50 ||
      problem.description.includes('imported from LeetCode');

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

    // Step 2: Generate test cases
    const hasTestCases = ((problem.visibleTestCases as unknown as StoredTestCase[]) || []).length > 0 &&
                         ((problem.hiddenTestCases as unknown as StoredTestCase[]) || []).length > 0;

    let visibleTestCases: StoredTestCase[] = [];
    let hiddenTestCases: StoredTestCase[] = [];

    if (!hasTestCases) {
      const generated = await generateAllTestCases(
        problem.title,
        problem.slug,
        problem.difficulty,
        problem.topics,
        content?.inputFormat || problem.inputFormat || '',
        content?.outputFormat || problem.outputFormat || '',
        content?.constraints || (problem.constraints as string[]) || []
      );
      visibleTestCases = generated.visible;
      hiddenTestCases = generated.hidden;
      console.log(`[Generator] Generated ${visibleTestCases.length} visible + ${hiddenTestCases.length} hidden test cases for: ${problem.title}`);
    } else {
      visibleTestCases = ((problem.visibleTestCases as unknown as StoredTestCase[]) || []);
      hiddenTestCases = ((problem.hiddenTestCases as unknown as StoredTestCase[]) || []);
    }

    // Step 3: Save everything
    const updateData: any = {
      generationStatus: 'completed',
      generatedAt: new Date(),
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

    if (visibleTestCases.length > 0) {
      updateData.visibleTestCases = visibleTestCases;
    }
    if (hiddenTestCases.length > 0) {
      updateData.hiddenTestCases = hiddenTestCases;
    }
    updateData.totalTestCases = visibleTestCases.length + hiddenTestCases.length;

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
  constraints: string[]
): Promise<{ visible: StoredTestCase[]; hidden: StoredTestCase[] }> {
  const tcConfig = config.testCasesPerDifficulty[difficulty as keyof typeof config.testCasesPerDifficulty]
    || config.testCasesPerDifficulty.medium;

  // Try algorithmic generators first
  const algoCases = getAlgorithmicTestCases(slug);

  let allCases: StoredTestCase[] = [];

  if (algoCases && algoCases.length > 0) {
    // Use algorithmic test cases as the base
    allCases = algoCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      category: tc.category,
      isHidden: false,
    }));
    console.log(`[Generator] Using ${allCases.length} algorithmic test cases for: ${slug}`);
  }

  // Generate additional test cases with AI if needed
  const remainingHidden = Math.max(0, tcConfig.hidden - allCases.length);
  const remainingVisible = Math.max(0, tcConfig.visible - allCases.filter(tc => !tc.isHidden).length);

  if (config.openaiApiKey && (remainingHidden > 0 || remainingVisible > 0)) {
    try {
      const aiCases = await generateTestCasesForProblem(
        title,
        difficulty,
        topics,
        inputFormat,
        outputFormat,
        constraints,
        remainingHidden + remainingVisible
      );

      // Split into visible and hidden
      let visibleCount = 0;
      let hiddenCount = 0;

      for (const tc of aiCases) {
        if (visibleCount < remainingVisible) {
          allCases.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            category: tc.category,
            isHidden: false,
          });
          visibleCount++;
        } else if (hiddenCount < remainingHidden) {
          allCases.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            category: tc.category,
            isHidden: true,
          });
          hiddenCount++;
        }
      }

      console.log(`[Generator] AI generated ${aiCases.length} additional test cases for: ${slug}`);
    } catch (err: any) {
      console.error(`[Generator] AI test case generation failed for ${slug}:`, err.message);
    }
  }

  // Ensure minimum counts by duplicating with variations if needed
  while (allCases.filter(tc => !tc.isHidden).length < tcConfig.visible) {
    const base = allCases[Math.floor(Math.random() * Math.max(1, allCases.length))];
    allCases.push({
      input: base?.input || '[]',
      expectedOutput: base?.expectedOutput || '[]',
      category: 'basic',
      isHidden: false,
    });
  }

  while (allCases.filter(tc => tc.isHidden).length < tcConfig.hidden) {
    const base = allCases[Math.floor(Math.random() * Math.max(1, allCases.length))];
    allCases.push({
      input: base?.input || '[]',
      expectedOutput: base?.expectedOutput || '[]',
      category: 'stress',
      isHidden: true,
    });
  }

  const visible = allCases.filter(tc => !tc.isHidden);
  const hidden = allCases.filter(tc => tc.isHidden);

  return { visible, hidden };
}

/**
 * Get visible test cases for a problem.
 */
export async function getVisibleTestCases(problemId: string): Promise<StoredTestCase[]> {
  await ensureProblemGenerated(problemId);
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  return ((problem?.visibleTestCases as unknown as StoredTestCase[]) || []);
}

/**
 * Get hidden test cases for a problem (used during submission).
 */
export async function getHiddenTestCases(problemId: string): Promise<StoredTestCase[]> {
  await ensureProblemGenerated(problemId);
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  return ((problem?.hiddenTestCases as unknown as StoredTestCase[]) || []);
}

/**
 * Get all test cases (visible + hidden) for a problem.
 */
export async function getAllTestCases(problemId: string): Promise<StoredTestCase[]> {
  await ensureProblemGenerated(problemId);
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  const visible = (problem?.visibleTestCases as unknown as StoredTestCase[]) || [];
  const hidden = (problem?.hiddenTestCases as unknown as StoredTestCase[]) || [];
  return [...visible, ...hidden];
}
