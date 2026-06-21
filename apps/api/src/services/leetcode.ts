import { prisma } from '../config/database';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://leetcode.com',
  Origin: 'https://leetcode.com',
};

interface LeetCodeProblem {
  title: string;
  titleSlug: string;
  questionId: number;
  questionFrontendId: string;
  difficulty: string;
  content: string;
  hints: string[];
  exampleTestCases: string;
  topicTags: { name: string; slug: string }[];
  codeSnippets: { lang: string; langSlug: string; code: string }[];
  stats: string;
  sampleTestCase: string;
  metaInfo: { name: string; value: string }[];
}

interface FetchResult {
  success: boolean;
  data?: {
    title: string;
    slug: string;
    leetcodeId: number;
    difficulty: string;
    description: string;
    inputFormat: string;
    outputFormat: string;
    examples: any[];
    constraints: string[];
    hints: string[];
    topics: string[];
    starterCodeCpp: string;
    starterCodeJava: string;
    starterCodePython: string;
    starterCodeJavaScript: string;
    likes: number;
    dislikes: number;
    acceptanceRate: number;
  };
  error?: string;
}

function parseHTML(html: string): {
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
} {
  let description = '';
  let inputFormat = '';
  let outputFormat = '';
  const constraints: string[] = [];

  // Extract sections from LeetCode HTML
  const sections = html.split(/<\/?pre>/gi);

  // Try to find "Input:" / "Output:" / "Constraints:" sections
  // LeetCode format: <p> ... </p> followed by <pre> code blocks
  // or structured as paragraphs with bold headers

  // Simple approach: split by common section markers
  const text = html
    .replace(/<pre[^>]*>/gi, '\n```\n')
    .replace(/<\/pre>/gi, '\n```\n')
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em[^>]*>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<sup[^>]*>/gi, '^')
    .replace(/<\/sup>/gi, '')
    .replace(/<sub[^>]*>/gi, '_')
    .replace(/<\/sub>/gi, '')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '[$1]')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Parse sections
  const inputMatch = text.match(/\*\*Input Format:\*\*\s*([\s\S]*?)(?=\*\*Output Format:\*\*|\*\*Constraint|\*\*Example|\n```\n|$)/i)
    || text.match(/Input:\s*([\s\S]*?)(?=Output:|Constraint:|Example:|$)/i);
  const outputMatch = text.match(/\*\*Output Format:\*\*\s*([\s\S]*?)(?=\*\*Constraint|\*\*Example|\n```\n|$)/i)
    || text.match(/Output:\s*([\s\S]*?)(?=Constraint:|Example:|$)/i);
  const constraintMatch = text.match(/\*\*Constraints?:\*\*\s*([\s\S]*?)(?=\*\*Example|\n```\n|$)/i)
    || text.match(/Constraints?:\s*([\s\S]*?)(?=Example:|$)/i);

  if (inputMatch) inputFormat = inputMatch[1].trim();
  if (outputMatch) outputFormat = outputMatch[1].trim();
  if (constraintMatch) {
    const raw = constraintMatch[1].trim();
    const lines = raw.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
    constraints.push(...lines);
  }

  // Everything before the first section is the description
  const firstSectionIdx = text.search(/\*\*(Input Format|Output Format|Constraints?|Example)\*\*/i);
  if (firstSectionIdx > 0) {
    description = text.substring(0, firstSectionIdx).trim();
  } else {
    description = text.trim();
  }

  // Remove leading/trailing markdown artifacts
  description = description.replace(/^[\s\n]+/, '').replace(/[\s\n]+$/, '');

  return { description, inputFormat, outputFormat, constraints };
}

function parseExamples(input: string, content: string): any[] {
  const examples: any[] = [];

  // Try to extract examples from the content HTML
  const exampleMatches = content.match(/<strong>Example \d+:?<\/strong>[\s\S]*?(?=<strong>Example \d+:?<\/strong>|<strong>Constraints?:?<\/strong>|$)/gi) || [];

  for (const match of exampleMatches) {
    const inputMatch = match.match(/<strong>Input:<\/strong>\s*([\s\S]*?)(?=<strong>Output:<\/strong>)/i)
      || match.match(/Input:\s*([\s\S]*?)(?=Output:)/i);
    const outputMatch = match.match(/<strong>Output:<\/strong>\s*([\s\S]*?)(?=<strong>Explanation:<\/strong>|$)/i)
      || match.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/i);
    const explanationMatch = match.match(/<strong>Explanation:<\/strong>\s*([\s\S]*?)$/i)
      || match.match(/Explanation:\s*([\s\S]*?)$/i);

    if (inputMatch && outputMatch) {
      const cleanInput = inputMatch[1].replace(/<[^>]+>/g, '').trim();
      const cleanOutput = outputMatch[1].replace(/<[^>]+>/g, '').trim();
      const cleanExplanation = explanationMatch ? explanationMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

      examples.push({
        input: cleanInput,
        output: cleanOutput,
        explanation: cleanExplanation || undefined,
      });
    }
  }

  // Fallback: parse from exampleTestCases JSON if available
  if (examples.length === 0 && input) {
    try {
      const testCases = JSON.parse(input);
      if (Array.isArray(testCases)) {
        for (const tc of testCases) {
          if (tc.input && tc.output) {
            examples.push({ input: tc.input, output: tc.output, explanation: tc.explanation });
          }
        }
      }
    } catch {
      // use raw input as single example
    }
  }

  return examples;
}

function parseStats(statsStr: string): { likes: number; dislikes: number; acceptanceRate: number } {
  let likes = 0;
  let dislikes = 0;
  let acceptanceRate = 0;

  try {
    const stats = JSON.parse(statsStr);
    if (stats.totalAcceptedRaw) {
      const totalAccepted = stats.totalAcceptedRaw;
      const totalSubmission = stats.totalSubmissionRaw;
      if (totalSubmission > 0) {
        acceptanceRate = Math.round((totalAccepted / totalSubmission) * 10000) / 100;
      }
    }
    if (stats.totalLikes) likes = stats.totalLikes;
    if (stats.totalDislikes) dislikes = stats.totalDislikes;
  } catch {
    // ignore
  }

  return { likes, dislikes, acceptanceRate };
}

export async function fetchProblemFromLeetCode(slug: string): Promise<FetchResult> {
  try {
    // First check if we already have it with full content
    const existing = await prisma.problem.findUnique({ where: { slug } });
    if (existing && existing.description && existing.description.length > 200 && !existing.description.includes('imported from LeetCode')) {
      return { success: true, data: undefined }; // Already have full content
    }

    const query = `
      query questionContent($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          titleSlug
          questionId
          questionFrontendId
          difficulty
          content
          hints
          exampleTestCases
          topicTags { name slug }
          codeSnippets { lang langSlug code }
          stats
          sampleTestCase
          metaInfo { name value }
        }
      }
    `;

    const response = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query, variables: { titleSlug: slug } }),
    });

    if (!response.ok) {
      return { success: false, error: `LeetCode API returned ${response.status}` };
    }

    const json: any = await response.json();
    const q = json.data?.question;

    if (!q || !q.content) {
      return { success: false, error: 'Problem not found on LeetCode or content unavailable' };
    }

    const { description, inputFormat, outputFormat, constraints } = parseHTML(q.content);
    const examples = parseExamples(q.exampleTestCases, q.content);
    const { likes, dislikes, acceptanceRate } = parseStats(q.stats);
    const topics = q.topicTags?.map((t: any) => t.slug) || [];

    // Extract starter code
    const snippets: Record<string, string> = {};
    for (const s of q.codeSnippets || []) {
      snippets[s.langSlug] = s.code;
    }

    return {
      success: true,
      data: {
        title: q.title,
        slug: q.titleSlug,
        leetcodeId: parseInt(q.questionFrontendId, 10) || q.questionId,
        difficulty: q.difficulty.toLowerCase(),
        description,
        inputFormat,
        outputFormat,
        examples,
        constraints,
        hints: q.hints || [],
        topics,
        starterCodeCpp: snippets['cpp'] || '',
        starterCodeJava: snippets['java'] || '',
        starterCodePython: snippets['python3'] || snippets['python'] || '',
        starterCodeJavaScript: snippets['javascript'] || '',
        likes,
        dislikes,
        acceptanceRate,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Failed to fetch from LeetCode: ${err.message}` };
  }
}

export async function syncProblemContent(problemId: string): Promise<FetchResult> {
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) return { success: false, error: 'Problem not found in database' };

  // Use slug or try to derive from problemLink
  let slug = problem.slug;
  if (problem.problemLink) {
    const match = problem.problemLink.match(/problems\/([^/]+)/);
    if (match) slug = match[1];
  }

  const result = await fetchProblemFromLeetCode(slug);
  if (!result.success || !result.data) return result;

  const d = result.data;

  await prisma.problem.update({
    where: { id: problemId },
    data: {
      description: d.description || problem.description,
      inputFormat: d.inputFormat || problem.inputFormat,
      outputFormat: d.outputFormat || problem.outputFormat,
      examples: (d.examples.length > 0 ? d.examples : problem.examples) as any,
      constraints: (d.constraints.length > 0 ? d.constraints : problem.constraints) as any,
      hints: (d.hints.length > 0 ? d.hints : problem.hints) as any,
      topics: d.topics.length > 0 ? d.topics : problem.topics,
      starterCodeCpp: d.starterCodeCpp || problem.starterCodeCpp,
      starterCodeJava: d.starterCodeJava || problem.starterCodeJava,
      starterCodePython: d.starterCodePython || problem.starterCodePython,
      starterCodeJavaScript: d.starterCodeJavaScript || problem.starterCodeJavaScript,
      likes: d.likes || problem.likes,
      dislikes: d.dislikes || problem.dislikes,
      acceptanceRate: d.acceptanceRate || problem.acceptanceRate,
      leetcodeId: d.leetcodeId || problem.leetcodeId,
    },
  });

  return { success: true, data: d };
}
