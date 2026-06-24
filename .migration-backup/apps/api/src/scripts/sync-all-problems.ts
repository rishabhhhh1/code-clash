import { prisma } from '../config/database';
import { syncProblemContent } from '../services/leetcode';

/**
 * Bulk sync all problems from LeetCode
 * This script fetches complete problem content (description, examples, constraints, starter code)
 * from LeetCode for all problems that were imported from CSV with missing content.
 */

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
  details: Array<{ id: string; title: string; status: string; error?: string }>;
}

async function syncAllProblems(options: {
  limit?: number;
  difficulty?: string;
  force?: boolean;
  batchSize?: number;
}): Promise<SyncResult> {
  const { limit = Infinity, difficulty, force = false, batchSize = 20 } = options;

  console.log('🚀 Starting bulk LeetCode sync...');
  console.log(`Options: limit=${limit === Infinity ? 'all' : limit}, difficulty=${difficulty || 'all'}, force=${force}, batchSize=${batchSize}`);

  // Find problems that need syncing
  const where: any = { isActive: true };
  
  if (difficulty) where.difficulty = difficulty;
  
  if (!force) {
    where.OR = [
      { description: '' },
      { description: { contains: 'imported from LeetCode' } },
      { description: { contains: 'Problem content not yet loaded' } },
      { description: { lt: '50' } },
    ];
  }

  const totalProblems = await prisma.problem.count({ where });
  console.log(`Found ${totalProblems} problems to sync`);

  if (totalProblems === 0) {
    console.log('✅ No problems need syncing');
    return { total: 0, synced: 0, failed: 0, skipped: 0, errors: [], details: [] };
  }

  const result: SyncResult = {
    total: totalProblems,
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  let offset = 0;
  let processed = 0;

  while (processed < totalProblems && processed < limit) {
    const currentBatchSize = Math.min(batchSize, totalProblems - processed, limit - processed);
    
    const problems = await prisma.problem.findMany({
      where,
      select: { id: true, title: true, slug: true, description: true },
      take: currentBatchSize,
      skip: offset,
      orderBy: { leetcodeId: 'asc' },
    });

    console.log(`\n📦 Processing batch ${Math.floor(processed / batchSize) + 1} (${processed + 1}-${Math.min(processed + currentBatchSize, totalProblems)}/${totalProblems})`);

    for (const problem of problems) {
      processed++;
      const progress = Math.round((processed / Math.min(totalProblems, limit)) * 100);
      
      try {
        console.log(`[${progress}%] Syncing: ${problem.title} (${problem.slug})`);
        
        const syncResult = await syncProblemContent(problem.id);
        
        if (syncResult.success) {
          result.synced++;
          result.details.push({ id: problem.id, title: problem.title, status: 'synced' });
          console.log(`  ✅ Synced successfully`);
        } else {
          result.failed++;
          const error = syncResult.error || 'Unknown error';
          result.errors.push(`${problem.title}: ${error}`);
          result.details.push({ id: problem.id, title: problem.title, status: 'failed', error });
          console.log(`  ❌ Failed: ${error}`);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        result.failed++;
        const error = err.message || 'Unknown error';
        result.errors.push(`${problem.title}: ${error}`);
        result.details.push({ id: problem.id, title: problem.title, status: 'failed', error });
        console.log(`  ❌ Error: ${error}`);
      }
    }

    offset += currentBatchSize;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Sync Summary:');
  console.log(`  Total problems: ${result.total}`);
  console.log(`  Synced: ${result.synced}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`  Success rate: ${result.total > 0 ? Math.round((result.synced / result.total) * 100) : 0}%`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }
  }

  console.log('='.repeat(60));

  return result;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--limit') options.limit = parseInt(args[++i]);
    if (arg === '--difficulty') options.difficulty = args[++i];
    if (arg === '--force') options.force = true;
    if (arg === '--batch-size') options.batchSize = parseInt(args[++i]);
    if (arg === '--help') {
      console.log(`
Usage: npm run sync:all [options]

Options:
  --limit <number>        Maximum number of problems to sync (default: all)
  --difficulty <string>   Filter by difficulty (easy, medium, hard)
  --force                 Sync all problems, even those with content
  --batch-size <number>   Number of problems per batch (default: 20)
  --help                  Show this help message

Examples:
  npm run sync:all                    # Sync all problems with missing content
  npm run sync:all --limit 100       # Sync first 100 problems
  npm run sync:all --difficulty easy  # Sync only easy problems
  npm run sync:all --force           # Force sync all problems
      `);
      process.exit(0);
    }
  }

  try {
    await syncAllProblems(options);
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { syncAllProblems };
