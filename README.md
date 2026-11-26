# Estate AI Workflow

[![CI](https://github.com/KevinTyb/estate-ai-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/KevinTyb/estate-ai-workflow/actions/workflows/ci.yml)

An enquiry workflow for UK estate and letting agencies. It triages incoming
enquiries, prepares the next action, drafts a reply for an agent to review,
and books viewings without double-booking. AI speeds up the routine work,
and an agent approves every reply and confirms every booking.

```
Enquiry → Triage → Prepare next action → Draft reply → Agent approves → Send / Book → Analytics
```

## Features

- **Triage**: classifies each enquiry as viewing, valuation, maintenance,
  general or spam. It also extracts contact details, property references,
  postcodes, dates and budget, then links the enquiry to a known property.
- **Hybrid AI engine**: a deterministic rule engine always runs first. A
  language model is consulted only when the rules are unsure. Model output
  is schema-validated and grounded in the message text, and every failure
  falls back to the rules. Uncertain results are flagged **Needs review**.
- **Draft replies**: drafts are personalised and safety-checked. They may only
  offer real, available viewing slots and never claim a booking. If a check
  fails, the reply falls back to a template.
- **Human approval**: nothing is sent or booked automatically. Agents edit and
  approve drafts, preview the email, then send it.
- **Bookings**: a viewing is booked in a single transaction. The database
  itself rejects a second confirmed booking for the same slot, and
  suggesting a slot never books it.
- **Simulated sending**: by default, replies are recorded in an outbox and
  nothing leaves the system. Optionally, they can be relayed to a local
  MailDev inbox.
- **Analytics**: first-response time, reply rate, viewing conversion and draft
  edit rate are all computed from recorded events and timestamps, not from
  estimates.
- **Intake**: agents log enquiries received by phone, email or the website
  (`POST /api/enquiries`), and each one is triaged as it arrives.
- **Inbox**: search, filters, summary cards, a detail panel for each enquiry,
  and keyboard access.
- **Protected demo**: set `DEMO_USER` and `DEMO_PASSWORD` to put the whole app
  behind a password when hosting it.

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| App        | Next.js 16 (App Router), React 19, TypeScript                 |
| UI         | Tailwind CSS 4, shadcn/ui (Radix)                             |
| Data       | PostgreSQL 16, Prisma 6                                       |
| Validation | Zod 4, shared between API and client (`packages/schema`)      |
| AI         | LLM structured outputs via the Anthropic SDK (optional)       |
| Testing    | Vitest unit tests, Postgres integration tests, labelled evals |
| Tooling    | pnpm workspaces, ESLint, Prettier, Husky, commitlint          |
| CI         | GitHub Actions                                                |

## Quick start

Requires Node 20+, pnpm 10 and Docker.

```bash
pnpm install                       # also generates the Prisma client
docker compose up -d db            # Postgres on localhost:5432
cp .env.example apps/web/.env
pnpm db:migrate && pnpm db:seed    # schema + demo data
pnpm dev                           # http://localhost:3000
```

The demo seed loads 14 enquiries at every stage of the workflow, with three
weeks of history, so the analytics page has data straight away.

The app works fully without an API key. To enable the AI engine, set
`ANTHROPIC_API_KEY` in `apps/web/.env`. See [AI engine](#ai-engine).

## Commands

| Command                         | What it does                                      |
| ------------------------------- | ------------------------------------------------- |
| `pnpm dev`                      | Start the app in development mode                 |
| `pnpm lint`                     | ESLint (fails on warnings)                        |
| `pnpm typecheck`                | TypeScript, no emit                               |
| `pnpm test`                     | Unit and regression tests                         |
| `pnpm test:integration`         | Database tests against a `*_test` Postgres        |
| `pnpm build`                    | Production build                                  |
| `pnpm db:migrate`               | Apply Prisma migrations                           |
| `pnpm db:seed`                  | Reset the demo data                               |
| `pnpm --filter web eval:triage` | Score rules vs hybrid triage on 30 labelled cases |

Integration tests default to
`postgresql://postgres:postgres@localhost:5432/estate_ai_test` (override
with `TEST_DATABASE_URL`). They truncate every table, so they refuse to run
against a database whose name doesn't contain `test`.

## How the workflow works

1. **Triage** classifies the enquiry, extracts entities and links it to a
   property.
2. **Draft** generates a reply. Any viewing slots it mentions are suggestions
   only.
3. **Approve**: the agent accepts the draft, optionally after editing it.
   Only approved text can be sent.
4. **Send** shows a preview, then sends. Sending is simulated by default (see
   below).
5. **Book**: the agent confirms one specific slot, and the enquiry moves to
   `SCHEDULED`.
6. **Analytics**: every step records a timestamped event, and `/analytics`
   derives its metrics from those events.

To deliver replies to a local inbox, set `EMAIL_TRANSPORT=smtp` and run
`docker compose up -d maildev`. Emails then appear at http://localhost:1080.

## AI engine

- **Triage**: confident rule results (a specific intent at 80% or more) are
  used as they are. Otherwise the model classifies the enquiry into a
  Zod-validated schema. Extracted entities are kept only if they appear in
  the message. Errors, refusals and invalid output fall back to the rules.
- **Drafting**: the model personalises the reply. The draft is rejected in
  favour of the template if it:
  - mentions a time that isn't a listed slot;
  - claims a viewing is booked;
  - contains placeholders.
- **Safety**: customer text is passed to the model as delimited, untrusted
  data. Spam is never sent to the model.
- **Measured, not assumed**: on 30 labelled cases the rules alone score
  24/30. Every miss is a low-confidence result, which is exactly what the
  hybrid engine hands to the model.

`AI_MODE=rules` turns the AI path off. `ANTHROPIC_MODEL` selects the model.

## Documentation

- [Architecture](docs/architecture.md): data model, request flow and key
  design decisions
- [Deployment](docs/deployment.md): running a password-protected demo
- [Demo script](docs/demo-script.md): a 10-minute walkthrough

## Project structure

```
apps/web/
  app/            pages and API route handlers
  components/     inbox, detail panel and UI primitives
  lib/            triage, drafting, AI, bookings, email, analytics
  prisma/         schema, migrations and demo seed
  tests/          integration tests (Postgres)
  evals/          labelled triage cases and scoring
packages/schema/  Zod schemas shared by the API and client
```

## Licence

MIT
