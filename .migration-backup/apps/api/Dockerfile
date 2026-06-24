FROM node:20-alpine AS base

# Install turbo globally
RUN npm install -g turbo@2

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json tsconfig.json ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/node_modules ./node_modules
COPY --from=base /app/apps/api/package.json ./
COPY --from=base /app/apps/api/prisma ./prisma

# Generate Prisma client for production
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start
CMD ["node", "dist/index.js"]
