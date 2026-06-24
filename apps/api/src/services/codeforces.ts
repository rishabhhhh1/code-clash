import axios from 'axios';

const CF_API = 'https://codeforces.com/api';

export interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points: number;
  rating?: number;
  tags: string[];
}

export interface CodeforcesUser {
  handle: string;
  email?: string;
  vkId?: number;
  openId?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  organization?: string;
  contribution: number;
  rank: string;
  maxRank: string;
  rating?: number;
  maxRating?: number;
  lastOnlineTimeSeconds: number;
  registrationTimeSeconds: number;
  friendOfCount: number;
  avatar: string;
  titlePhoto: string;
}

export interface CodeforcesRating {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export const getUserInfo = async (handle: string): Promise<CodeforcesUser> => {
  try {
    const response = await axios.get(`${CF_API}/user.info`, {
      params: { handles: handle },
      timeout: 5000,
    });

    if (!response.data.result || response.data.result.length === 0) {
      throw new Error(`Handle ${handle} not found`);
    }

    return response.data.result[0];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Codeforces API error: ${error.message}`);
    }
    throw error;
  }
};

export const getUserRating = async (handle: string): Promise<CodeforcesRating[]> => {
  try {
    const response = await axios.get(`${CF_API}/user.rating`, {
      params: { handle },
      timeout: 5000,
    });
    return response.data.result || [];
  } catch (error) {
    console.error('Error fetching rating history:', error);
    return [];
  }
};

export const getProblems = async (): Promise<CodeforcesProblem[]> => {
  try {
    const response = await axios.get(`${CF_API}/problemset.problems`, {
      timeout: 10000,
    });
    return response.data.result.problems || [];
  } catch (error) {
    console.error('Error fetching problems:', error);
    return [];
  }
};

export const getProblemStatements = async (contestId: number, index: string): Promise<any> => {
  try {
    // Note: CF API doesn't provide full problem statements
    // You'd need to scrape or use GraphQL endpoint
    const response = await axios.get(`${CF_API}/contest.standings`, {
      params: { contestId, from: 1, count: 1 },
      timeout: 5000,
    });
    return response.data.result;
  } catch (error) {
    console.error('Error fetching problem statement:', error);
    return null;
  }
};
