# Deploying a protected demo

The app is a standard Next.js server with a PostgreSQL database, so it runs
on any Node host. This guide uses Vercel with a managed Postgres provider
such as Neon or Supabase, because both have free tiers. A demo deployment
should always be password-protected and should never send real email.

## 1. Create the database

1. Create a Postgres 16 database with your provider and copy its connection
   string.
2. From your machine, apply the migrations and load the demo data:

   ```bash
   DATABASE_URL="postgresql://…/estate_demo" pnpm db:migrate
   DATABASE_URL="postgresql://…/estate_demo" SEED_CONFIRM_DATABASE=estate_demo pnpm db:seed
   ```

   The seed **deletes all existing enquiries, slots and properties**. It
   refuses to run against any non-local database unless
   `SEED_CONFIRM_DATABASE` repeats that database's name, so a mistyped or
   production URL can't be wiped by accident. Use a dedicated demo database.

## 2. Create the Vercel project

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `apps/web`. Vercel detects Next.js and pnpm from
   the lockfile, and `postinstall` generates the Prisma client.
3. Add these environment variables:

| Variable            | Value                             | Notes                                          |
| ------------------- | --------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`      | the connection string from step 1 | Use the pooled URL if your provider offers one |
| `DEMO_USER`         | e.g. `demo`                       | Turns on password protection                   |
| `DEMO_PASSWORD`     | a long random password            | Share it only with reviewers                   |
| `EMAIL_TRANSPORT`   | `outbox`                          | Replies are recorded, never sent               |
| `ANTHROPIC_API_KEY` | optional                          | Leave unset to demo the rule engine only       |
| `AI_MODE`           | `hybrid` or `rules`               | `rules` keeps the demo free and deterministic  |

4. Deploy. When `DEMO_USER` and `DEMO_PASSWORD` are set, every page and API
   route asks for them through the browser's sign-in prompt (`proxy.ts`).

   Protection fails closed. If only one of the two is set, or if neither is
   set on a production server, every request gets a `503` and the reason is
   logged. To serve the app publicly on purpose, set
   `ALLOW_PUBLIC_ACCESS=true` instead.

## 3. Check it

- Open the deployment URL. You should be asked for the demo credentials.
- The inbox should show 14 seeded enquiries, and `/analytics` should show
  response times and conversion.
- Open an enquiry, generate a draft, approve it, preview and send it, then
  book a slot.
- Run `curl -i https://<your-app>/api/enquiries` without credentials. It
  should return `401`.

## Resetting the demo

Run `pnpm db:seed` against the demo database again, with
`SEED_CONFIRM_DATABASE`, as in step 1. Slot times
are relative to the moment you seed, so re-seed shortly before a
presentation to keep the viewing slots in the future.

## Cost and safety

- With `AI_MODE=rules` the demo costs nothing to run beyond hosting.
- If you enable the AI engine, set a monthly spend limit for the API key.
  Password protection stops strangers from running up usage.
- Keep `EMAIL_TRANSPORT=outbox`. The SMTP transport refuses non-local hosts
  unless `EMAIL_ALLOW_REMOTE_SMTP=true` is set explicitly.
