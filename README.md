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

## AI engine (optional)

The app works fully without an API key, on the deterministic rule engine.
Add `ANTHROPIC_API_KEY` to `apps/web/.env` to enable the hybrid engine:

- **Triage**: the rules run first. Confident rule results (a specific intent
  at 80%+) are used as-is; otherwise the language model classifies the enquiry with a
  Zod-validated structured output. Entities the model returns are kept only
  if they literally appear in the message. Model errors, refusals and invalid
  output fall back to the rules. Low-confidence, ambiguous or disputed
  results are flagged **Needs review**.
- **Drafting**: the model personalises the reply, then the draft is checked:
  it may only mention listed viewing slots, may not claim a viewing is
  booked, and may not contain placeholders. Otherwise the template is used.
- **Human approval**: AI drafts are never sent or booked automatically; an
  agent approves and sends every reply and confirms every booking.

`AI_MODE=rules` turns the AI path off; `ANTHROPIC_MODEL` picks the model
(default set in `.env.example`). Compare the engines on the labelled cases in
`apps/web/evals/` with `pnpm --filter web eval:triage` (the hybrid run calls
the API). On those 30 cases the rules alone score 24/30, and every miss is a
low-confidence result that the hybrid engine hands to the model.

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
