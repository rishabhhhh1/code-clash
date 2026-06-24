# CodeClash - Architecture & Implementation Plan

## Project Overview

CodeClash is a real-time competitive coding platform combining LeetCode-style problems with multiplayer gaming features like battle rooms, live leaderboards, and ELO ratings.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, ShadCN UI |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 15+ with Prisma ORM |
| Realtime | Socket.IO (WebSocket) |
| Auth | JWT + OAuth (Google/GitHub) |
| Code Editor | Monaco Editor |
| Code Execution | Docker containers (sandboxed) |
| Deployment | Docker Compose, Vercel (FE), Railway/Render (BE) |

## Monorepo Structure

```
CodeClash/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   └── styles/            # Global styles
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── config/        # Environment config
│       │   ├── middleware/    # Auth, validation, error handling
│       │   ├── modules/      # Feature modules
│       │   │   ├── auth/     # Authentication
│       │   │   ├── users/    # User management
│       │   │   ├── battles/  # Battle system
│       │   │   ├── problems/ # Problem bank
│       │   │   ├── judge/    # Online judge
│       │   │   └── ranking/  # ELO & rankings
│       │   ├── socket/       # Socket.IO handlers
│       │   └── utils/        # Shared utilities
│       └── prisma/           # Database schema
├── packages/
│   ├── shared/                # Shared types & constants
│   └── ui/                    # Shared UI components
├── docker/
│   ├── judge/                 # Code execution containers
│   └── postgres/              # DB initialization
├── docker-compose.yml
└── package.json               # Workspace config
```

## Database Schema (Core Tables)

### Users
- id, email, username, passwordHash
- avatar, bio
- rating, rank
- totalBattles, wins, losses, draws
- createdAt, updatedAt

### Problems
- id, title, slug, difficulty (easy/medium/hard)
- description, examples, constraints
- testCases (JSON), topics (array)
- timeLimit, memoryLimit

### Battles
- id, code (unique 6-char), creatorId
- mode (deathmatch/royal/bestof3/survival/speedrun/topicdraft/chaos)
- status (waiting/active/completed)
- playerCount, maxPlayers
- difficulty, topics, timeControl
- isPublic, inviteCode
- startTime, endTime

### BattlePlayers
- id, battleId, userId
- score, rank, problemsSolved
- submissionsCount, isAlive
- joinedAt

### Submissions
- id, battleId, userId, problemId
- code, language, status
- runtime, memory
- score, createdAt

### MatchHistory
- id, userId, battleId
- placement, ratingChange
- topicsPlayed, createdAt

### DailyChallenges
- id, date, problemIds
- leaderboard (JSON)

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/oauth/:provider
- POST /api/auth/refresh
- GET /api/auth/me

### Users
- GET /api/users/:id
- PATCH /api/users/:id
- GET /api/users/:id/stats
- GET /api/users/:id/history

### Battles
- POST /api/battles
- GET /api/battles/:code
- POST /api/battles/:code/join
- POST /api/battles/:code/leave
- GET /api/battles/lobby (public)
- POST /api/battles/:code/start

### Problems
- GET /api/problems
- GET /api/problems/:id

### Judge
- POST /api/judge/run
- POST /api/judge/submit

### Rankings
- GET /api/rankings
- GET /api/rankings/leaderboard

## WebSocket Events

### Client → Server
- battle:join
- battle:leave
- battle:start
- submission:code
- chat:message

### Server → Client
- battle:player_joined
- battle:player_left
- battle:started
- battle:problem_released
- submission:result
- leaderboard:update
- battle:ended

## Battle Modes Implementation

### 1. Deathmatch (1v1)
- Single problem, time limit
- First accepted wins
- Tiebreak: faster submission time

### 2. Battle Royale (10-100+)
- Multiple problems, elimination rounds
- Live leaderboard
- Progressive difficulty

### 3. Best of 3
- Three rounds, different difficulties
- Round winner determined by score

### 4. Survival Mode
- Continuous problems
- Lives system (wrong = lose life)
- Last player standing wins

### 5. Speedrun Mode
- Predefined problem set
- Lowest total time wins

### 6. Topic Draft Mode
- Player topic selection
- Random selection from picks

### 7. Chaos Mode
- Hidden topic until start
- Known difficulty only

## ELO Rating System

```
K-factor: 32 (new players: 64)
Expected Score: 1 / (1 + 10^((Rb-Ra)/400))
New Rating: Ra + K * (Sa - Ea)

Ranks:
- Bronze: 0-999
- Silver: 1000-1499
- Gold: 1500-1999
- Platinum: 2000-2499
- Diamond: 2500-2999
- Master: 3000-3499
- Grandmaster: 3500-3999
- Legend: 4000+
```

## Implementation Phases

### Phase 1: Infrastructure
- [ ] Initialize monorepo with Turborepo
- [ ] Set up Docker Compose (PostgreSQL, Redis)
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Prisma with initial schema

### Phase 2: Backend Core
- [ ] Express server setup
- [ ] Auth module (JWT, OAuth)
- [ ] User module (CRUD, profiles)
- [ ] Middleware (auth, validation, errors)

### Phase 3: Frontend Foundation
- [ ] Next.js app with App Router
- [ ] ShadCN UI setup
- [ ] Auth pages (login, register)
- [ ] Dashboard layout

### Phase 4: Battle System
- [ ] Battle creation API
- [ ] Room code generation
- [ ] Public/private lobby
- [ ] Battle join/leave logic

### Phase 5: Real-Time
- [ ] Socket.IO server integration
- [ ] Room management
- [ ] Live event broadcasting
- [ ] Reconnection handling

### Phase 6: Online Judge
- [ ] Problem bank (50+ problems)
- [ ] Code execution sandbox
- [ ] Test case validation
- [ ] Runtime/memory measurement

### Phase 7: Battle Modes
- [ ] Deathmatch mode
- [ ] Battle Royale mode
- [ ] Best of 3 mode
- [ ] Additional modes

### Phase 8: Ranking
- [ ] ELO calculation engine
- [ ] Leaderboard API
- [ ] Match history tracking
- [ ] Rank progression

### Phase 9: Profiles & Stats
- [ ] User profile pages
- [ ] Statistics dashboard
- [ ] Charts and visualizations
- [ ] Notification system

### Phase 10: Polish
- [ ] Daily challenges
- [ ] Spectator mode
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Deployment setup
