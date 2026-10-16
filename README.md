# EnglishFlow AI

An English-learning platform for learners from A1 (beginner) to C2 (proficient). It combines structured lessons, active recall, spaced repetition, skill practice and an AI tutor, with the goal of **independent ability**: understanding English, remembering it and producing it without help.

> **Status: Milestones 1–3 of 8 complete.**
> Public website, accounts, onboarding and settings, a structured A1–C2 curriculum with **8 complete A1 lessons**, 8 exercise types graded on the server, saved progress, and an approximate placement check. Spaced-repetition reviews, the dashboard and the AI tutor are **not built yet**. See [Completed features](#completed-features) and [Known limitations](#known-limitations).

## Run it on your computer

You need **Node.js 22 or newer** ([download](https://nodejs.org/)) and a PostgreSQL database. A free [Neon](https://neon.tech) project works.

1. **Install dependencies** (first time only):
   ```bash
   cd englishflow-ai
   npm install
   ```
2. **Create your settings file.** Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL`: Neon → Connect → pooling **on** → copy
   - `DIRECT_URL`: Neon → Connect → pooling **off** → copy
   - `BETTER_AUTH_SECRET`: any long random string (e.g. `openssl rand -base64 32`)
   - `BETTER_AUTH_URL`: `http://localhost:3000`

   Use `sslmode=verify-full` at the end of both database addresses. `.env.local` is private and git-ignored.
3. **Create the database tables and load the lessons:**
   ```bash
   npm run db:deploy
   npm run db:seed
   ```
   The seed is safe to run again at any time: it updates content and never touches learners' records.
4. **Start the site:**
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000**. Stop with `Ctrl + C`.

Without an email provider configured, verification and password-reset emails are **printed in the terminal** where `npm run dev` runs, so you can copy the link from there.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm run lint` / `typecheck` / `format:check` | Code checks |
| `npm test` | Unit tests (no database needed) |
| `npm run test:integration` | Database tests. They use an isolated `englishflow_test` schema and never touch your development data. |
| `npm run test:e2e` | Browser tests at desktop and phone sizes, with automated accessibility checks. Run `npm run build` first; first time, `npx playwright install chromium`. They create throwaway `e2e+…@example.test` accounts in your development database and delete them afterwards. |
| `npm run db:migrate` | Create a new migration after changing `prisma/schema.prisma` (development only) |
| `npm run db:deploy` | Apply migrations (used in production too) |
| `npm run db:seed` | Load or update curriculum content from `content/` (idempotent; restart a running server afterwards to see changes) |
| `npm run db:studio` | Browse the database in your browser |

All checks run in GitHub Actions on every push (`.github/workflows/ci.yml`), using a throwaway Postgres database.

## Tech stack

Next.js 16.4 (App Router, Turbopack, Cache Components) · React 19.3 · TypeScript 5.9 · Tailwind CSS 4.3 · Radix UI · PostgreSQL (Neon) · Prisma 7.10 with the `pg` driver adapter · Better Auth 1.7 · Zod 4 · Resend (email) · Vitest 5 · Playwright 1.64 + axe-core. All versions are pinned exactly in `package.json`.

Planned: Anthropic API for the AI tutor (Milestone 6). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project structure

```
docs/                        planning documents (start here)
prisma/schema.prisma         database schema; migrations in prisma/migrations/
src/app/(public)/            public website + sign-up, sign-in, password reset
content/                     curriculum source: lessons, exercises, concepts, placement items (Zod-validated)
src/app/app/                 learner application under /app (home, curriculum, lessons, placement, onboarding, settings)
src/app/api/auth/            Better Auth endpoints
src/proxy.ts                 redirects signed-out visitors away from /app (fast cookie check only)
src/server/auth/             auth configuration and requireUser() — the server-side gate for learner data
src/server/db/               Prisma client and repositories; every learner query is scoped to the signed-in user
src/server/email/            email sending (Resend, or terminal output in development)
src/lib/validation/          Zod schemas shared by forms and server actions
src/lib/modules.ts           registry of learner modules; navigation shows only "available" ones
src/lib/learning/            pure learning logic: grading, mastery rules, placement estimate, next lesson
src/components/exercises/    one input per exercise type + the shared exercise card
src/components/lesson/       lesson body renderer, practice lists, application task
src/components/              UI primitives, forms, layout, marketing sections
tests/unit/                  unit tests
tests/integration/           database tests (isolated schema)
e2e/                         Playwright browser and accessibility tests
```

## Documentation

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md): vision, gap analysis, costs, risks, production-ready definition
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): stack, structure, data model, learning engine, AI, security
- [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md): milestones and their status
- [docs/DEPLOYMENT_PLAN.md](docs/DEPLOYMENT_PLAN.md): hosting on Vercel + Neon, environment variables, costs

## Completed features

**Milestone 3: curriculum, exercises, grading, placement.** Verified on 2026-10-16 (see the roadmap for the exact test counts):
- Curriculum structure for A1–C2 (levels → modules → units → lessons, 50 concepts with prerequisites). **8 complete A1 lessons**; A2–C2 are outlined and shown as "coming soon".
- Each lesson: objective, explanation with examples, a rule, a table, common mistakes, guided practice (with hints), independent practice, memory check, an application task with model answers and a self-check list, and mastery criteria.
- 8 reusable exercise types: multiple choice, gap fill, sentence completion, matching, word order, error correction, transformation, short answer. All are keyboard accessible.
- **Grading happens on the server**, and answers never reach the browser before you check. Feedback targets specific mistakes; contractions (isn't = is not), spacing, capitals and punctuation don't count as errors; the answer is shown only on request.
- Progress is saved: every attempt, per-concept progress (exposure vs practice vs independent correct answers) and lesson completion. Opening a lesson is never counted as learning. Nothing is marked "mastered" yet, because that needs reviews on later days (Milestone 4).
- Placement check: 30 questions in grammar, vocabulary and reading, with "I don't know" and skip-a-part options. It gives an estimate with a per-skill profile; listening and speaking are clearly "not assessed". The learner chooses their starting level and can retake.
- Home page shows the next lesson, says honestly when the learner's level has no lessons yet, and offers the placement check.
- Multiple-choice options are shuffled in a stable order, so the position of the right answer never follows a pattern.

**Milestone 2: accounts, onboarding, profiles.** Verified on 2026-10-16 by lint, typecheck, formatting check, 27 unit tests, 7 integration tests against PostgreSQL, a production build and 91 browser tests (desktop and phone):
- Sign-up, sign-in, sign-out with email and password (Better Auth, database sessions, httpOnly cookies). Passwords need at least 10 characters.
- Password reset by email link. Email verification is enforced whenever an email provider is configured.
- Same error message for wrong password and unknown email, so accounts can't be discovered.
- Rate limits on sign-in, sign-up and reset requests, stored in the database so they work across servers.
- Onboarding: name, goals, self-reported level (clearly labelled as your own estimate, never as assessed), first language, daily study time, explanation style, time zone (auto-detected).
- Settings: edit profile and preferences, text size and reduced motion applied across the app, delete account (password confirmation, removes all records).
- Every learner page and server action checks the session on the server (`requireUser()`), and every database query is scoped to that user. Tested: one learner can't see or change another's data.
- Submit buttons stay disabled until the page is ready, and forms use POST, so a password can never end up in a URL.

**Milestone 1: foundation.** Public pages (home with a working sample exercise, features, how it works, curriculum with honest content status, pricing "not set yet", placeholder legal pages), design system, responsive navigation, accessibility (zero serious axe violations), CI.

## Known limitations

- **Lesson content was written with AI assistance and has not yet been reviewed by an English teacher.** Every lesson shows a "draft" note. Automated checks confirm that every listed answer is graded correctly, but a human review is still needed before launch.
- Only A1 has lessons (8 of 12 planned). A2–C2 are outlines.
- No spaced-repetition reviews, vocabulary notebook, mistake tracker, dashboard statistics or AI tutor yet (Milestones 4–8).
- The application ("Use it") task is self-checked and not saved; AI feedback on free writing comes in Milestone 6.
- The placement check is short (30 questions) and section-based, not adaptive. It is an estimate only.
- A not-written lesson URL shows "Page not found", but with HTTP status 200 rather than 404 (a Next.js streaming limitation; the page is marked noindex).
- **Email is not configured yet.** Until `RESEND_API_KEY` and `EMAIL_FROM` are set, email verification is not required and emails print to the terminal (development) or are not sent (production). Configure Resend before a public launch.
- The first request after the free Neon database has been idle can take a few seconds while it wakes up. From a development machine far from the database (here, Nigeria → US East), each database round trip takes about 250 ms; in production the app and database should run in the same region.
- Occasionally the database resets an idle connection. The app retries safe operations (reads, updates, upserts) once on a fresh connection; inserts are never retried, to avoid duplicates.
- Light theme only.
- Not deployed yet. See [docs/DEPLOYMENT_PLAN.md](docs/DEPLOYMENT_PLAN.md) §4.
- `npm audit` reports high-severity advisories in **development-only** lint tooling (`micromatch` via `eslint-config-next`). They don't ship to the website.
- The CI workflow hasn't run on GitHub yet (the repository isn't on GitHub yet).
- Privacy policy and terms are placeholders that need legal review.
