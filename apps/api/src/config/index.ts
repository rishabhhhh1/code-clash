import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // OAuth - Google
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/callback/google',
  },
  
  // OAuth - GitHub
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/callback/github',
  },
  
  // App URLs
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Judge
  judgeDockerImage: process.env.JUDGE_DOCKER_IMAGE || 'codeclash-judge:latest',
  judgeTimeoutMs: parseInt(process.env.JUDGE_TIMEOUT_MS || '10000', 10),
  judgeMemoryLimitMb: parseInt(process.env.JUDGE_MEMORY_LIMIT_MB || '256', 10),
  
  // AI - OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  
  // Test case generation limits per difficulty
  testCasesPerDifficulty: {
    easy:   { visible: 10,  hidden: 100 },
    medium: { visible: 20,  hidden: 300 },
    hard:   { visible: 30,  hidden: 1000 },
  },
};
