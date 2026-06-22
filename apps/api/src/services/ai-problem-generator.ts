import OpenAI from 'openai';
import { config } from '../config';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!config.openaiApiKey) return null;
  if (!openai) {
    openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl || undefined,
    });
  }
  return openai;
}

export interface GeneratedProblemContent {
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  hints: string[];
  starterCode: {
    cpp: string;
    java: string;
    python: string;
    javascript: string;
  };
  referenceSolutions: {
    cpp: string;
    java: string;
    python: string;
    javascript: string;
  };
}

export interface GeneratedTestCase {
  input: string;
  expectedOutput: string;
  category: 'basic' | 'edge' | 'boundary' | 'max_constraint' | 'adversarial' | 'stress' | 'worst_case';
}

const DIFFICULTY_CONSTRAINTS: Record<string, { maxN: string; timeComplexity: string; desc: string }> = {
  easy: {
    maxN: '10^4',
    timeComplexity: 'O(n^2) generally passes',
    desc: 'Problems solvable with simple iteration, hash maps, or basic data structures. O(n^2) solutions usually pass.',
  },
  medium: {
    maxN: '10^5',
    timeComplexity: 'O(n log n) required',
    desc: 'Problems requiring sorting, binary search, sliding window, or basic dynamic programming. O(n^2) often fails.',
  },
  hard: {
    maxN: '10^5 to 10^6',
    timeComplexity: 'O(n) or O(n log n) required',
    desc: 'Problems requiring advanced algorithms, complex DP, graph algorithms, or sophisticated data structures. O(n^2) always fails.',
  },
};

export async function generateProblemContent(
  title: string,
  difficulty: string,
  topics: string[],
  existingDescription?: string
): Promise<GeneratedProblemContent> {
  const client = getOpenAIClient();
  if (!client) throw new Error('OpenAI API key not configured');
  const diffInfo = DIFFICULTY_CONSTRAINTS[difficulty] || DIFFICULTY_CONSTRAINTS.medium;

  const systemPrompt = `You are an expert competitive programming problem writer. Generate complete, professional-quality problem content similar to LeetCode or Codeforces.

Rules:
1. Write a clear, detailed problem statement
2. Provide realistic constraints that match the difficulty
3. Generate 3-5 examples with detailed explanations
4. Provide 3 progressive hints
5. Write correct starter code for C++, Java, Python, JavaScript
6. Write optimal reference solutions for all 4 languages
7. Constraints must enforce the expected time complexity:
   - Easy: n up to ${DIFFICULTY_CONSTRAINTS.easy.maxN}, O(n^2) ok
   - Medium: n up to ${DIFFICULTY_CONSTRAINTS.medium.maxN}, O(n log n) needed
   - Hard: n up to ${DIFFICULTY_CONSTRAINTS.hard.maxN}, O(n) or O(n log n) required

Return ONLY valid JSON matching this schema:
{
  "description": "markdown problem description",
  "inputFormat": "input format description",
  "outputFormat": "output format description",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["constraint1", "constraint2", ...],
  "hints": ["hint1", "hint2", "hint3"],
  "starterCode": {
    "cpp": "class Solution { ... };",
    "java": "class Solution { ... }",
    "python": "class Solution:\n    def ...",
    "javascript": "var ... = function(...) { ... }"
  },
  "referenceSolutions": {
    "cpp": "full optimal C++ solution",
    "java": "full optimal Java solution",
    "python": "full optimal Python solution",
    "javascript": "full optimal JavaScript solution"
  }
}`;

  const userPrompt = `Generate complete problem content for:

Title: "${title}"
Difficulty: ${difficulty} (${diffInfo.desc})
Topics: ${topics.join(', ')}
Expected complexity: ${diffInfo.timeComplexity}

${existingDescription ? `Existing (incomplete) description:\n${existingDescription}\n\nImprove and expand this into a full professional problem statement.` : 'Create the problem statement from scratch based on the title and topics.'}

IMPORTANT:
- The description should be 200-500 words
- Examples must cover normal cases and at least one edge case
- Constraints must be realistic and match the difficulty
- Starter code should have the correct function signature with comments
- Reference solutions must be optimal and pass all test cases
- For this difficulty level, constraints should be: n up to ${diffInfo.maxN}`;

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No content returned from AI');

  const parsed = JSON.parse(content) as GeneratedProblemContent;

  // Validate required fields
  if (!parsed.description || !parsed.inputFormat || !parsed.outputFormat) {
    throw new Error('AI response missing required fields (description, inputFormat, outputFormat)');
  }
  if (!parsed.examples || parsed.examples.length < 2) {
    throw new Error('AI response must include at least 2 examples');
  }
  if (!parsed.constraints || parsed.constraints.length < 2) {
    throw new Error('AI response must include at least 2 constraints');
  }

  return parsed;
}

export async function generateTestCasesForProblem(
  title: string,
  difficulty: string,
  topics: string[],
  inputFormat: string,
  outputFormat: string,
  constraints: string[],
  count: number,
  category?: string
): Promise<GeneratedTestCase[]> {
  const client = getOpenAIClient();
  if (!client) throw new Error('OpenAI API key not configured');
  const batchSize = 50;
  const allTestCases: GeneratedTestCase[] = [];
  const remaining = count;

  const categories: GeneratedTestCase['category'][] = category
    ? [category as GeneratedTestCase['category']]
    : ['basic', 'edge', 'boundary', 'max_constraint', 'adversarial', 'stress', 'worst_case'];

  // Distribute test cases across categories
  const distribution = distributeTestCases(count, categories, difficulty);

  for (const [cat, catCount] of Object.entries(distribution)) {
    if (catCount === 0) continue;

    // Generate in batches
    for (let i = 0; i < catCount; i += batchSize) {
      const batch = Math.min(batchSize, catCount - i);
      const testCases = await generateTestCasesBatch(
        title,
        difficulty,
        inputFormat,
        outputFormat,
        constraints,
        batch,
        cat as GeneratedTestCase['category'],
        i === 0
      );
      allTestCases.push(...testCases);
    }
  }

  return allTestCases;
}

async function generateTestCasesBatch(
  title: string,
  difficulty: string,
  inputFormat: string,
  outputFormat: string,
  constraints: string[],
  count: number,
  category: GeneratedTestCase['category'],
  isFirstBatch: boolean
): Promise<GeneratedTestCase[]> {
  const systemPrompt = `You are an expert competitive programming test case generator. Generate precise, deterministic test cases.

Rules:
1. Each test case has input and expectedOutput matching the format
2. Test cases must be correct and deterministic
3. Include the category tag for each test case
4. No duplicate test cases
5. Output ONLY valid JSON array

Return format: [{"input": "...", "expectedOutput": "...", "category": "${category}"}]`;

  const categoryDesc: Record<string, string> = {
    basic: 'Normal, typical cases that test core functionality',
    edge: 'Edge cases: empty inputs, single elements, minimal values',
    boundary: 'Boundary cases: values at constraint limits',
    max_constraint: 'Maximum constraint cases: largest possible inputs',
    adversarial: 'Adversarial cases: designed to break naive solutions',
    stress: 'Large random inputs for performance testing',
    worst_case: 'Worst-case inputs that maximize time complexity for naive solutions',
  };

  const userPrompt = `Generate ${count} test cases for:

Problem: "${title}"
Input format: ${inputFormat}
Output format: ${outputFormat}
Constraints: ${constraints.join('; ')}
Category: ${category} - ${categoryDesc[category]}
Difficulty: ${difficulty}

${category === 'adversarial' || category === 'worst_case' ? `
IMPORTANT for this category:
- These test cases MUST cause TLE for naive O(n^2) solutions when O(n log n) is expected
- Use patterns like: already sorted/reverse sorted arrays for sorting problems, worst-case tree structures, dense graphs
- Maximum allowed input sizes for the difficulty
` : ''}
${category === 'max_constraint' ? `
Generate test cases at or near the constraint maximums:
- Easy: n ≈ 10^4
- Medium: n ≈ 10^5
- Hard: n ≈ 10^5 to 10^6
` : ''}

Generate EXACTLY ${count} test cases. No duplicates.`;

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No content returned from AI for test cases');

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON returned from AI for test cases');
  }

  // Handle both array and { testCases: [...] } formats
  const testCases = Array.isArray(parsed) ? parsed : (parsed.testCases || parsed.cases || []);

  return testCases.map((tc: any) => ({
    input: String(tc.input || ''),
    expectedOutput: String(tc.expectedOutput || tc.output || ''),
    category,
  }));
}

function distributeTestCases(
  total: number,
  categories: GeneratedTestCase['category'][],
  difficulty: string
): Record<string, number> {
  const dist: Record<string, number> = {};

  // Weight distribution by difficulty
  const weights: Record<string, Record<string, number>> = {
    easy: {
      basic: 30,
      edge: 20,
      boundary: 15,
      max_constraint: 10,
      adversarial: 10,
      stress: 10,
      worst_case: 5,
    },
    medium: {
      basic: 20,
      edge: 15,
      boundary: 15,
      max_constraint: 15,
      adversarial: 15,
      stress: 10,
      worst_case: 10,
    },
    hard: {
      basic: 15,
      edge: 10,
      boundary: 10,
      max_constraint: 15,
      adversarial: 20,
      stress: 15,
      worst_case: 15,
    },
  };

  const w = weights[difficulty] || weights.medium;

  for (const cat of categories) {
    dist[cat] = Math.round((w[cat] || 10) / 100 * total);
  }

  // Ensure at least 1 per category if category is specified
  for (const cat of categories) {
    if (dist[cat] === 0) dist[cat] = 1;
  }

  // Adjust to match total
  let currentTotal = Object.values(dist).reduce((a, b) => a + b, 0);
  while (currentTotal < total) {
    for (const cat of categories) {
      if (currentTotal >= total) break;
      dist[cat]++;
      currentTotal++;
    }
  }
  while (currentTotal > total) {
    for (const cat of categories) {
      if (currentTotal <= total) break;
      if (dist[cat] > 1) {
        dist[cat]--;
        currentTotal--;
      }
    }
  }

  return dist;
}
