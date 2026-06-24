import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/codeclash',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  codeforcesApiKey: process.env.CODEFORCES_API_KEY || '',
  codeforcesApiSecret: process.env.CODEFORCES_API_SECRET || '',
  frontendUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  judgeDockerImage: process.env.JUDGE_DOCKER_IMAGE || 'codeclash-judge:latest',
  judgeTimeoutMs: parseInt(process.env.JUDGE_TIMEOUT_MS || '10000'),
  judgeMemoryLimitMb: parseInt(process.env.JUDGE_MEMORY_LIMIT_MB || '256'),
};
