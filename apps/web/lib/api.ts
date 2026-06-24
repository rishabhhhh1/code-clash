const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  token?: string;
}

const apiRequest = async (endpoint: string, options: RequestOptions = {}) => {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'API request failed');
  }

  return data.data;
};

export const authAPI = {
  login: (handle: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),

  sync: (token: string) =>
    apiRequest('/auth/sync', {
      method: 'POST',
      token,
    }),

  getMe: (token: string) =>
    apiRequest('/auth/me', {
      token,
    }),

  logout: (token: string) =>
    apiRequest('/auth/logout', {
      method: 'POST',
      token,
    }),
};

export const usersAPI = {
  getProfile: (userId: string) =>
    apiRequest(`/users/${userId}`),

  getStats: (userId: string) =>
    apiRequest(`/users/${userId}/stats`),

  getHistory: (userId: string, page: number = 1) =>
    apiRequest(`/users/${userId}/history?page=${page}`),

  updateProfile: (userId: string, data: any, token: string) =>
    apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),
};

export const battlesAPI = {
  createBattle: (data: any, token: string) =>
    apiRequest('/battles', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getBattle: (code: string) =>
    apiRequest(`/battles/${code}`),

  joinBattle: (code: string, token: string) =>
    apiRequest(`/battles/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ battleCode: code }),
      token,
    }),

  startBattle: (code: string, token: string) =>
    apiRequest(`/battles/${code}/start`, {
      method: 'POST',
      token,
    }),

  submitCode: (code: string, data: any, token: string) =>
    apiRequest(`/battles/${code}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  getPublicLobby: () =>
    apiRequest('/battles/lobby/public'),
};

export const problemsAPI = {
  getProblems: (difficulty?: string, topic?: string, page: number = 1) => {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (topic) params.append('topic', topic);
    params.append('page', page.toString());
    return apiRequest(`/problems?${params.toString()}`);
  },

  getRandom: (difficulty: string = 'medium') =>
    apiRequest(`/problems/random?difficulty=${difficulty}`),

  getProblem: (id: string) =>
    apiRequest(`/problems/${id}`),

  getTopics: () =>
    apiRequest('/problems/metadata/topics'),
};

export const rankingAPI = {
  getLeaderboard: () =>
    apiRequest('/rankings/leaderboard'),

  getWeekly: () =>
    apiRequest('/rankings/weekly'),

  getMonthly: () =>
    apiRequest('/rankings/monthly'),
};

export const matchmakingAPI = {
  quickMatch: (token: string) =>
    apiRequest('/matchmaking/quick', {
      method: 'POST',
      token,
    }),

  getStatus: (token: string) =>
    apiRequest('/matchmaking/status', {
      token,
    }),
};
