# Estate AI Workflow (MVP)

An AI-powered workflow that triages inbound enquiries, auto-drafts agent-quality replies, and offers one‑click slotting into a smart viewing schedule, so small estate/letting agencies save hours per week while improving response times and client satisfaction.

## Quick Start

Requires Node 20+, pnpm 10 and Docker.

```bash
pnpm install                       # also generates the Prisma client
docker compose up -d db            # Postgres on localhost:5432
cp .env.example apps/web/.env
pnpm db:migrate && pnpm db:seed
pnpm dev                           # http://localhost:3000
```

| Command          | What it does                     |
| ---------------- | -------------------------------- |
| `pnpm lint`      | ESLint (fails on warnings)       |
| `pnpm typecheck` | TypeScript, no emit              |
| `pnpm test`      | Vitest unit and regression tests |
| `pnpm build`     | Production build                 |

Set `PRISMA_LOG_QUERIES=1` to print SQL queries while debugging.

## Development Environment Setup

1. Repo & Version Control (Git repo + SSH Authentication set up)
2. Node & Packagage Management (Node installed, PNPM as package manager)
3. Local Infrastructure (Docker running Postgres DB & MailDev - working backend)
4. Code Quality & Tooling (ESLint + Prettier + formatting rules)
5. Pre-commit Automation (Husky hooks + auto-fix & format for staged files)
6. Continuous Integration (Check linting on every push)
7. Documentation & Repo Structure (.env template + Organised folders)
