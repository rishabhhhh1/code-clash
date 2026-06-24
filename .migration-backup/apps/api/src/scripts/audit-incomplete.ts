import { prisma } from '../config/database';
import {
  getMinTestCaseCount,
  isProblemContentComplete,
  parseStoredTestCases,
} from '../services/problem-completion';

async function main() {
  const total = await prisma.problem.count();
  const problems = await prisma.problem.findMany({
    select: {
      slug: true,
      difficulty: true,
      inputFormat: true,
      outputFormat: true,
      examples: true,
      constraints: true,
      hints: true,
      testCases: true,
      generationStatus: true,
      totalTestCases: true,
    },
  });

  let incomplete = 0;
  let completed = 0;
  let failed = 0;

  for (const p of problems) {
    if (p.generationStatus === 'failed') failed++;
    if (isProblemContentComplete(p, p.difficulty)) completed++;
    else incomplete++;
  }

  const twoSum = problems.find((p) => p.slug === 'two-sum');
  const twoSumCases = twoSum ? parseStoredTestCases(twoSum.testCases) : [];

  console.log('Total problems:', total);
  console.log('Completed:', completed);
  console.log('Incomplete:', incomplete);
  console.log('Failed status:', failed);
  console.log('\nTwo Sum:');
  console.log('  generationStatus:', twoSum?.generationStatus);
  console.log('  inputFormat:', twoSum?.inputFormat ? 'yes' : 'no');
  console.log('  examples:', Array.isArray(twoSum?.examples) ? twoSum!.examples.length : 0);
  console.log('  testCases:', twoSumCases.length);
  console.log('  min required:', getMinTestCaseCount(twoSum?.difficulty || 'easy'));
  if (twoSumCases[0]) console.log('  sample TC:', JSON.stringify(twoSumCases[0]));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
