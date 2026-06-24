import { fetchRandomProblems, CfProblem } from './codeforces';
import { IRoom } from '../models/Room';

interface ProblemFilters {
  tags?: string[];
  rating?: number;
  count?: number;
}

export interface FairProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  type: string;
  points?: number;
}

function toFairProblem(cf: CfProblem): FairProblem {
  return {
    contestId: cf.contestId,
    index: cf.index,
    name: cf.name,
    rating: cf.rating,
    tags: cf.tags,
    type: cf.type,
    points: cf.points,
  };
}

export async function getProblems(filters: ProblemFilters): Promise<FairProblem[]> {
  const { tags, rating, count = 50 } = filters;
  const cfProblems = await fetchRandomProblems(
    count,
    tags,
    rating ? rating - 100 : undefined,
    rating ? rating + 100 : undefined
  );
  return cfProblems.map(toFairProblem);
}

export async function getRandomProblem(filters?: ProblemFilters): Promise<FairProblem | null> {
  const cfProblems = await fetchRandomProblems(
    1,
    filters?.tags,
    filters?.rating ? filters.rating - 100 : undefined,
    filters?.rating ? filters.rating + 100 : undefined
  );
  if (cfProblems.length === 0) return null;
  return toFairProblem(cfProblems[0]);
}

export async function getTopicProblems(topic: string, rating?: number): Promise<FairProblem[]> {
  const cfProblems = await fetchRandomProblems(
    10,
    [topic],
    rating ? rating - 100 : undefined,
    rating ? rating + 100 : undefined
  );
  return cfProblems.map(toFairProblem);
}

export async function getFairProblemForRoom(room: IRoom): Promise<FairProblem | null> {
  let minRating: number | undefined;
  let maxRating: number | undefined;

  if (room.difficulty === 'easy') {
    minRating = 800;
    maxRating = 1399;
  } else if (room.difficulty === 'medium') {
    minRating = 1400;
    maxRating = 1899;
  } else if (room.difficulty === 'hard') {
    minRating = 1900;
    maxRating = 2400;
  }

  const cfProblems = await fetchRandomProblems(
    1,
    room.topics.length > 0 ? room.topics : undefined,
    minRating,
    maxRating
  );

  if (cfProblems.length === 0) {
    const fallback = await fetchRandomProblems(1);
    if (fallback.length === 0) return null;
    return toFairProblem(fallback[0]);
  }

  return toFairProblem(cfProblems[0]);
}
