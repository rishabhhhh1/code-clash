const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  const total = await prisma.problem.count();
  const withDesc = await prisma.problem.count({ where: { description: { not: '' } } });
  const withInputFormat = await prisma.problem.count({ where: { inputFormat: { not: null } } });
  const withStarterCpp = await prisma.problem.count({ where: { starterCodeCpp: { not: null } } });
  const byStatus = await prisma.problem.groupBy({ by: ['generationStatus'], _count: true });
  const allProblems = await prisma.problem.findMany({
    select: {
      id: true, slug: true, title: true, difficulty: true, description: true,
      examples: true, constraints: true, visibleTestCases: true,
      hiddenTestCases: true, generationStatus: true, starterCodeCpp: true,
      inputFormat: true, outputFormat: true
    }
  });

  let withExamples = 0, withConstraints = 0, withVisibleTC = 0, withHiddenTC = 0;
  for (const p of allProblems) {
    if (Array.isArray(p.examples) && p.examples.length > 0) withExamples++;
    if (Array.isArray(p.constraints) && p.constraints.length > 0) withConstraints++;
    if (Array.isArray(p.visibleTestCases) && p.visibleTestCases.length > 0) withVisibleTC++;
    if (Array.isArray(p.hiddenTestCases) && p.hiddenTestCases.length > 0) withHiddenTC++;
  }

  console.log('=== DATABASE AUDIT ===');
  console.log('Total problems:', total);
  console.log('With title:', total); // all have titles by NOT NULL constraint
  console.log('With description (non-empty):', withDesc);
  console.log('With inputFormat:', withInputFormat);
  console.log('With outputFormat:', (await prisma.problem.count({ where: { outputFormat: { not: null } } })));
  console.log('With starter code (C++):', withStarterCpp);
  console.log('With examples:', withExamples);
  console.log('With constraints:', withConstraints);
  console.log('With visible test cases:', withVisibleTC);
  console.log('With hidden test cases:', withHiddenTC);
  console.log('By generation status:', JSON.stringify(byStatus, null, 2));

  // Breakdown by difficulty for test cases
  const easy = allProblems.filter(p => p.difficulty === 'easy');
  const medium = allProblems.filter(p => p.difficulty === 'medium');
  const hard = allProblems.filter(p => p.difficulty === 'hard');
  console.log('\n=== BY DIFFICULTY ===');
  console.log('Easy:', easy.length, '| Medium:', medium.length, '| Hard:', hard.length);

  // Check a sample problem
  const ts = allProblems.find(p => p.title === 'Two Sum');
  if (ts) {
    console.log('\n=== SAMPLE: Two Sum ===');
    console.log('desc length:', ts.description ? ts.description.length : 0);
    console.log('desc preview:', ts.description ? ts.description.substring(0, 100) : 'EMPTY');
    console.log('inputFormat:', ts.inputFormat ? ts.inputFormat.substring(0, 80) : 'NULL');
    console.log('examples count:', Array.isArray(ts.examples) ? ts.examples.length : 'NOT ARRAY');
    console.log('constraints count:', Array.isArray(ts.constraints) ? ts.constraints.length : 'NOT ARRAY');
    console.log('visibleTC count:', Array.isArray(ts.visibleTestCases) ? ts.visibleTestCases.length : 'NOT ARRAY');
    console.log('hiddenTC count:', Array.isArray(ts.hiddenTestCases) ? ts.hiddenTestCases.length : 'NOT ARRAY');
    console.log('visibleTC[0]:', ts.visibleTestCases && ts.visibleTestCases[0] ? JSON.stringify(ts.visibleTestCases[0]) : 'NONE');
    console.log('starterCodeCpp:', ts.starterCodeCpp ? 'HAS CODE' : 'NULL');
    console.log('generationStatus:', ts.generationStatus);
  }

  // List problems WITHOUT visible test cases
  const noTC = allProblems.filter(p => !Array.isArray(p.visibleTestCases) || p.visibleTestCases.length === 0);
  console.log('\n=== PROBLEMS WITHOUT VISIBLE TEST CASES (' + noTC.length + ') ===');
  for (const p of noTC) {
    console.log(' -', p.slug, '(' + p.difficulty + ') status:', p.generationStatus);
  }

  await prisma.$disconnect();
}

audit().catch(e => {
  console.error('AUDIT ERROR:', e.message);
  process.exit(1);
});
