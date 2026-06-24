import crypto from 'crypto';

const CODEFORCES_API_BASE = 'https://codeforces.com/api';
const API_KEY = process.env.CODEFORCES_API_KEY || '';
const API_SECRET = process.env.CODEFORCES_API_SECRET || '';

interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
  problemsetName?: string;
}

interface CodeforcesUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  titlePhoto?: string;
  avatar?: string;
}

interface CodeforcesSubmission {
  id: number;
  contestId: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
  };
  author: {
    participants: Array<{ handle: string }>;
  };
  programmingLanguage: string;
  verdict?: string;
  timeConsumedMillis?: number;
  memoryConsumedBytes?: number;
  creationTimeSeconds: number;
}

interface CodeforcesContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
  difficulty?: number;
}

interface ApiResponse<T> {
  status: string;
  comment?: string;
  result?: T;
}

function generateApiSig(methodName: string, params: Record<string, string>): string {
  const rand = crypto.randomBytes(3).toString('hex');
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const data = `${rand}/${methodName}?${sortedParams}#${API_SECRET}`;
  const hash = crypto.createHash('sha512').update(data).digest('hex');
  return rand + hash;
}

async function callApi<T>(
  methodName: string,
  params: Record<string, string> = {},
  requireAuth = false
): Promise<ApiResponse<T>> {
  const url = new URL(`${CODEFORCES_API_BASE}/${methodName}`);
  
  if (requireAuth && API_KEY && API_SECRET) {
    const time = Math.floor(Date.now() / 1000);
    const authParams = {
      ...params,
      apiKey: API_KEY,
      time: time.toString(),
    };
    const apiSig = generateApiSig(methodName, authParams);
    
    Object.entries(authParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    url.searchParams.append('apiSig', apiSig);
  } else {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  // Fetch with a 10-second timeout so network failures surface quickly
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as any)?.name === 'AbortError') {
      throw new Error('Codeforces API timed out. Please try again.');
    }
    throw new Error(`Cannot reach Codeforces API: ${error instanceof Error ? error.message : 'Unknown network error'}`);
  }
  clearTimeout(timeoutId);

  // Handle rate-limiting gracefully
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return callApi<T>(methodName, params, requireAuth);
  }

  let data: ApiResponse<T>;
  try {
    data = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error('Codeforces API returned an invalid response.');
  }

  // Throw the Codeforces comment directly so callers can inspect it
  if (data.status !== 'OK') {
    throw new Error(data.comment || 'Codeforces API request failed');
  }

  return data;
}

export async function getUserInfo(handle: string): Promise<CodeforcesUser> {
  const response = await callApi<CodeforcesUser[]>('user.info', { handles: handle });
  if (!response.result || response.result.length === 0) {
    throw new Error(`User ${handle} not found on Codeforces`);
  }
  return response.result[0];
}

export async function getUserRating(handle: string): Promise<Array<{ contestId: number; contestName: string; rank: number; ratingUpdateTimeSeconds: number; oldRating: number; newRating: number }>> {
  const response = await callApi<Array<{ contestId: number; contestName: string; rank: number; ratingUpdateTimeSeconds: number; oldRating: number; newRating: number }>>('user.rating', { handle });
  return response.result || [];
}

export async function getUserStatus(handle: string, count = 10): Promise<CodeforcesSubmission[]> {
  const response = await callApi<CodeforcesSubmission[]>('user.status', { handle, count: count.toString() });
  return response.result || [];
}

export async function getProblemset(tags?: string[]): Promise<{ problems: CodeforcesProblem[] }> {
  const params: Record<string, string> = {};
  if (tags && tags.length > 0) {
    params.tags = tags.join(';');
  }
  
  const response = await callApi<{ problems: CodeforcesProblem[]; problemStatistics: any[] }>('problemset.problems', params);
  return { problems: response.result?.problems || [] };
}

export async function getContestList(gym = false): Promise<CodeforcesContest[]> {
  const response = await callApi<CodeforcesContest[]>('contest.list', gym ? { gym: 'true' } : {});
  return response.result || [];
}

export async function getContestStandings(contestId: number): Promise<any> {
  const response = await callApi('contest.standings', { contestId: contestId.toString() });
  return response.result;
}

export async function getContestProblems(contestId: number): Promise<CodeforcesProblem[]> {
  const standings = await getContestStandings(contestId);
  return standings?.problems || [];
}

export async function getRandomProblems(count = 5, tags?: string[], minRating?: number, maxRating?: number): Promise<CodeforcesProblem[]> {
  const { problems } = await getProblemset(tags);
  
  let filtered = problems;
  if (minRating !== undefined) {
    filtered = filtered.filter(p => (p.rating || 0) >= minRating);
  }
  if (maxRating !== undefined) {
    filtered = filtered.filter(p => (p.rating || 0) <= maxRating);
  }
  
  // Shuffle and take count
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getProblemUrl(contestId: number, index: string): string {
  return `https://codeforces.com/contest/${contestId}/problem/${index}`;
}

export function getContestUrl(contestId: number): string {
  return `https://codeforces.com/contest/${contestId}`;
}

export function getUserProfileUrl(handle: string): string {
  return `https://codeforces.com/profile/${handle}`;
}

export function getDifficultyFromRating(rating?: number): string {
  if (!rating) return 'unknown';
  if (rating < 1200) return 'easy';
  if (rating < 1600) return 'medium';
  if (rating < 2000) return 'hard';
  return 'expert';
}

export async function checkUserSolvedProblem(handle: string, contestId: number, problemIndex: string): Promise<boolean> {
  try {
    const submissions = await getUserStatus(handle, 50);
    return submissions.some(sub => 
      sub.problem.contestId === contestId && 
      sub.problem.index === problemIndex && 
      sub.verdict === 'OK'
    );
  } catch (error) {
    console.error('Error checking user solved status:', error);
    return false;
  }
}

export async function getUserSubmissionsForProblem(handle: string, contestId: number, problemIndex: string, count = 10) {
  try {
    const submissions = await getUserStatus(handle, count);
    return submissions.filter(sub => 
      sub.problem.contestId === contestId && 
      sub.problem.index === problemIndex
    );
  } catch (error) {
    console.error('Error fetching user submissions for problem:', error);
    return [];
  }
}
