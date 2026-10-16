# EnglishFlow AI — Deployment Plan

_Status: planned. Last updated 2026-10-16. Nothing is deployed yet. The Neon database exists and is used for local development (a separate production branch/database is recommended before launch). Steps will be verified and updated when the first deployment happens._

## 1. Recommended setup (beginner-friendly, low cost)

| Layer | Service | Why |
|---|---|---|
| App hosting + public URL | **Vercel** | Built by the Next.js team. Connect a GitHub repo and every push deploys. Free `https://<project>.vercel.app` URL with HTTPS. Preview URL for every branch/PR. |
| Database (persistent storage) | **Neon** (managed PostgreSQL) | Free tier, persistent, automatic backups/restore window (check plan limits), branches for preview environments, standard Postgres connection string. |
| Email | **Resend** | Verification and password-reset emails. |
| AI | **Anthropic API** | Tutor and AI feedback (Milestone 6). |
| File storage | **Vercel Blob** or **Cloudflare R2** | Audio files (Milestone 7). |
| Error monitoring | **Sentry** | Production error tracking (Milestone 8). |

**Why not a VPS / Docker server?** It means more to learn and maintain (OS updates, TLS, process manager, backups). Vercel + Neon gives a real public URL and persistent storage with no server management.

### Important caveats
- **Vercel Hobby (free) is for non-commercial use only.** Move to Vercel Pro before charging learners or running the site commercially.
- **Free tiers have limits** (database size and compute hours, function duration, bandwidth, email volume). Check each provider's current pricing page at signup. This document doesn't quote paid prices it hasn't verified.
- **Serverless functions have execution time limits.** Tutor responses stream to stay well within them. Long batch jobs (like audio generation) run as local scripts, not in web requests.

### Alternative
If you prefer one dashboard for app and database, **Railway** or **Render** can host the Next.js app and a Postgres database together. Usage-based pricing applies, so check current plans. The app is portable either way (standard Next.js + standard Postgres).

## 2. Environments

| Environment | URL | Database | Purpose |
|---|---|---|---|
| Local development | `http://localhost:3000` | Neon `dev` branch (or local Postgres via Docker) | Day-to-day work |
| Test (CI) | — | Ephemeral Postgres service in GitHub Actions | Automated tests |
| Preview | `*.vercel.app` per PR | Neon preview branch (or shared `preview` branch) | Review changes before merging |
| Production | `<project>.vercel.app` → custom domain later | Neon `main` branch | Real learners |

Production and development **never share a database**.

## 3. Environment variables

Documented in `.env.example` (names and descriptions only, never real values). Set real values in `.env.local` locally (git-ignored) and in Vercel → Project → Settings → Environment Variables.

| Variable | Required from | Description |
|---|---|---|
| `DATABASE_URL` | M2 | Pooled Postgres connection string (Neon) used by the app |
| `DIRECT_URL` | M2 | Direct (non-pooled) connection string used by Prisma migrations |
| `BETTER_AUTH_SECRET` | M2 | Long random secret for signing sessions |
| `BETTER_AUTH_URL` | M2 | Public base URL of the app (e.g. `https://englishflow.vercel.app`). Must exactly match the address learners use, or sign-in requests are rejected as "invalid origin". |
| `RESEND_API_KEY` | M2 | Email sending (optional in dev, where emails log to console) |
| `EMAIL_FROM` | M2 | Sender address (verified domain in production) |
| `AI_PROVIDER` | M6 | `anthropic` or empty (empty = AI disabled, setup message shown) |
| `ANTHROPIC_API_KEY` | M6 | Server-only API key |
| `AI_MODEL` | M6 | Tutor/feedback model, e.g. `claude-opus-5-5` (or `claude-sonnet-5-5` / `claude-haiku-5-5` for lower cost) |
| `AI_MODEL_FAST` | M6 | Optional cheaper model for simple generation |
| `AI_DAILY_TOKEN_BUDGET_PER_USER` | M6 | Per-user daily cap |
| `AI_REQUESTS_PER_MINUTE_PER_USER` | M6 | Per-user rate cap |
| `BLOB_READ_WRITE_TOKEN` (or R2 keys) | M7 | Object storage access |
| `SENTRY_DSN` | M8 | Error monitoring |

Never prefix a secret with `NEXT_PUBLIC_`. That exposes it to the browser.

## 4. First deployment (step by step)

These steps will be executed and verified when the corresponding milestone is reached.

**After Milestone 1 (static public site, no database):**
1. Create a GitHub account (if needed) and a new private repository. Push the project.
2. Create a Vercel account and sign in with GitHub.
3. Vercel → Add New → Project → import the repository. Framework preset: Next.js. Deploy.
4. Open the generated `https://<project>.vercel.app` URL and check the public pages.

**After Milestone 2 (database and accounts):**
1. Create a Neon account → new project (pick the region closest to most learners and to the Vercel function region).
2. Copy the pooled connection string to `DATABASE_URL` and the direct string to `DIRECT_URL` (locally in `.env.local` and in Vercel production env vars).
3. Generate `BETTER_AUTH_SECRET` (for example, `npx @better-auth/cli secret` or `openssl rand -base64 32`). Set `BETTER_AUTH_URL` to the production URL.
4. Create a Resend account and API key. Verify a sending domain before real users sign up.
5. Vercel build command: `npm run db:deploy && npm run build`, so migrations apply on each production deploy (`npm install` runs `prisma generate` automatically via `postinstall`). Never use `prisma migrate dev` against production.
6. Run the seed script against production once (`npm run db:seed`). It's idempotent, so re-running updates curriculum content without touching learner data.
7. Redeploy. Sign up with a real email and verify the full flow on the live URL.

**After Milestone 6:** add `AI_PROVIDER`, `ANTHROPIC_API_KEY` and `AI_MODEL` in Vercel. Set a monthly spend limit in the Anthropic Console.

**Optional custom domain:** buy a domain (~$10–15/year), add it in Vercel → Domains, update DNS as instructed, update `BETTER_AUTH_URL` and the email sender domain.

## 5. Database operations
- **Migrations:** created locally with `prisma migrate dev`, committed to git, applied in production by `prisma migrate deploy` during the build.
- **Seeding:** curriculum lives in `content/` and is loaded by `prisma/seed.ts` with upserts keyed on stable slugs/IDs. Learner tables are never touched by the seed.
- **Backups:** confirm the restore window on the chosen Neon plan before launch, and test a restore to a branch once.
- **Destructive changes:** use expand-then-contract migrations (add new column → backfill → switch code → remove old column) so deploys don't break live sessions.

## 6. CI/CD
- GitHub Actions on every push/PR: install → lint → typecheck → unit + integration tests (Postgres service container) → build → Playwright e2e (mobile + desktop) with axe.
- Vercel deploys previews for PRs and production from the `main` branch.
- Protect `main`: require CI to pass before merging.

## 7. Monitoring and maintenance
- Vercel dashboard for deploys, function logs and usage.
- Neon dashboard for storage and compute usage.
- Anthropic Console for token usage and spend limits.
- Sentry (M8) for runtime errors, with request bodies and learner text scrubbed.
- Monthly: check free-tier usage, run `npm audit`, review dependency updates.

## 8. Cost summary

| Stage | Monthly cost |
|---|---|
| Development and early public testing | **$0** hosting (Vercel Hobby + Neon free + Resend free) + AI usage |
| Low-traffic public launch, non-commercial | $0 hosting + AI usage (roughly $0.60–$22 per 1,000 tutor turns depending on model; see [PROJECT_PLAN.md §5](PROJECT_PLAN.md#5-accounts-api-keys-services-and-costs)) + optional domain (~$1/month) |
| Commercial / paid learners | Vercel Pro and likely a paid Neon tier (check current prices) + AI usage + Sentry/email as volume grows |

## 9. Pre-launch checklist
See the full production-ready definition in [PROJECT_PLAN.md §7](PROJECT_PLAN.md#7-definition-of-production-ready). Deployment-specific items:
- [ ] Production env vars set. No secrets in the repo or client bundle.
- [ ] `prisma migrate deploy` succeeds in the production build.
- [ ] Seed applied. Curriculum content status shown correctly.
- [ ] Sign-up, email verification and password reset work on the live URL.
- [ ] HTTPS on custom domain (if used). `BETTER_AUTH_URL` matches.
- [ ] Anthropic spend limit set. Per-user AI budgets configured.
- [ ] Backup restore tested once.
- [ ] Sentry receiving errors with scrubbing verified.
- [ ] Vercel plan matches usage (Pro if commercial).
