# Demo script (about 10 minutes)

A walkthrough of the full workflow using the seeded data. Run
`pnpm db:seed` shortly before presenting so that every viewing slot is in
the future.

## 1. The problem (1 minute)

Small letting agencies get a steady stream of enquiries by email, web form
and phone: viewing requests, valuations, maintenance issues and spam. Each
one needs reading, routing, a reply and often a viewing booked. Slow replies
lose tenants and landlords. This app does the routine work and leaves the
decisions to the agent.

## 2. Inbox (1 minute)

- Open `/`. Point out the summary cards: awaiting reply, needs review and
  viewings booked.
- Filter by **Needs review**. Ben Okafor's pets question is flagged because
  the rules aren't confident about it.
- Search for `Baker` to show that search covers names, messages and
  properties.

## 3. A new enquiry, end to end (4 minutes)

1. Click **New enquiry** and enter:
   - Name: `Alex Morgan`
   - Email: `alex@example.com`
   - Message: `Hi, is HAC-04 still available? Could I come and see it this week?`
2. Save. It is triaged immediately: intent **Viewing**, linked to **HAC-04**,
   with the confidence shown.
3. Open the enquiry and click **Draft**. The reply offers the
   property's real available slots. Point out the **Suggestions only** note:
   offering a slot doesn't book it.
4. Edit a line of the draft and **Accept**. The status becomes `DRAFTED`.
5. Click **Preview and send**, check the email, then **Send (simulated)**. Sending is simulated: the reply goes
   to the outbox and nothing leaves the system.
6. In **Booking**, pick a slot and click **Confirm viewing**. The status becomes `SCHEDULED`.
7. Optional: open a second browser tab and try to book the same slot for
   another enquiry. It is refused with a clear message, because the database
   enforces one confirmed booking per slot.

## 4. AI with guardrails (2 minutes)

Only if `ANTHROPIC_API_KEY` is set. Otherwise, explain this part from the
code.

- **Re-triage** Ben Okafor's enquiry. The rules weren't sure, so the model
  classifies it, and the triage method changes to **AI**.
- Generate a draft. It is labelled **AI draft** and personalised.
- Explain the guardrails:
  - model output must match a schema;
  - entities are kept only if they appear in the message;
  - a draft that mentions a time that isn't a real slot, claims a booking or
    contains placeholders is replaced by the template;
  - every failure falls back to the rules.
- Mention the eval: on 30 labelled cases the rules alone score 24/30, and
  every miss is low-confidence, so those are exactly the cases sent to the
  model.

## 5. Analytics (1 minute)

- Open `/analytics`. First-response time, reply rate, viewing conversion and
  the share of drafts sent unedited are all computed from stored event
  timestamps, not estimated.
- Switch between **Last 7 days** and **Last 30 days**.

## 6. Engineering (1 minute)

- **Stack:** Next.js 16, TypeScript, Prisma and Postgres, with Zod schemas
  shared between client and server.
- **Bookings:** one transaction with row locking and a unique index, so
  double-booking is impossible even under concurrent requests.
- **Tests:**
  - unit tests;
  - integration tests against a real Postgres, including concurrent booking;
  - a labelled eval set.
- **CI:** every push runs migrations, a schema drift check, lint, type-check,
  tests and a production build.

## Likely questions

- **Why not use the model for everything?** Cost, latency and
  explainability. The rules handle the clear cases instantly and for free,
  and the app still works if the model is down or no key is set.
- **What stops the AI from sending something wrong?** It can't send
  anything. Every reply needs an agent's approval, and drafts are checked
  before they are shown.
- **How would this scale?**
  - Add a real inbox integration (an email webhook) that feeds
    `POST /api/enquiries`.
  - Add authentication per agency.
  - Move sending to a queue.
- **What would you build next?**
  - Calendar sync for viewing slots.
  - Confirmation and reminder emails for bookings.
  - Agent accounts and roles.
