# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

スポット社労士くん「年度更新・算定基礎届」 order-intake form. A single-purpose Next.js
app where accounting firms / SMEs submit a request for the firm to process their
社会保険 paperwork (年度更新 and/or 算定基礎届) for one or more 顧問先 (client companies),
uploading the relevant documents. It is deployed standalone on Vercel and embedded via
`<iframe>` into a WordPress page on `spot-s.or.jp`. The UI and all user-facing copy are in
Japanese; keep that convention when editing.

- Production (Vercel direct): https://nendosantei-form.vercel.app/
- Embedded (public entry): https://spot-s.or.jp/nendosanteikaikeiform
- Admin dashboard: https://nendosantei-form.vercel.app/admin

## Commands

```bash
npm install
cp .env.local.example .env.local   # fill in values (see "Environment" below)
npm run dev      # Next.js dev server (turbopack) at http://localhost:3000
npm run build    # production build — run this to type-check before pushing
npm run lint     # eslint (next/core-web-vitals + next/typescript)

node scripts/gen-template.mjs   # regenerate the bulk-import Excel template at
                                # public/templates/nendosantei-template.xlsx
```

There is **no test runner wired up**. `@playwright/test` is a devDependency and `e2e/` is
excluded in `tsconfig.json` / `eslint.config.mjs`, but no `e2e/` directory or `test` script
currently exists. "Verify" means `npm run build` + manual flow testing against a real
Supabase + Resend setup. Treat `npm run build` (full type-check) as the gate before pushing.

## Architecture

Next.js 15 App Router (React 19) + Tailwind 4. All server logic lives in route handlers
under `src/app/api/*` running on the Node.js runtime (`export const runtime = 'nodejs'`).
There is no ORM — Supabase is accessed directly via `@supabase/supabase-js`.

### Public form (one component, many routes)
Every public page renders the **same** component `src/components/NendosanteiFormSME.tsx`,
differing only by a `plan` prop. Routing → plan:
- `/` → `plan="middle"` (¥19,800)
- `/sme` → `middle`, `/sme/standard` → `standard` (¥23,100)
- `/firm` → `accountant` (¥9,900), `noindex`, unlinked / direct-URL only

Plan pricing is the single source of truth in `src/lib/plans.ts` (`PRICE_PLANS`). The form
always submits `formType: 'sme'`. The older `src/components/NendosanteiForm.tsx`
(the original multi-顧問先 "firm" form) is **no longer referenced by any route** — legacy
`form_type='firm'` rows are filtered out of the admin list. Don't wire it back up without intent.

### Submission flow (the core path — `src/app/api/submit/route.ts`)
1. **File upload is two-phase and goes direct to Supabase Storage, not through the API body.**
   Client calls `POST /api/upload-token` → server issues signed *upload* URLs into
   `pending/<tempId>/...` in the private `application-files` bucket. Client uploads files
   directly to Storage, then submits the form JSON carrying only the `storagePath`s.
2. `POST /api/submit` validates with `applicationSchema` (`src/lib/validation.ts`), enforces
   per-顧問先 file requirements (年度更新 ⇒ 労保申告書 `roho`; 算定 ⇒ `santei`), then:
   - inserts `applications` → `application_contacts` (rows keyed by `row_index`),
   - **moves** each pending file to `applications/<appId>/<contactId>/...` and inserts
     `application_files`, generating 1-year signed URLs that get embedded in the admin email,
   - sends two emails via Resend, logs each to `email_logs`, records the idempotency key,
   - fires the Google Sheets webhook.
   The handler is best-effort/resilient: email or Sheets failures are caught and logged
   (and trigger fallback alert emails) rather than failing the whole submission.
3. **Idempotency**: client sends `idempotencyKey`; a matching row in `idempotency_keys`
   short-circuits with `{ duplicate: true }` so retries within ~5 min don't double-insert.

### Two independent deadlines (do not conflate)
Defined in `src/lib/validation.ts`:
- `ORDER_DEADLINE` (default 6/15): *soft*. After this, the UI requires the
  "期限超過の同意" checkbox (`deadlineAcknowledged`). Submission still allowed.
- `FORM_HARD_DEADLINE` (default 7/10): *hard*. After this the form shows a "受付終了" screen
  **and** `POST /api/submit` rejects with HTTP 410. Server reads the `FORM_HARD_DEADLINE` env
  var; the client uses `NEXT_PUBLIC_FORM_HARD_DEADLINE`. `FORM_ENABLED=false` is a manual
  kill-switch enforced server-side. To roll over to a new fiscal year, update the two
  constants in `validation.ts` (the env vars override at runtime).

### Admin (`/admin`, `src/app/api/admin/*`)
- Auth: cookie-based JWT session. `src/middleware.ts` guards `/api/admin/*` (except
  `login`/`logout`/`me`) by verifying the `auth_session` cookie against `JWT_SECRET`.
  `src/lib/auth-server.ts` checks credentials against a Supabase `auth_users` table (bcrypt
  hashes), rate-limits via an `auth_attempts` table (10 fails / 15 min lockout), and signs
  an 8-hour `jose` JWT. **Note:** this DB-backed auth supersedes the older static
  `ADMIN_PASSWORD` mentioned in `DEPLOY.md`/`.env.local.example`. `JWT_SECRET`, `auth_users`,
  and `auth_attempts` are **not** documented in `.env.local.example` and have **no migration
  file** — they were provisioned manually in Supabase. Keep this in mind before assuming env
  docs are complete.
- `GET /api/admin/list` aggregates orders + computes revenue from plan pricing, excluding
  legacy `form_type='firm'` rows. `POST /api/admin/import` ingests the bulk Excel template
  (`src/lib/import-xlsx.ts`, tolerant header/boolean parsing) to create orders for
  paper/email submissions. In-memory rate limiting via `src/lib/rate-limit.ts`.

### Conventions worth knowing
- **Always read env vars through `getEnv()` (`src/lib/env.ts`), which trims whitespace** —
  Vercel CLI has historically injected trailing newlines into secrets.
- `getServiceClient()` (`src/lib/supabase.ts`) returns the cached `service_role` client.
  RLS denies `anon` on all tables; all writes go through API routes using service role.
- `src/lib/types.ts` is client/form shapes; `src/lib/validation.ts` is the wire/server
  contract (Zod) and the deadline/price source of truth.
- Path alias `@/*` → `src/*`.

## Data & integrations

- **Supabase** (project ref `sslrangrwlawqhnxynno`, ap-northeast-1): tables `applications`,
  `application_contacts`, `application_files`, `email_logs`, `idempotency_keys` (+ manually
  created `auth_users`, `auth_attempts`); private Storage bucket `application-files`
  (5 MB/file, PDF/Excel/PNG/JPEG). SQL in `supabase/migrations/` is **append-only and applied
  by hand** in the Supabase dashboard (note migrations `005_add_plan.sql` and
  `005_form_type.sql` share a number — ordering is by intent, not filename). There is no
  automated migration tooling.
- **Resend** sends from `info@spot-s.jp` (`FROM_ADDRESS` in `src/lib/email-templates.ts`):
  a thanks email to the applicant and an internal notification (always CC's `info@spot-s.jp`).
  On send failure, a fallback alert goes to the first `ADMIN_NOTIFY_CC` address.
- **Google Sheets**: `src/app/api/submit/route.ts` POSTs each order to a GAS Web App
  (`GAS_WEBHOOK_URL`). The Apps Script source + deploy steps live in `docs/gas-webhook.gs`
  (it appends to a fixed spreadsheet). Redeploy the GAS Web App when that file changes.

## Environment

See `.env.local.example` and the env table in `DEPLOY.md`. Required at minimum:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `ADMIN_NOTIFY_EMAIL`, `ADMIN_NOTIFY_CC`, `NEXT_PUBLIC_SITE_URL`, and
**`JWT_SECRET`** (needed for admin auth but missing from the example file). Optional:
`FORM_ENABLED`, `FORM_HARD_DEADLINE` / `NEXT_PUBLIC_FORM_HARD_DEADLINE`, `GAS_WEBHOOK_URL`,
Sentry vars.

## Deploy & ops

Vercel project (team `e-GOV SPOTPORTAL`), pinned to region `hnd1` (`vercel.json`).
`next.config.ts` sets a `frame-ancestors` CSP restricting embedding to `spot-s.or.jp` and
bumps the Server Action body limit to 50 MB for file submissions.
**`DEPLOY.md` is the operational runbook** — deploy commands, the WordPress iframe snippet,
a weekly ops checklist (Resend DKIM, email-failure log, Storage quota, Sentry), and
troubleshooting (extend deadline, stop intake, fiscal-year rollover). Read it before any
production/ops change. Do not touch the separate production spot-s Firebase/Vercel/DB — this
app runs on its own isolated Vercel project + Supabase.
