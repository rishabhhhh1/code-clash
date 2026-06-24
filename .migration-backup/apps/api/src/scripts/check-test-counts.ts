import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTestCounts() {
  const difficulties = ['easy', 'medium', 'hard'];
  const expected = {
    easy: { visible: 10, hidden: 100 },
    medium: { visible: 20, hidden: 300 },
    hard: { visible: 30, hidden: 1000 },
  };

  for (const diff of difficulties) {
    const problems = await prisma.problem.findMany({
      where: { difficulty: diff },
      select: { visibleTestCases: true, hiddenTestCases: true, slug: true },
      take: 5,
    });

    console.log(`\n=== ${diff.toUpperCase()} (expected: ${expected[diff as keyof typeof expected].visible} visible, ${expected[diff as keyof typeof expected].hidden} hidden) ===`);
    
    for (const p of problems) {
      const vis = Array.isArray(p.visibleTestCases) ? p.visibleTestCases.length : 0;
      const hid = Array.isArray(p.hiddenTestCases) ? p.hiddenTestCases.length : 0;
      console.log(`  ${p.slug}: visible=${vis}, hidden=${hid}`);
    }
  }

  await prisma.$disconnect();
}

checkTestCounts().catch(console.error);
