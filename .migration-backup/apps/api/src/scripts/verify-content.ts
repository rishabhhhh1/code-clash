import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('=== DATABASE VERIFICATION ===\n');

  // Test Two Sum
  const twoSum = await prisma.problem.findUnique({
    where: { slug: 'two-sum' },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      inputFormat: true,
      outputFormat: true,
      examples: true,
      constraints: true,
      hints: true,
      visibleTestCases: true,
      hiddenTestCases: true,
      starterCodeCpp: true,
      starterCodeJava: true,
      starterCodePython: true,
      starterCodeJavaScript: true,
      referenceSolutions: true,
      generationStatus: true,
      totalTestCases: true,
    },
  });

  if (twoSum) {
    console.log('TWO SUM PROBLEM:');
    console.log('  Title:', twoSum.title);
    console.log('  Slug:', twoSum.slug);
    console.log('  Description length:', twoSum.description?.length || 0);
    console.log('  Input format:', twoSum.inputFormat ? 'YES' : 'NO');
    console.log('  Output format:', twoSum.outputFormat ? 'YES' : 'NO');
    console.log('  Examples count:', Array.isArray(twoSum.examples) ? twoSum.examples.length : 0);
    console.log('  Constraints count:', Array.isArray(twoSum.constraints) ? twoSum.constraints.length : 0);
    console.log('  Hints count:', Array.isArray(twoSum.hints) ? twoSum.hints.length : 0);
    console.log('  Visible TC count:', Array.isArray(twoSum.visibleTestCases) ? twoSum.visibleTestCases.length : 0);
    console.log('  Hidden TC count:', Array.isArray(twoSum.hiddenTestCases) ? twoSum.hiddenTestCases.length : 0);
    console.log('  Total TC:', twoSum.totalTestCases);
    console.log('  C++ starter:', twoSum.starterCodeCpp ? 'YES' : 'NO');
    console.log('  Java starter:', twoSum.starterCodeJava ? 'YES' : 'NO');
    console.log('  Python starter:', twoSum.starterCodePython ? 'YES' : 'NO');
    console.log('  JavaScript starter:', twoSum.starterCodeJavaScript ? 'YES' : 'NO');
    console.log('  Reference solutions:', twoSum.referenceSolutions ? 'YES' : 'NO');
    console.log('  Generation status:', twoSum.generationStatus);
  }

  // Test a few more problems
  console.log('\n\nSAMPLE PROBLEMS:');
  const samples = await prisma.problem.findMany({
    where: { slug: { in: ['valid-parentheses', 'climbing-stairs', 'reverse-integer', 'palindrome-number'] } },
    select: { slug: true, title: true, generationStatus: true, totalTestCases: true, visibleTestCases: true, hiddenTestCases: true },
  });

  for (const s of samples) {
    const visibleTC = Array.isArray(s.visibleTestCases) ? s.visibleTestCases.length : 0;
    const hiddenTC = Array.isArray(s.hiddenTestCases) ? s.hiddenTestCases.length : 0;
    console.log(`  ${s.title}: status=${s.generationStatus}, visible=${visibleTC}, hidden=${hiddenTC}, total=${s.totalTestCases}`);
  }

  // Summary stats
  console.log('\n\nSUMMARY STATS:');
  const total = await prisma.problem.count();
  const completed = await prisma.problem.count({ where: { generationStatus: 'completed' } });
  const withDesc = await prisma.problem.count({ where: { description: { not: '' } } });
  const withVisibleTC = await prisma.problem.findMany({ select: { visibleTestCases: true } });
  const withHiddenTC = await prisma.problem.findMany({ select: { hiddenTestCases: true } });
  const visibleTCCount = withVisibleTC.filter(p => Array.isArray(p.visibleTestCases) && p.visibleTestCases.length > 0).length;
  const hiddenTCCount = withHiddenTC.filter(p => Array.isArray(p.hiddenTestCases) && p.hiddenTestCases.length > 0).length;

  console.log(`  Total problems: ${total}`);
  console.log(`  Generation completed: ${completed}`);
  console.log(`  With description: ${withDesc}`);
  console.log(`  With visible test cases: ${visibleTCCount}`);
  console.log(`  With hidden test cases: ${hiddenTCCount}`);

  await prisma.$disconnect();
}

test().catch((err) => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
