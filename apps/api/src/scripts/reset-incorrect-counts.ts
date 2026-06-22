import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetIncorrectTestCounts() {
  console.log('Resetting problems with incorrect test case counts...\n');

  const expected = {
    easy: { visible: 10, hidden: 100 },
    medium: { visible: 20, hidden: 300 },
    hard: { visible: 30, hidden: 1000 },
  };

  let resetCount = 0;

  for (const [difficulty, config] of Object.entries(expected)) {
    const problems = await prisma.problem.findMany({
      where: { difficulty },
      select: { id: true, slug: true, visibleTestCases: true, hiddenTestCases: true },
    });

    for (const p of problems) {
      const vis = Array.isArray(p.visibleTestCases) ? p.visibleTestCases.length : 0;
      const hid = Array.isArray(p.hiddenTestCases) ? p.hiddenTestCases.length : 0;

      if (vis !== config.visible || hid !== config.hidden) {
        await prisma.problem.update({
          where: { id: p.id },
          data: { generationStatus: 'pending' },
        });
        resetCount++;
      }
    }

    console.log(`${difficulty}: checked ${problems.length} problems`);
  }

  console.log(`\nReset ${resetCount} problems to 'pending' status`);

  const pending = await prisma.problem.count({ where: { generationStatus: 'pending' } });
  console.log(`Total pending: ${pending}`);

  await prisma.$disconnect();
}

resetIncorrectTestCounts().catch(console.error);
