# EnglishFlow AI

An English-learning platform for learners from A1 (beginner) to C2 (proficient). It combines structured lessons, active recall, spaced repetition, skill practice and an AI tutor, with the goal of **independent ability**: understanding English, remembering it and producing it without help.

> **Status: Milestones 1–4 of 8 complete. Live at https://englishflow-ai.vercel.app**
> Accounts, a structured A1–C2 curriculum with **8 complete A1 lessons**, server-graded exercises, a placement check, **spaced-repetition reviews**, **48 A1 vocabulary words**, a notebook, a mistake tracker, a **Today dashboard with explained recommendations**, a study planner and challenges, and an **AI tutor** with AI-generated practice. The AI parts need an Anthropic API key; without one they show a clear setup message and everything else keeps working. See [Completed features](#completed-features) and [Known limitations](#known-limitations).

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

**Milestone 6: AI tutor, saved learning context, AI-generated practice.** Needs `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` on the server; without them every AI feature says plainly that it isn't set up.
- **AI tutor** (`/app/tutor`): saved conversations in 12 modes (explain, understand a sentence, conversation, correct my writing, vocabulary, quiz, help me remember, listening as a transcript, build sentences, challenge, explain my mistakes, review my learning). Replies stream in and are shown as safe, limited Markdown (no HTML). Concise or detailed answers per message; hint-first, guided or direct answers set in Settings. Every lesson links to it.
- The tutor adapts its English to the learner's level and follows teaching rules: hints before answers when chosen, explain why something is wrong, separate mistakes from acceptable alternatives, never invent rules, say when usage is regional or context-dependent, little praise.
- **Learning history is opt-in** (Settings → "Let the AI tutor use my learning history", off by default). When on, the tutor sees only a short summary: level and how it was set, the current lesson, the last 5 relevant answers, up to 3 recurring mistakes, recently saved words, topic counts and notes the learner has confirmed. Never ids, email or the full history.
- **Saved learning context** (`/app/settings/memory`): notes kept separately from chats (how I like to learn, mistakes I often make, goals). Learners add, edit and delete them. "Suggest things to remember" asks the AI for up to three notes, which are stored as **unconfirmed** and ignored until the learner confirms them.
- **More practice** (`/app/practice/more`, linked from lessons and the grammar page): new exercises for a topic you've started, at its level. The AI fills a structured format; each item must pass the same Zod checks as course content, have a clear answer that our own grader accepts, have no "wrong answer" that is also accepted, and not duplicate an existing question (hash). Failing items are thrown away. Passing items are cached and reused, marked "AI-generated" and "not reviewed by a teacher", and answers to them **never change mastery, reviews or level**.
- Reliability and limits: server-side provider interface (`src/server/ai/`) with an Anthropic adapter and a "not configured" adapter, request deadline and SDK retries, provider errors mapped to friendly messages, per-learner limits (requests per minute and a daily token budget, `AiUsage`), a stable cached system prompt. A partial or failed reply is never saved as if it were complete.
- The API key stays on the server: CI builds with a canary key and fails if the key, its name or the AI SDK appears in any browser file (`npm run check:bundle`).

**Milestone 5: Today dashboard, recommendations, study planner, challenges.**
- **Today** (`/app`): estimated level (labelled as an estimate), up to four recommendations each with the reason behind it, reviews due, current objectives, skill progress by topic state (with "what these measure"), recent mistakes, a 7-day activity chart, challenges and achievements. Every number comes from the learner's own records; a new learner sees a clear empty state.
- Rule-based recommendation engine (`src/lib/learning/recommend/engine.ts`), in priority order: due reviews → topics with repeated mistakes → unfinished prerequisites of the next lesson → under-practised skills for the learner's goals → next lesson at their level → a mixed check after finishing a unit.
- **Study planner** (`/app/session`): 10/20/30/60 minutes or any length from 5 to 120. Starts from the 30-minute template (review 5 · new 7 · targeted 7 · vocabulary 6 · use it 5) and adapts: no reviews due → more new learning; a big backlog → more review; very short sessions keep only the most useful blocks. Tick off steps; finished sessions appear in the calendar.
- **Mixed practice** (`/app/practice`): 8 questions from finished lessons (or one unit), without hints, graded on the server. It never counts towards finishing a lesson.
- **Challenges** (`/app/challenges`): "write five sentences of your own" every day plus one rotating daily challenge and one weekly challenge, all measured from real activity. Writing is saved; only real sentences (3+ words) count.
- **Grammar** (`/app/grammar`): every grammar topic A1–C2 with your state, prerequisites and the lesson that teaches it (or "planned").
- **Study calendar** (`/app/calendar`): days studied per month, review load for the next 14 days, planned and finished sessions.
- Gentle streak (one missed day a week is forgiven; nothing is taken away), learning points that reward answers given without help, and achievements derived from real events. All can be hidden in Settings.

**Milestone 4: vocabulary, active recall, spaced repetition, mistakes.**
- Review queue mixing three kinds of item: lesson exercises (they return the next day and must be answered from memory, graded on the server), saved words (alternating "type the word from its meaning" and "what does it mean?") and your own flashcards.
- SM-2-style scheduler: learning steps (10 min, 1 day), Again/Hard/Good/Easy, growing intervals, a lapse brings the item back within minutes, stable 5% spread on long intervals. "Due today" uses the learner's own time zone, including daylight-saving days. Every review is logged.
- Next review dates shown everywhere: review schedule, saved words, flashcards.
- Vocabulary: 48 A1 words in six topics with definitions in simple English, examples, collocations, British pronunciation (IPA), usage notes and common errors. Save/remove any word.
- Notebook: create, edit and delete flashcards and notes (grammar notes, useful sentences, optional link to a lesson); bookmark lessons.
- Mistake tracker: your answer, the correct answer, the explanation, the topic, the date and how you did later; mistakes are marked fixed when you later answer correctly; "topics to practise" groups recurring mistakes; delete any record.
- **"Mastered" is now real**: a topic is mastered only after correct answers from memory, without help, in reviews on two separate days, with high recent accuracy. A wrong review removes it.
- Home page shows how many reviews are due.

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
- **The AI tutor and generated practice only work once an Anthropic API key is configured** (see `.env.example`). Using them costs money per request; per-learner limits are set with `AI_DAILY_TOKEN_BUDGET_PER_USER` and `AI_REQUESTS_PER_MINUTE_PER_USER`.
- AI replies can be wrong. The tutor says so on the page, and generated exercises are checked automatically but not by a teacher. Answers to generated exercises don't count towards streaks, challenges or mastery.
- Challenge and "Use it" writing is counted or self-checked, not corrected by AI yet (the tutor's "Correct my writing" mode can do this on request; built-in writing feedback is Milestone 7).
- The tutor's "listening" mode works with written transcripts only; there is no audio yet (Milestone 7).
- Listening, reading, speaking and pronunciation are not taught or measured yet (Milestone 7); the planner uses vocabulary time instead.
- Vocabulary covers A1 only (48 words) and, like the lessons, awaits review by an English teacher.
- Reviews ask exercises exactly as in the lesson. AI-generated practice offers new questions, but it isn't part of the review schedule.
- The application ("Use it") task is self-checked and not saved.
- The placement check is short (30 questions) and section-based, not adaptive. It is an estimate only.
- A not-written lesson URL shows "Page not found", but with HTTP status 200 rather than 404 (a Next.js streaming limitation; the page is marked noindex).
- **Email is not configured yet.** Until `RESEND_API_KEY` and `EMAIL_FROM` are set, email verification is not required and emails print to the terminal (development) or are not sent (production). Configure Resend before a public launch.
- The first request after the free Neon database has been idle can take a few seconds while it wakes up. From a development machine far from the database (here, Nigeria → US East), each database round trip takes about 250 ms; in production the app and database should run in the same region.
- Occasionally the database resets an idle connection. The app retries safe operations (reads, updates, upserts) once on a fresh connection; inserts are never retried, to avoid duplicates.
- Light theme only.
- Deployed at https://englishflow-ai.vercel.app (Vercel + Neon). See [docs/DEPLOYMENT_PLAN.md](docs/DEPLOYMENT_PLAN.md).
- `npm audit` reports high-severity advisories in **development-only** lint tooling (`micromatch` via `eslint-config-next`). They don't ship to the website.
- Privacy policy and terms are placeholders that need legal review.
