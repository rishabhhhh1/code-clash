import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// --- CSV Parser ---
interface CSVRow {
  [key: string]: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// --- Column auto-detection ---
function detectColumn(headers: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const found = headers.find(
      (h) => h.toLowerCase().replace(/[%\s]/g, '') === c.toLowerCase().replace(/[%\s]/g, '')
    );
    if (found) return found;
  }
  return null;
}

// --- Topic normalization ---
const TOPIC_MAP: Record<string, string> = {
  array: 'arrays',
  arrays: 'arrays',
  string: 'strings',
  strings: 'strings',
  hash: 'hash-table',
  'hash table': 'hash-table',
  'hash-table': 'hash-table',
  hashtable: 'hash-table',
  'two pointers': 'two-pointers',
  'two-pointers': 'two-pointers',
  twopointers: 'two-pointers',
  'binary search': 'binary-search',
  'binary-search': 'binary-search',
  'dynamic programming': 'dynamic-programming',
  'dynamic-programming': 'dynamic-programming',
  dp: 'dynamic-programming',
  'greedy algorithm': 'greedy',
  greedy: 'greedy',
  'backtracking': 'backtracking',
  'back tracking': 'backtracking',
  'stack': 'stack',
  'queue': 'queue',
  'linked list': 'linked-list',
  'linked-list': 'linkedlist',
  linkedlist: 'linked-list',
  'tree': 'tree',
  'binary tree': 'binary-tree',
  'binary-tree': 'binary-tree',
  'bst': 'binary-search-tree',
  'graph': 'graph',
  ' bfs ': 'bfs',
  bfs: 'bfs',
  dfs: 'dfs',
  'depth-first search': 'dfs',
  'depth first search': 'dfs',
  'breadth-first search': 'bfs',
  'breadth first search': 'bfs',
  'heap': 'heap',
  'priority queue': 'priority-queue',
  'priority-queue': 'priority-queue',
  'sort': 'sorting',
  'sorting': 'sorting',
  'merge sort': 'merge-sort',
  'quick sort': 'quick-sort',
  'matrix': 'matrix',
  'bit manipulation': 'bit-manipulation',
  'bit-manipulation': 'bit-manipulation',
  'bit': 'bit-manipulation',
  'math': 'math',
  'mathematics': 'math',
  'geometry': 'geometry',
  'design': 'design',
  'sliding window': 'sliding-window',
  'sliding-window': 'sliding-window',
  'two sum': 'two-sum',
  'prefix sum': 'prefix-sum',
  'prefix-sum': 'prefix-sum',
  'monotonic stack': 'monotonic-stack',
  'monotonic-stack': 'monotonic-stack',
  'monotonic queue': 'monotonic-queue',
  'monotonic-queue': 'monotonic-queue',
  'union find': 'union-find',
  'union-find': 'union-find',
  'trie': 'trie',
  'prefix tree': 'trie',
  'segment tree': 'segment-tree',
  'segment-tree': 'segment-tree',
  'binary indexed tree': 'fenwick-tree',
  'fenwick tree': 'fenwick-tree',
  'fenwick-tree': 'fenwick-tree',
  'line sweep': 'line-sweep',
  'line-sweep': 'line-sweep',
  'topological sort': 'topological-sort',
  'topological-sort': 'topological-sort',
  'shortest path': 'shortest-path',
  'shortest-path': 'shortest-path',
  'minimum spanning tree': 'minimum-spanning-tree',
  'minimum-spanning-tree': 'minimum-spanning-tree',
  'mst': 'minimum-spanning-tree',
  'recursion': 'recursion',
  'memoization': 'memoization',
  'game theory': 'game-theory',
  'game-theory': 'game-theory',
  'randomized': 'randomized',
  'random': 'randomized',
  'counting': 'counting',
  'enumeration': 'enumeration',
  'simulation': 'simulation',
  'interactive': 'interactive',
  'combinatorics': 'combinatorics',
  'probability': 'probability',
  'data stream': 'data-stream',
  'data-stream': 'data-stream',
  'rolling hash': 'rolling-hash',
  'rolling-hash': 'rolling-hash',
  'string matching': 'string-matching',
  'string-matching': 'string-matching',
  'bucket sort': 'bucket-sort',
  'bucket-sort': 'bucket-sort',
  'counting sort': 'counting-sort',
  'counting-sort': 'counting-sort',
  'radix sort': 'radix-sort',
  'radix-sort': 'radix-sort',
  'shell': 'shell',
  'database': 'database',
  'sql': 'database',
  'multithreading': 'concurrency',
  'concurrency': 'concurrency',
  'divide and conquer': 'divide-and-conquer',
  'divide-and-conquer': 'divide-and-conquer',
  'd&c': 'divide-and-conquer',
  'iterator': 'iterator',
  'generator': 'generator',
  'dequeue': 'deque',
  'deque': 'deque',
  ' doubly linked list ': 'doubly-linked-list',
  'doubly-linked-list': 'doubly-linked-list',
  'doubly linked list': 'doubly-linked-list',
  'reservoir sampling': 'reservoir-sampling',
  'reservoir-sampling': 'reservoir-sampling',
  'rejection sampling': 'rejection-sampling',
  'rejection-sampling': 'rejection-sampling',
  'suffix array': 'suffix-array',
  'suffix-array': 'suffix-array',
  'biconnected component': 'biconnected-component',
  'biconnected-component': 'biconnected-component',
  'eulerian circuit': 'eulerian-circuit',
  'eulerian-circuit': 'eulerian-circuit',
  'strongly connected': 'strongly-connected-components',
  'strongly-connected-components': 'strongly-connected-components',
  'hash function': 'hash-function',
  'hash-function': 'hash-function',
  'brainteaser': 'brainteaser',
  'braint easer': 'brainteaser',
  'memo': 'memoization',
  'memoize': 'memoization',
  'properties': 'properties',
  'number theory': 'number-theory',
  'pole': 'polar',
  'polar': 'polar',
  'game': 'game-theory',
  'minimax': 'minimax',
  'aho-corasick': 'string-matching',
  'suffix tree': 'suffix-tree',
  'heap (priority queue)': 'priority-queue',
};

function normalizeTopics(raw: string): string[] {
  if (!raw || raw.trim() === '') return [];
  const parts = raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  const normalized = new Set<string>();
  for (const part of parts) {
    const mapped = TOPIC_MAP[part];
    if (mapped) {
      normalized.add(mapped);
    } else {
      // try slugified version
      const slug = part.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (slug) normalized.add(slug);
    }
  }
  return Array.from(normalized).sort();
}

// --- Slug generation ---
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- Difficulty normalization ---
function normalizeDifficulty(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'easy' || lower === '1') return 'easy';
  if (lower === 'medium' || lower === 'm' || lower === '2') return 'medium';
  if (lower === 'hard' || lower === '3') return 'hard';
  return 'medium';
}

// --- Generate example test cases from CSV column ---
function parseExampleTestCases(raw: string): any[] {
  if (!raw || raw.trim() === '') return [];
  try {
    // The CSV column sometimes contains JSON arrays of objects
    const cleaned = raw.trim();
    if (cleaned.startsWith('[')) {
      return JSON.parse(cleaned);
    }
  } catch {
    // fall through
  }
  return [];
}

// --- Build description from available data ---
function buildDescription(row: CSVRow, difficulty: string): string {
  const title = row['Title'] || '';
  const link = row['Link'] || '';
  const acceptance = row['Acceptance Rate (%)'] || '';
  const topics = row['Topics'] || '';

  let desc = `# ${title}\n\n`;
  desc += `**Difficulty:** ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n\n`;
  if (acceptance) desc += `**Acceptance Rate:** ${acceptance}%\n\n`;
  if (topics) desc += `**Topics:** ${topics}\n\n`;
  if (link) desc += `[View on LeetCode](${link})\n\n`;
  desc += `_This problem was imported from LeetCode. See the link above for the full problem description._\n`;
  return desc;
}

// --- Main import ---
async function importProblems() {
  const csvPath = process.argv[2] || path.join(__dirname, '../../../data/problems.csv');
  console.log(`\n📂 Reading CSV from: ${csvPath}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCSV(csvPath);
  console.log(`📊 Found ${rows.length} rows in CSV\n`);

  // Detect columns
  const headers = Object.keys(rows[0] || {});
  console.log(`📋 Columns detected: ${headers.join(', ')}\n`);

  const colId = detectColumn(headers, ['ID', 'id', 'Id', 'Question_ID', 'question_id']);
  const colTitle = detectColumn(headers, ['Title', 'title', 'Name', 'name', 'Question', 'question']);
  const colDifficulty = detectColumn(headers, ['Difficulty', 'difficulty', 'Level', 'level']);
  const colLink = detectColumn(headers, ['Link', 'link', 'URL', 'url', 'Question_URL']);
  const colTopics = detectColumn(headers, ['Topics', 'topics', 'Tags', 'tags', 'Topic']);
  const colAcceptance = detectColumn(headers, ['Acceptance Rate (%)', 'Acceptance Rate', 'acceptance_rate', 'Acceptance', 'AcceptanceRate']);
  const colPremium = detectColumn(headers, ['Premium Only', 'Premium', 'premium_only', 'IsPremium', 'is_premium']);
  const colCategory = detectColumn(headers, ['Category', 'category', 'Type']);
  const colLikes = detectColumn(headers, ['Likes', 'likes']);
  const colDislikes = detectColumn(headers, ['Dislikes', 'dislikes']);
  const colExamples = detectColumn(headers, ['Example Test Cases', 'ExampleTestCases', 'examples']);
  const colSimilar = detectColumn(headers, ['Similar Questions', 'SimilarQuestions', 'similar']);

  console.log('🔍 Column mapping:');
  console.log(`   ID:           ${colId || '❌ not found'}`);
  console.log(`   Title:        ${colTitle || '❌ not found'}`);
  console.log(`   Difficulty:   ${colDifficulty || '❌ not found'}`);
  console.log(`   Link:         ${colLink || '❌ not found'}`);
  console.log(`   Topics:       ${colTopics || '❌ not found'}`);
  console.log(`   Acceptance:   ${colAcceptance || '❌ not found'}`);
  console.log(`   Premium:      ${colPremium || '❌ not found'}`);
  console.log(`   Category:     ${colCategory || '❌ not found'}`);
  console.log(`   Likes:        ${colLikes || '❌ not found'}`);
  console.log(`   Dislikes:     ${colDislikes || '❌ not found'}`);
  console.log(`   Examples:     ${colExamples || '❌ not found'}`);
  console.log(`   Similar:      ${colSimilar || '❌ not found'}`);
  console.log('');

  if (!colTitle) {
    console.error('❌ Title column is required but not found');
    process.exit(1);
  }

  // Stats
  let created = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  // Batch insert for performance
  const BATCH_SIZE = 100;
  const batches: any[] = [];

  for (const row of rows) {
    try {
      const leetcodeId = colId ? parseInt(row[colId], 10) : null;
      const title = row[colTitle]?.trim();
      if (!title) { skipped++; continue; }

      const slug = slugify(title);

      // Check for duplicates by slug or leetcodeId
      const existing = leetcodeId
        ? await prisma.problem.findFirst({ where: { OR: [{ slug }, { leetcodeId }] } })
        : await prisma.problem.findUnique({ where: { slug } });

      if (existing) { skipped++; continue; }

      const difficulty = normalizeDifficulty(row[colDifficulty || ''] || 'medium');
      const topics = normalizeTopics(row[colTopics || ''] || '');
      const acceptanceRate = colAcceptance ? parseFloat(row[colAcceptance] || '') : null;
      const isPremium = colPremium ? ((row[colPremium] || '').toLowerCase() === 'true' || row[colPremium] === '1') : false;
      const category = colCategory ? (row[colCategory || ''] || '').trim() || null : null;
      const likes = colLikes ? parseInt(row[colLikes || ''], 10) || null : null;
      const dislikes = colDislikes ? parseInt(row[colDislikes || ''], 10) || null : null;
      const link = colLink ? (row[colLink || ''] || '').trim() || null : null;
      const exampleCases = colExamples ? parseExampleTestCases(row[colExamples || '']) : [];

      // Build description
      const description = buildDescription(row, difficulty);

      // Build examples array for display
      const examples = exampleCases.length > 0 ? exampleCases : [];

      const problemData = {
        title,
        slug,
        leetcodeId: isNaN(leetcodeId as number) ? null : leetcodeId,
        difficulty,
        description,
        inputFormat: null,
        outputFormat: null,
        examples: examples as any,
        constraints: [] as any,
        hints: null,
        visibleTestCases: [] as any,
        hiddenTestCases: [] as any,
        totalTestCases: 0,
        topics,
        category,
        companies: [] as string[],
        problemLink: link,
        starterCodeCpp: null,
        starterCodeJava: null,
        starterCodePython: null,
        starterCodeJavaScript: null,
        timeLimit: 5000,
        memoryLimit: 256,
        acceptanceRate: isNaN(acceptanceRate as number) ? null : acceptanceRate,
        totalAccepted: null,
        totalSubmitted: null,
        likes: isNaN(likes as number) ? null : likes,
        dislikes: isNaN(dislikes as number) ? null : dislikes,
        isPremium,
        isActive: true,
        generationStatus: 'pending',
      };

      batches.push(problemData);
      created++;

      if (created % BATCH_SIZE === 0) {
        console.log(`  ⏳ Processing batch ${Math.ceil(created / BATCH_SIZE)}... (${created} created so far)`);
      }
    } catch (err: any) {
      errors++;
      errorMessages.push(`Row ${created + skipped + errors}: ${err.message}`);
    }
  }

  // Final batch insert
  console.log(`\n💾 Inserting ${batches.length} problems into database...`);

  for (let i = 0; i < batches.length; i += BATCH_SIZE) {
    const batch = batches.slice(i, i + BATCH_SIZE);
    try {
      await prisma.problem.createMany({ data: batch, skipDuplicates: true });
    } catch (err: any) {
      console.error(`  ⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${err.message}`);
      // Fall back to individual inserts for failed batch
      for (const item of batch) {
        try {
          await prisma.problem.create({ data: item });
        } catch (innerErr: any) {
          errors++;
          errorMessages.push(`Individual insert: ${innerErr.message}`);
        }
      }
    }
  }

  // Final stats
  const totalProblems = await prisma.problem.count();
  const byDifficulty = await prisma.problem.groupBy({ by: ['difficulty'], _count: true });
  const premiumCount = await prisma.problem.count({ where: { isPremium: true } });

  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`  ✅ Created:        ${created}`);
  console.log(`  ⏭️  Skipped:        ${skipped} (duplicates)`);
  console.log(`  ❌ Errors:         ${errors}`);
  console.log(`  📦 Total in DB:    ${totalProblems}`);
  console.log('');
  console.log('  By difficulty:');
  for (const d of byDifficulty) {
    console.log(`    ${d.difficulty}: ${d._count}`);
  }
  console.log(`  💎 Premium:        ${premiumCount}`);
  console.log(`  🆓 Free:           ${totalProblems - premiumCount}`);
  console.log('='.repeat(50));

  if (errorMessages.length > 0) {
    console.log('\n⚠️  Error details (first 10):');
    errorMessages.slice(0, 10).forEach((m) => console.log(`  ${m}`));
  }

  console.log('\n✅ Import complete!');
  await prisma.$disconnect();
}

importProblems().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
