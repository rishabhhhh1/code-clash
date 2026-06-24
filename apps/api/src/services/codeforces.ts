import crypto from 'crypto';
import { config } from '../config';

const CODEFORCES_API_BASE = 'https://codeforces.com/api';
const API_KEY = config.codeforcesApiKey;
const API_SECRET = config.codeforcesApiSecret;

interface CfResponse<T> {
  status: string;
  comment?: string;
  result?: T;
}

interface CfProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
}

interface CfUser {
  handle: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  organization?: string;
  contribution?: number;
  rank?: string;
  rating?: number;
  maxRank?: string;
  maxRating?: number;
  lastOnlineTimeSeconds?: number;
  registrationTimeSeconds?: number;
  friendOfCount?: number;
  avatar?: string;
  titlePhoto?: string;
}

interface CfSubmission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
    type: string;
    rating?: number;
    tags: string[];
  };
  author: {
    contestId?: number;
    members: Array<{ handle: string }>;
    participantType: string;
  };
  programmingLanguage: string;
  verdict?: string;
  testset?: string;
  passedTestCount: number;
  timeConsumedMillis?: number;
  memoryConsumedBytes?: number;
}

interface CfRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

interface CfProblemset {
  problems: CfProblem[];
  problemStatistics: Array<{
    contestId: number;
    index: string;
    solvedCount: number;
  }>;
}

interface CfContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000;

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(method: string, params: Record<string, string>): string {
  return `${method}:${JSON.stringify(Object.entries(params).sort())}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
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

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as any)?.name === 'AbortError') {
      throw new Error('Codeforces API timed out');
    }
    throw new Error(`Cannot reach Codeforces API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function callApi<T>(
  methodName: string,
  params: Record<string, string> = {},
  requireAuth = false
): Promise<T> {
  const cacheKey = getCacheKey(methodName, params);
  const cached = getFromCache<T>(cacheKey);
  if (cached !== null) return cached;

  const url = new URL(`${CODEFORCES_API_BASE}/${methodName}`);

  if (requireAuth && API_KEY && API_SECRET) {
    const time = Math.floor(Date.now() / 1000);
    const authParams = { ...params, apiKey: API_KEY, time: time.toString() };
    const apiSig = generateApiSig(methodName, authParams);
    Object.entries(authParams).forEach(([key, value]) => url.searchParams.append(key, value));
    url.searchParams.append('apiSig', apiSig);
  } else {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  let response: Response;
  try {
    response = await rateLimitedFetch(url.toString());
  } catch {
    throw new Error('Codeforces API is unreachable');
  }

  if (response.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    return callApi<T>(methodName, params, requireAuth);
  }

  let data: CfResponse<T>;
  try {
    data = await response.json() as CfResponse<T>;
  } catch {
    throw new Error('Codeforces API returned invalid JSON');
  }

  if (data.status !== 'OK') {
    throw new Error(data.comment || 'Codeforces API request failed');
  }

  setCache(cacheKey, data.result!);
  return data.result!;
}

export async function fetchUserInfo(handle: string): Promise<CfUser> {
  const result = await callApi<CfUser[]>('user.info', { handles: handle });
  if (!result || result.length === 0) {
    throw new Error(`User ${handle} not found on Codeforces`);
  }
  return result[0];
}

export async function getUserInfo(handle: string): Promise<CfUser> {
  return fetchUserInfo(handle);
}

export async function getUserRating(handle: string): Promise<CfRatingChange[]> {
  return callApi<CfRatingChange[]>('user.rating', { handle });
}

export function getUserProfileUrl(handle: string): string {
  return `https://codeforces.com/profile/${encodeURIComponent(handle)}`;
}

export async function fetchProblems(
  tags?: string[],
  minRating?: number,
  maxRating?: number
): Promise<CfProblem[]> {
  const params: Record<string, string> = {};
  if (tags && tags.length > 0) {
    params.tags = tags.join(';');
  }

  const result = await callApi<{ problems: CfProblem[]; problemStatistics: any[] }>(
    'problemset.problems',
    params
  );

  let problems = result?.problems || [];

  if (minRating !== undefined) {
    problems = problems.filter((p) => (p.rating || 0) >= minRating);
  }
  if (maxRating !== undefined) {
    problems = problems.filter((p) => (p.rating || 0) <= maxRating);
  }

  return problems;
}

export async function getProblemset(tags?: string[]): Promise<CfProblemset> {
  const params: Record<string, string> = {};
  if (tags && tags.length > 0) {
    params.tags = tags.join(';');
  }

  return callApi<CfProblemset>('problemset.problems', params);
}

export async function fetchRandomProblems(
  count: number,
  tags?: string[],
  minRating?: number,
  maxRating?: number
): Promise<CfProblem[]> {
  const problems = await fetchProblems(tags, minRating, maxRating);
  const shuffled = [...problems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function getRandomProblems(
  count: number,
  tags?: string[],
  minRating?: number,
  maxRating?: number
): Promise<CfProblem[]> {
  const problems = await fetchProblems(tags, minRating, maxRating);
  const publicProblems = problems.filter((p) => Number.isInteger(p.contestId) && p.index);
  const shuffled = [...publicProblems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function fetchUserSubmissions(
  handle: string,
  from?: number,
  count?: number
): Promise<CfSubmission[]> {
  const params: Record<string, string> = { handle };
  if (from !== undefined) params.from = from.toString();
  if (count !== undefined) params.count = count.toString();
  return callApi<CfSubmission[]>('user.status', params);
}

export async function getUserSubmissionsForProblem(
  handle: string,
  contestId: number,
  index: string,
  count = 20
): Promise<CfSubmission[]> {
  const submissions = await fetchUserSubmissions(handle, 1, Math.max(count, 20));
  return submissions
    .filter((submission) => (
      submission.problem.contestId === contestId &&
      submission.problem.index.toUpperCase() === index.toUpperCase()
    ))
    .slice(0, count);
}

export async function checkUserSolvedProblem(
  handle: string,
  contestId: number,
  index: string,
  sinceSeconds?: number
): Promise<CfSubmission | null> {
  const submissions = await fetchUserSubmissions(handle, 1, 100);
  return submissions.find((submission) => (
    submission.problem.contestId === contestId &&
    submission.problem.index.toUpperCase() === index.toUpperCase() &&
    submission.verdict === 'OK' &&
    (!sinceSeconds || submission.creationTimeSeconds >= sinceSeconds)
  )) || null;
}

export async function checkSubmission(
  runId: number,
  contestId: number,
  handle: string
): Promise<CfSubmission | null> {
  try {
    const submissions = await fetchUserSubmissions(handle, 1, 100);
    return (
      submissions.find(
        (s) => s.id === runId && s.contestId === contestId
      ) || null
    );
  } catch {
    return null;
  }
}

export async function fetchContestList(): Promise<CfContest[]> {
  return callApi<CfContest[]>('contest.list');
}

export async function getContestList(includeGym = false): Promise<CfContest[]> {
  const contests = await fetchContestList();
  return includeGym ? contests : contests.filter((contest) => contest.type !== 'GYM');
}

export async function fetchProblemDetail(
  contestId: number,
  index: string
): Promise<CfProblem | null> {
  try {
    const params: Record<string, string> = { contestId: contestId.toString() };
    const result = await callApi<{ problems: CfProblem[] }>('contest.standings', params);
    return result?.problems?.find((p) => p.index === index) || null;
  } catch {
    return null;
  }
}

export function getProblemUrl(contestId: number, index: string): string {
  return `https://codeforces.com/problemset/problem/${contestId}/${encodeURIComponent(index)}`;
}

export function getContestUrl(contestId: number): string {
  return `https://codeforces.com/contest/${contestId}`;
}

export function getDifficultyFromRating(rating?: number): 'easy' | 'medium' | 'hard' {
  if (!rating || rating < 1200) return 'easy';
  if (rating < 1700) return 'medium';
  return 'hard';
}

export type { CfUser, CfProblem, CfSubmission, CfContest, CfRatingChange, CfProblemset };
