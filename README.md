<div align="center">

# ⚔️ CodeClash

### Real-Time Competitive Coding Platform

**LeetCode meets multiplayer gaming. Battle friends, climb rankings, solve 3,600+ problems.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[**Live Demo**](#) · [**Report Bug**](https://github.com/your-username/codeclash/issues) · [**Request Feature**](https://github.com/your-username/codeclash/issues)

</div>

---

## 🎯 What is CodeClash?

CodeClash transforms coding practice into **competitive multiplayer battles**. Instead of solving problems alone, you compete head-to-head against other developers in real-time.

Think of it as **LeetCode + Chess.com** — you get the problem-solving challenge of competitive programming combined with the excitement of multiplayer gaming.

### How It Works

```
1. Create or join a battle room
2. Choose difficulty & topics (Arrays, Graphs, DP, etc.)
3. Get matched with an opponent
4. Same problem, same time — race to solve it
5. First correct solution wins
6. ELO rating updates, leaderboard moves
```

---

## ✨ Features

### 🎮 7 Battle Modes

| Mode | Players | How It Works |
|:-----|:-------:|:-------------|
| **⚔️ Deathmatch** | 1v1 | Head-to-head, first to solve wins |
| **👑 Battle Royale** | 10-100+ | Last coder standing wins |
| **🏆 Best of 3** | 1v1 | Three rounds, different difficulties |
| **💀 Survival** | Any | Wrong answer = lose a life |
| **⚡ Speedrun** | Any | Lowest total time wins |
| **🎯 Topic Draft** | Any | Pick topics, random selection |
| **🌪️ Chaos** | Any | Hidden topic until start |

### 🧩 Core Features

- **3,600+ LeetCode Problems** — Full problem statements rendered directly in-app
- **Monaco Code Editor** — The same editor powering VS Code
- **Real-Time Battles** — WebSocket-powered live competition with instant feedback
- **ELO Rating System** — 8 ranks from Bronze to Legend
- **Live Leaderboards** — Global, weekly, and monthly rankings
- **OAuth Login** — Sign in with Google or GitHub
- **Smart Matchmaking** — Quick match or skill-based ranked queues
- **Multi-Language** — Python, JavaScript, Java, C++
- **Markdown Rendering** — Problem descriptions with code blocks, math, and formatting
- **Side-by-Side Layout** — Problem statement + code editor, responsive on mobile
- **Admin Dashboard** — Manage problems, users, and settings
- **LeetCode Sync** — Fetch full problem content from LeetCode API

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   Next.js App    │  │  Monaco Editor  │  │   Socket.IO    │  │
│  │   (React 18)     │  │   (VS Code)     │  │   Client       │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │ REST API           │ REST API           │ WebSocket
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER (Express)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Auth    │  │ Battles  │  │ Problems │  │   Matchmaking  │  │
│  │  Module   │  │  Module  │  │  Module  │  │     Module     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │              │              │                │           │
│  ┌────┴──────────────┴──────────────┴────────────────┴────────┐ │
│  │                    Prisma ORM                               │ │
│  └────────────────────────┬───────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  PostgreSQL  │ │    Redis    │ │  LeetCode   │
     │   (Neon)     │ │  (Upstash)  │ │   GraphQL   │
     └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|:-----|:-------:|:--------|
| Node.js | 18+ | Runtime |
| Docker | Latest | Database containers |
| npm | 10+ | Package manager |

### Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/codeclash.git
cd codeclash

# 2. Install all dependencies
npm install

# 3. Start PostgreSQL & Redis
docker-compose up -d

# 4. Configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Setup database
npm run db:generate
npm run db:push

# 6. Import 3,600+ LeetCode problems
npm run import:problems --workspace=apps/api

# 7. Start development
npm run dev
```

### Access Points

| Service | URL |
|:--------|:----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| API Health | http://localhost:3001/health |

---

## 📁 Project Structure

```
codeclash/
│
├── apps/
│   ├── web/                          # Frontend (Next.js 14)
│   │   ├── app/                      # App Router pages
│   │   │   ├── auth/                 # Login, Register, OAuth
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── callback/[provider]/
│   │   │   ├── battle/[code]/        # Real-time battle room
│   │   │   ├── problems/             # Problem list & practice
│   │   │   │   └── [slug]/
│   │   │   ├── matchmaking/          # Quick match queue
│   │   │   ├── lobby/                # Public battle lobby
│   │   │   ├── rankings/             # Leaderboards
│   │   │   ├── profile/[username]/   # User profiles
│   │   │   ├── settings/             # Account settings
│   │   │   └── admin/                # Admin dashboard
│   │   ├── components/               # Reusable React components
│   │   │   └── problem/
│   │   │       └── ProblemStatement.tsx
│   │   └── lib/                      # Utilities & helpers
│   │       ├── api.ts
│   │       └── constants.ts
│   │
│   └── api/                          # Backend (Express)
│       ├── src/
│       │   ├── config/               # Environment config
│       │   │   ├── index.ts
│       │   │   └── database.ts
│       │   ├── middleware/            # Auth, validation, errors
│       │   ├── modules/              # Feature modules
│       │   │   ├── auth/             # JWT + OAuth
│       │   │   ├── battles/          # Battle system
│       │   │   ├── problems/         # Problem bank
│       │   │   ├── users/            # User management
│       │   │   ├── ranking/          # ELO & leaderboards
│       │   │   ├── matchmaking/      # Quick match
│       │   │   └── admin/            # Admin panel
│       │   ├── services/             # External APIs
│       │   │   └── leetcode.ts       # LeetCode GraphQL
│       │   └── socket/               # Socket.IO handlers
│       └── prisma/
│           ├── schema.prisma         # Database schema
│           └── importProblems.ts     # CSV importer
│
├── packages/
│   └── shared/                       # Shared types & constants
│
├── data/
│   └── problems.csv                  # 3,600+ LeetCode problems
│
├── docker-compose.yml
├── turbo.json                        # Turborepo config
└── package.json                      # Workspace root
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|:------|:-----------|:----|
| **Frontend** | Next.js 14 | App Router, SSR, fast builds |
| **UI** | Tailwind CSS + Radix UI | Utility-first + accessible components |
| **State** | Zustand | Lightweight state management |
| **Editor** | Monaco Editor | VS Code experience in browser |
| **Backend** | Express + TypeScript | Fast, type-safe API |
| **Database** | PostgreSQL + Prisma | Reliable ORM with great DX |
| **Realtime** | Socket.IO | WebSocket with fallback |
| **Auth** | JWT + Passport | Secure, scalable authentication |
| **Cache** | Redis (Upstash) | Session & rate limiting |
| **Monorepo** | Turborepo | Fast builds, shared code |

---

## 📡 API Reference

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/oauth/:provider
GET  /api/auth/me
POST /api/auth/logout
```

### Problems

```http
GET    /api/problems              # List with filters
GET    /api/problems/random       # Random selection
GET    /api/problems/topics       # All topics
GET    /api/problems/:id          # Problem details
POST   /api/problems/:id/sync     # Sync from LeetCode
POST   /api/problems/:id/run      # Run code (practice)
POST   /api/problems/:id/submit   # Submit solution
```

### Battles

```http
POST /api/battles                 # Create battle
GET  /api/battles/:code           # Get battle
POST /api/battles/:code/join      # Join battle
POST /api/battles/:code/leave     # Leave battle
POST /api/battles/:code/start     # Start battle
POST /api/battles/:code/run       # Run code
POST /api/battles/:code/submit    # Submit solution
GET  /api/battles/lobby/public    # Public lobby
```

### Matchmaking

```http
POST /api/matchmaking/quick       # Quick match
POST /api/matchmaking/skill       # Skill-based match
POST /api/matchmaking/cancel      # Cancel search
GET  /api/matchmaking/status      # Match status
```

### Rankings

```http
GET /api/rankings/leaderboard     # Global rankings
GET /api/rankings/weekly          # Weekly rankings
GET /api/rankings/monthly         # Monthly rankings
```

---

## 🔄 WebSocket Events

| Direction | Event | Description |
|:----------|:------|:------------|
| → Server | `battle:join` | Join battle room |
| → Server | `battle:leave` | Leave battle room |
| → Server | `match:join` | Join matchmaking |
| ← Client | `battle:started` | Battle has started |
| ← Client | `battle:player_joined` | Player joined |
| ← Client | `battle:player_left` | Player left |
| ← Client | `submission:result` | Code judged |
| ← Client | `match:found` | Match found |

---

## 🚢 Deployment

### Vercel (Frontend)

```bash
# 1. Import repo on vercel.com
# 2. Configure:
#    - Root Directory: apps/web
#    - Build Command: cd ../.. && npx turbo build --filter=@codeclash/web
# 3. Add environment variables
# 4. Deploy
```

### Railway (Backend)

```bash
# 1. Import repo on railway.app
# 2. Configure:
#    - Root Directory: apps/api
#    - Build: npm install && npx prisma generate && npm run build
#    - Start: node dist/index.js
# 3. Add environment variables
# 4. Deploy
```

### Neon (PostgreSQL)

```bash
# 1. Create project on neon.tech
# 2. Copy connection URL
# 3. Add to DATABASE_URL
```

### Upstash (Redis)

```bash
# 1. Create database on upstash.com
# 2. Copy URL
# 3. Add to REDIS_URL
```

---

## ⚙️ Environment Variables

```env
# === DATABASE (Neon) ===
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/codeclash?sslmode=require"

# === REDIS (Upstash) ===
REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"

# === JWT ===
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"

# === OAUTH - GOOGLE ===
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/callback/google"

# === OAUTH - GITHUB ===
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:3000/auth/callback/github"

# === APP URLS ===
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Make your changes
# 4. Run tests
npm run lint

# 5. Commit your changes
git commit -m 'feat: add amazing feature'

# 6. Push to the branch
git push origin feature/amazing-feature

# 7. Open a Pull Request
```

### Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Code style (no logic change)
refactor: Code refactoring
test:     Adding tests
chore:    Build process / dependencies
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by developers, for developers**

[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com)

</div>
