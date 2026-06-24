import { prisma } from './config/database';
import { syncProblemContent } from './services/leetcode';

const BATCH_SIZE = 5;
const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function batchSyncAll() {
  console.log('=== Batch Problem Sync ===');

  const total = await prisma.problem.count({
    where: {
      OR: [
        { description: null },
        { description: '' },
        { description: { contains: 'imported from LeetCode' } },
      ],
    },
  });

  console.log(`Problems needing sync: ${total}`);

  if (total === 0) {
    console.log('All problems already synced!');
    return;
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  const problems = await prisma.problem.findMany({
    where: {
      OR: [
        { description: null },
        { description: '' },
        { description: { contains: 'imported from LeetCode' } },
      ],
    },
    select: { id: true, slug: true, leetcodeId: true },
    orderBy: { leetcodeId: 'asc' },
  });

  for (let i = 0; i < problems.length; i += BATCH_SIZE) {
    const batch = problems.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(problems.length / BATCH_SIZE);

    console.log(`\nBatch ${batchNum}/${totalBatches} — problems ${i + 1}-${Math.min(i + BATCH_SIZE, problems.length)} of ${problems.length}`);

    for (const p of batch) {
      try {
        const result = await syncProblemContent(p.id);
        if (result.success) {
          synced++;
          console.log(`  ✓ [${p.leetcodeId}] ${p.slug}`);
        } else {
          failed++;
          const err = result.error || 'Unknown error';
          errors.push(`${p.slug}: ${err}`);
          console.log(`  ✗ [${p.leetcodeId}] ${p.slug} — ${err}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`${p.slug}: ${err.message}`);
        console.log(`  ✗ [${p.leetcodeId}] ${p.slug} — ${err.message}`);
      }
    }

    if (i + BATCH_SIZE < problems.length) {
      console.log(`  Waiting ${DELAY_MS}ms before next batch...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Sync Complete ===');
  console.log(`Synced: ${synced}`);
  console.log(`Failed: ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
}

batchSyncAll()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
