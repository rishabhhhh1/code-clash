/**
 * Populate incomplete Problem records in PostgreSQL.
 *
 * - Syncs metadata from LeetCode when possible
 * - Generates missing content via AI when needed
 * - Builds test case inputs (algorithmic + AI + examples)
 * - Computes expected outputs by running reference solutions (never guesses)
 * - Validates before marking generationStatus='completed'
 *
 * Usage:
 *   npx tsx src/scripts/populate-incomplete-problems.ts
 *   npx tsx src/scripts/populate-incomplete-problems.ts --limit 10
 */

import { prisma } from '../config/database';
import { config } from '../config';
import { syncProblemContent } from '../services/leetcode';
import { generateProblemContent, generateTestCasesForProblem } from '../services/ai-problem-generator';
import { getAlgorithmicTestCases } from '../services/testcase-generators';
import {
  assignHiddenFlags,
  getMinTestCaseCount,
  isProblemContentComplete,
  validateProblemTestCases,
  StoredTestCase,
} from '../services/problem-completion';
import {
  pickReferenceSolution,
  resolveExpectedOutputs,
  verifyReferenceOnExamples,
  InputOnlyTestCase,
} from '../services/reference-output';
import { deduplicateTestCases } from '../services/testcase-validator';
import {
  KNOWN_PROBLEMS,
  generateGenericContent,
  getKnownTestCases,
} from './batch-generate-all';

const BATCH_SIZE = 10;
const LEETCODE_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
    }
  }
  return { limit };
}

function examplesToInputs(examples: any[]): InputOnlyTestCase[] {
  return examples
    .filter((ex) => ex?.input)
    .map((ex) => ({
      input: String(ex.input),
      expectedOutput: ex.output ? String(ex.output) : undefined,
      category: 'basic' as const,
      isHidden: false,
    }));
}

function collectInputCases(
  slug: string,
  difficulty: string,
  examples: any[],
  inputFormat: string,
  outputFormat: string,
  constraints: string[],
  title: string,
  topics: string[],
  minCount: number
): Promise<InputOnlyTestCase[]> {
  const cases: InputOnlyTestCase[] = [];

  const algo = getAlgorithmicTestCases(slug);
  if (algo?.length) {
    for (const tc of algo) {
      cases.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        category: tc.category,
      });
    }
  }

  cases.push(...examplesToInputs(examples));

  const unique = new Map<string, InputOnlyTestCase>();
  for (const tc of cases) {
    if (!unique.has(tc.input.trim())) unique.set(tc.input.trim(), tc);
  }

  const remaining = minCount - unique.size;
  if (remaining > 0 && config.openaiApiKey) {
    return generateTestCasesForProblem(
      title,
      difficulty,
      topics,
      inputFormat,
      outputFormat,
      constraints,
      remaining
    ).then((aiCases) => {
      for (const tc of aiCases) {
        const key = tc.input.trim();
        if (!unique.has(key)) {
          unique.set(key, {
            input: tc.input,
            category: tc.category,
          });
        }
      }
      return Array.from(unique.values());
    });
  }

  return Promise.resolve(Array.from(unique.values()));
}

async function ensureContent(problemId: string) {
  let problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) throw new Error('Problem not found');

  const needsSync =
    !problem.inputFormat ||
    !problem.outputFormat ||
    !Array.isArray(problem.examples) ||
    problem.examples.length === 0 ||
    !Array.isArray(problem.constraints) ||
    problem.constraints.length === 0 ||
    !problem.hints ||
    (Array.isArray(problem.hints) && problem.hints.length === 0);

  if (needsSync) {
    await sleep(LEETCODE_DELAY_MS);
    await syncProblemContent(problemId, true);
    problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('Problem not found after sync');
  }

  const stillNeedsContent =
    !problem.inputFormat ||
    !problem.outputFormat ||
    !Array.isArray(problem.examples) ||
    problem.examples.length === 0 ||
    !Array.isArray(problem.constraints) ||
    problem.constraints.length === 0 ||
    !problem.hints ||
    (Array.isArray(problem.hints) && problem.hints.length === 0);

  if (stillNeedsContent) {
    const known = KNOWN_PROBLEMS[problem.slug];
    if (known) {
      await prisma.problem.update({
        where: { id: problemId },
        data: {
          description: known.description,
          inputFormat: known.inputFormat,
          outputFormat: known.outputFormat,
          examples: known.examples as any,
          constraints: known.constraints as any,
          hints: known.hints as any,
          starterCodeCpp: known.starterCodeCpp,
          starterCodeJava: known.starterCodeJava,
          starterCodePython: known.starterCodePython,
          starterCodeJavaScript: known.starterCodeJavaScript,
          referenceSolutions: known.referenceSolutions as any,
        },
      });
      problem = await prisma.problem.findUnique({ where: { id: problemId } });
      if (!problem) throw new Error('Problem not found after known content');
    }
  }

  const stillNeedsAfterKnown =
    !problem.inputFormat ||
    !problem.outputFormat ||
    !Array.isArray(problem.examples) ||
    problem.examples.length === 0 ||
    !Array.isArray(problem.constraints) ||
    problem.constraints.length === 0 ||
    !problem.hints ||
    (Array.isArray(problem.hints) && problem.hints.length === 0);

  if (stillNeedsAfterKnown) {
    const generic = generateGenericContent(
      problem.title,
      problem.slug,
      problem.difficulty,
      problem.topics
    );
    await prisma.problem.update({
      where: { id: problemId },
      data: {
        description: problem.description || generic.description,
        inputFormat: generic.inputFormat,
        outputFormat: generic.outputFormat,
        examples: generic.examples as any,
        constraints: generic.constraints as any,
        hints: generic.hints as any,
        starterCodeCpp: generic.starterCodeCpp,
        starterCodeJava: generic.starterCodeJava,
        starterCodePython: generic.starterCodePython,
        starterCodeJavaScript: generic.starterCodeJavaScript,
        referenceSolutions: generic.referenceSolutions as any,
      },
    });
    problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('Problem not found after generic content');
  }

  if (stillNeedsAfterKnown && config.openaiApiKey) {
    const content = await generateProblemContent(
      problem.title,
      problem.difficulty,
      problem.topics,
      problem.description || undefined
    );

    await prisma.problem.update({
      where: { id: problemId },
      data: {
        description: content.description || problem.description,
        inputFormat: content.inputFormat,
        outputFormat: content.outputFormat,
        examples: content.examples as any,
        constraints: content.constraints as any,
        hints: content.hints as any,
        starterCodeCpp: content.starterCode.cpp,
        starterCodeJava: content.starterCode.java,
        starterCodePython: content.starterCode.python,
        starterCodeJavaScript: content.starterCode.javascript,
        referenceSolutions: content.referenceSolutions as any,
      },
    });

    problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new Error('Problem not found after AI content');
  }

  if (
    !problem.inputFormat ||
    !problem.outputFormat ||
    !Array.isArray(problem.examples) ||
    problem.examples.length === 0
  ) {
    throw new Error('Could not populate required content fields');
  }

  return problem!;
}

async function populateProblem(problemId: string): Promise<void> {
  await prisma.problem.update({
    where: { id: problemId },
    data: { generationStatus: 'in_progress', generationError: null },
  });

  const problem = await ensureContent(problemId);
  const minCount = getMinTestCaseCount(problem.difficulty);
  const constraints = (Array.isArray(problem.constraints) ? problem.constraints : []) as string[];
  const examples = (Array.isArray(problem.examples) ? problem.examples : []) as any[];

  // Known problems ship algorithmically verified test cases with reference solutions
  if (KNOWN_PROBLEMS[problem.slug]) {
    const knownCases = getKnownTestCases(problem.slug, minCount, problem.difficulty);
    const flagged = assignHiddenFlags(
      knownCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        category: tc.category,
        isHidden: tc.isHidden,
      })),
      problem.difficulty
    );

    const validation = validateProblemTestCases(flagged, constraints, problem.difficulty);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    await prisma.problem.update({
      where: { id: problemId },
      data: {
        testCases: flagged as any,
        totalTestCases: flagged.length,
        generationStatus: 'completed',
        generatedAt: new Date(),
        generationError: null,
      },
    });
    return;
  }

  let referenceSolutions = problem.referenceSolutions as Record<string, string> | null;
  let ref = pickReferenceSolution(referenceSolutions);

  if (!ref && config.openaiApiKey) {
    const content = await generateProblemContent(
      problem.title,
      problem.difficulty,
      problem.topics,
      problem.description || undefined
    );
    referenceSolutions = content.referenceSolutions;
    ref = pickReferenceSolution(referenceSolutions);

    await prisma.problem.update({
      where: { id: problemId },
      data: { referenceSolutions: referenceSolutions as any },
    });
  }

  if (!ref) {
    throw new Error('No usable reference solution available');
  }

  if (examples.length > 0) {
    await verifyReferenceOnExamples(
      ref.code,
      ref.language,
      examples.map((ex) => ({ input: String(ex.input), output: String(ex.output) }))
    );
  }

  let inputCases = await collectInputCases(
    problem.slug,
    problem.difficulty,
    examples,
    problem.inputFormat || '',
    problem.outputFormat || '',
    constraints,
    problem.title,
    problem.topics,
    minCount
  );

  if (inputCases.length < minCount) {
    throw new Error(`Only ${inputCases.length} test inputs collected, need ${minCount}`);
  }

  inputCases = inputCases.slice(0, minCount);

  const resolved = await resolveExpectedOutputs(
    ref.code,
    ref.language,
    inputCases,
    problem.timeLimit,
    problem.memoryLimit
  );

  const deduped = deduplicateTestCases(resolved) as StoredTestCase[];
  const flagged = assignHiddenFlags(deduped, problem.difficulty);

  const validation = validateProblemTestCases(flagged, constraints, problem.difficulty);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  await prisma.problem.update({
    where: { id: problemId },
    data: {
      testCases: flagged as any,
      totalTestCases: flagged.length,
      generationStatus: 'completed',
      generatedAt: new Date(),
      generationError: null,
    },
  });
}

async function main() {
  const { limit } = parseArgs();

  console.log('='.repeat(60));
  console.log('POPULATE INCOMPLETE PROBLEMS');
  console.log('='.repeat(60));

  const allProblems = await prisma.problem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      inputFormat: true,
      outputFormat: true,
      examples: true,
      constraints: true,
      hints: true,
      testCases: true,
      generationStatus: true,
    },
    orderBy: { leetcodeId: 'asc' },
  });

  const incomplete = allProblems.filter(
    (p) => !isProblemContentComplete(p, p.difficulty)
  );

  const toProcess = incomplete.slice(0, limit);

  console.log(`Total problems:     ${allProblems.length}`);
  console.log(`Incomplete:         ${incomplete.length}`);
  console.log(`To process:         ${toProcess.length}`);
  console.log(`Batch size:         ${BATCH_SIZE}`);
  console.log();

  if (toProcess.length === 0) {
    console.log('All problems are fully completed. Nothing to do.');
    return;
  }

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toProcess.length / BATCH_SIZE)}`);

    for (const problem of batch) {
      try {
        console.log(`  Processing: ${problem.title} (${problem.slug})`);
        await populateProblem(problem.id);
        generated++;
      } catch (err: any) {
        failed++;
        console.error(`  FAILED ${problem.slug}: ${err.message}`);

        try {
          await prisma.problem.update({
            where: { id: problem.id },
            data: {
              generationStatus: 'failed',
              generationError: err.message?.slice(0, 500) || 'Unknown error',
            },
          });
        } catch {}
      }

      process.stdout.write(
        `\rGenerated ${generated}/${toProcess.length} | Failed ${failed}`
      );
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log(`Generated ${generated}/${toProcess.length}`);
  console.log(`Failed ${failed}`);
  console.log('='.repeat(60));
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
