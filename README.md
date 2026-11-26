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

Integration tests default to `postgresql://postgres:postgres@localhost:5432/estate_ai_test`
(override with `TEST_DATABASE_URL`) and refuse to run against a database
whose name does not contain `test`, because they truncate every table.

## Workflow

1. **Triage** classifies the enquiry, extracts entities and links it to a property.
2. **Draft** generates a reply; suggested viewing slots are suggestions only.
3. **Accept** approves the (optionally edited) draft. Only approved text can be sent.
4. **Send** previews and sends the approved reply. By default this is simulated:
   the reply is recorded in the outbox and nothing leaves the system. Set
   `EMAIL_TRANSPORT=smtp` and run `docker compose up -d maildev` to deliver to
   the local MailDev inbox at http://localhost:1080.
5. **Book** confirms a specific slot. Booking runs in one transaction and the
   database rejects a second confirmed booking for the same slot.

Every step records a timestamped event; `/analytics` derives response times,
conversion and other metrics from those records.

## Development Environment Setup

1. Repo & Version Control (Git repo + SSH Authentication set up)
2. Node & Packagage Management (Node installed, PNPM as package manager)
3. Local Infrastructure (Docker running Postgres DB & MailDev - working backend)
4. Code Quality & Tooling (ESLint + Prettier + formatting rules)
5. Pre-commit Automation (Husky hooks + auto-fix & format for staged files)
6. Continuous Integration (Check linting on every push)
7. Documentation & Repo Structure (.env template + Organised folders)
