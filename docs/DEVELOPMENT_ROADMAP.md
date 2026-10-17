# EnglishFlow AI — Development Roadmap

_Last updated 2026-10-16. Milestones 1–4 complete; Milestones 5–8 not started. Deployed at https://englishflow-ai.vercel.app._

The milestones follow master prompt §21. Each one is a **coherent, usable increment**: implement → run tests → inspect the running app → fix → document limitations, then move on. "Smaller and working" beats "broad and incomplete".

Status key: ⬜ not started · 🟨 in progress · ✅ done (verified by passing tests and manual check)

| # | Milestone | Status | Needs external accounts |
|---|---|---|---|
| 1 | Foundation shell | ✅ | None (GitHub/Vercel optional for first deploy) |
| 2 | Database, auth, onboarding, profiles | ✅ | Neon (Resend still to configure) |
| 3 | Curriculum, exercises, grading, placement v1 | ✅ | — |
| 4 | Vocabulary, active recall, SRS, mistakes | ✅ | — |
| 5 | Dashboard, recommendations, planner, challenges | ✅ | — |
| 6 | AI tutor and AI-generated exercises | 🟨 built on branch `milestone-6`, awaiting merge | Anthropic API (works without it: setup message) |
| 7 | Listening, reading, writing, pronunciation, communication | ⬜ | TTS provider, object storage |
| 8 | Analytics, accessibility, security, deployment hardening | ⬜ | Sentry |

---

## Milestone 1 — Foundation shell

**Status: ✅ complete (2026-10-16).** Verified with lint, typecheck, Prettier check, 18 unit tests, a production build, and 57 Playwright tests (desktop 1280×800 + Pixel 7) including axe with zero serious/critical violations. Implementation notes: the learner app lives at `src/app/app/` (served under `/app`); UI primitives were built only where used (Button, Alert, Badge, EmptyState, Container, SkipLink, Label/Input/Textarea). Tabs, Select, Checkbox, Radio, Tooltip, Progress and Skeleton will be added in the milestone that first needs them, not as unused code. A first piece of the grading module (`src/lib/learning/grading/text-answer.ts`) powers a real sample exercise on the home page. CI is written but not yet run on GitHub.

**Goal:** a polished, accessible, responsive Next.js project with the public website and learner-app shell, test tooling and CI, so all later work has a solid base.

**Features**
- Next.js (App Router) + TypeScript (strict) + Tailwind scaffold with ESLint and Prettier. Exact dependency versions pinned.
- Design tokens: color (AA contrast), type scale, spacing, radii, focus ring. Light theme first. Text-scale and reduced-motion hooks via CSS variables.
- UI primitives: Button, Link, Input, Textarea, Select, Checkbox/Radio, Card (used sparingly), Dialog, Tabs, Tooltip, Badge, Progress, Alert, Skeleton, EmptyState, VisuallyHidden, SkipLink.
- Public pages: Home, Features, How learning works, Curriculum overview (describes A1–C2 framework and honestly states content status), Pricing (marked "planned — not yet available"), Privacy and Terms (marked "**placeholder — requires review**").
- Learner-app shell layout: desktop sidebar plus mobile bottom nav / menu. **Navigation is generated from a module registry and lists only modules marked implemented.** In M1 the app area holds only a sign-in prompt (sign-in itself arrives in M2), so there are no fake dashboards.
- 404 and error pages.
- Vitest, Playwright (mobile and desktop projects) and axe set up. GitHub Actions CI.
- `README.md` (setup, scripts, project status) and `.env.example` (documented, no values).

**Likely files / modules**
`package.json`, `tsconfig.json`, `next.config.ts`, `tailwind`/`postcss` config, `src/app/layout.tsx`, `src/app/(public)/**`, `src/app/app/layout.tsx`, `src/components/ui/**`, `src/components/layout/**`, `src/lib/modules.ts` (module registry), `src/styles/globals.css`, `vitest.config.ts`, `playwright.config.ts`, `e2e/public.spec.ts`, `e2e/a11y.spec.ts`, `.github/workflows/ci.yml`, `README.md`, `.env.example`.

**Dependencies:** none (first milestone).

**Tests**
- Unit: module registry only exposes implemented modules.
- E2E: every public page renders at mobile and desktop widths. Nav links work. Skip link and keyboard navigation through header/nav.
- A11y: axe reports no serious or critical violations on every public page.

**Completion criteria**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` all pass locally and in CI.
- Manual inspection in a browser at both widths.
- No page shows fake data or empty placeholder cards. Placeholder legal pages are clearly marked.

---

## Milestone 2 — Database, authentication, onboarding, profiles

**Status: ✅ complete (2026-10-16).** Verified with lint, typecheck, Prettier check, 27 unit tests, 7 integration tests against PostgreSQL (isolated `englishflow_test` schema, including a test proving writes never reach `public`), a production build, and 91 Playwright tests on desktop and phone (sign-up → onboarding → sign-out → sign-in persistence, redirect-back, generic credential errors, duplicate email, validation, settings persistence and applied text size, account deletion, cross-user isolation, axe on signed-in pages). Implementation notes: Prisma 7.10 with the `pg` driver adapter (Prisma 8 is still a release candidate and unsupported by Better Auth); Better Auth rate limits stored in the database; session reads happen behind Suspense (`loading.tsx`) as Next.js Cache Components require; `src/proxy.ts` does a fast cookie-only redirect and `requireUser()` does the real check. Email verification is enforced only once Resend is configured. Change-password (while signed in) and a sign-in-page "resend verification" button are not built yet.

**Goal:** real accounts with persisted profiles and preferences, plus the authorization pattern every later feature uses.

**Features**
- Prisma + Neon (separate dev and test databases). First migration. `src/server/db` client.
- Better Auth: sign-up, sign-in, sign-out, email verification and password reset via Resend (console logger fallback in development). Rate limiting.
- `requireUser()` and the user-scoped repository pattern.
- Onboarding flow: goals, native language, timezone (auto-detected and confirmable), daily minutes, explanation style, self-reported level (placement comes in M3).
- Settings: profile, learning preferences, text size, reduced motion, delete account.
- App shell shows the signed-in state. Dashboard is a minimal "welcome / continue onboarding" page with no statistics.

**Likely files:** `prisma/schema.prisma`, `prisma/migrations/**`, `src/server/auth/**`, `src/server/db/**`, `src/app/(auth)/**`, `src/app/app/onboarding/**`, `src/app/app/settings/**`, `src/app/api/auth/[...all]/route.ts`, `src/server/email/**`.

**Dependencies:** M1. Neon account (or local Postgres via Docker as an alternative), Resend account (optional in dev).

**Tests**
- Integration: repository functions scoped by userId. **User A can't read or modify user B's profile/preferences.**
- E2E: sign up → onboarding → sign out → sign in → preferences persist after reload. Invalid credentials show an accessible error.

**Completion criteria:** acceptance checks §20 #1 (sign-up/sign-in) and #12 (cross-user isolation, for the data that exists) pass. Migrations apply on a fresh DB. Account deletion cascades.

---

## Milestone 3 — Curriculum, reusable exercises, grading, placement v1

**Status: ✅ complete (2026-10-16).** Verified with lint, typecheck, Prettier check, 70 unit tests (8 files), 21 integration tests (3 files, isolated schema), a production build, and 109 Playwright tests on desktop and phone, run twice in a row with no failures. Delivered: content format with Zod validation (`content/schemas.ts`, `content/validate.ts`), 8 published A1 lessons (81 exercises, all 8 types), A2–C2 outlines (49 lessons total, 50 concepts, 56 prerequisite links), 30 placement items, idempotent seed (~10 s), server-side grading (answers never sent to the browser), concept and lesson progress, lesson player, curriculum page, placement flow, next-lesson suggestion. Notes and deviations: the content was written with AI assistance and is marked `pending_human_review` with a visible "draft" note; `mastered` is never awarded yet (needs delayed reviews, M4); application tasks are self-checked and not saved; content reads use Next.js `use cache`; the database client retries reads/updates/upserts once after a connection reset; multiple-choice options are shuffled deterministically per exercise (a content test caught that correct answers were clustered in one position). Unknown lesson URLs render "Page not found" with status 200 because of streaming.

**Goal:** a learner can open a real lesson, complete exercises, get correct feedback, and see progress persist.

**Features**
- Content schemas (Zod) for levels, modules, units, lessons, concepts, prerequisites and every exercise type's payload. Content files carry `reviewStatus`.
- Seed script with idempotent upserts. CI validates all content files.
- **A1 starter module: about 8 complete lessons** (for example: to be, subject pronouns, articles a/an, plural nouns, present simple, questions with do/does, there is/are, basic prepositions of place), each with objective, prerequisites, explanation, examples, common mistakes, guided practice, independent practice, recall questions, application task and mastery criteria.
- **Outline for A2–C2:** modules, units and concepts with prerequisites (no lesson bodies yet). Shown as "outline" on the curriculum page.
- Exercise renderers with a shared `ExerciseShell` (instructions, attempt, check, feedback, explanation, keyboard support, aria-live feedback): multiple choice, fill-in-the-blank, matching, word ordering, sentence completion, error correction, transformation, short answer.
- Deterministic grading module with accepted-answer variants and distractor-specific feedback.
- Attempts persisted. `ConceptProgress` updated (exposures vs attempts vs independent correct).
- Curriculum/roadmap page and lesson player.
- Placement assessment v1: section-based (grammar, vocabulary, reading), approximate level plus per-skill profile, explanation that it's an estimate, option to adjust the starting level and retake. Doesn't infer listening/speaking.

**Likely files:** `content/**`, `src/lib/content/schemas.ts`, `src/lib/learning/grading/**`, `src/lib/learning/mastery.ts`, `src/components/exercises/**`, `src/app/app/learn/**`, `src/app/app/lessons/[slug]/**`, `src/app/app/placement/**`, `prisma/seed.ts`.

**Dependencies:** M2.

**Tests**
- Unit: grading per type (normalization, alternatives, wrong-answer feedback), mastery state transitions, content schema validation of all content files.
- Integration: attempt persistence, ConceptProgress updates.
- E2E: open lesson → answer correctly and incorrectly → see appropriate feedback → reload → progress preserved. Complete placement → see estimate and profile.

**Completion criteria:** acceptance checks #2, #3, #4, #5 pass. All seeded exercises have objective, valid answers, feedback and difficulty.

---

## Milestone 4 — Vocabulary, active recall, spaced repetition, mistake tracking

**Status: ✅ complete (2026-10-16).** Verified with lint, typecheck, Prettier check, 97 unit tests (10 files, incl. scheduler, time zones/DST, mastery-via-reviews, vocabulary content), 31 integration tests (4 files: scheduling, mastery on two separate days, saved words, flashcards, notes, bookmarks, mistakes, cross-user isolation), a production build, and the full Playwright suite (126/127 passed in the full run; the one failure was a slow save under load and passed on rerun on desktop and phone). Bugs found by testing and fixed: a flashcard review card carried the flashcard's id instead of the review item's id (rating failed); fuzz made short intervals ±25%; per-file test cleanup deleted other files' users; transactions needed longer limits for a distant database. Delivered: SM-2-style scheduler, review queue (exercises/words/flashcards), 48 A1 words, notebook, mistake tracker, real mastery. Limitations: exercise reviews repeat the lesson item verbatim; vocabulary is A1 only and unreviewed.

**Goal:** learners build a personal review queue that schedules correctly and persists.

**Features**
- A1 vocabulary set (definition, part of speech, examples in context, collocations, IPA where available, common errors).
- Vocabulary academy (browse by level/topic) and notebook (save words with source sentence, notes).
- Flashcards (from vocab, mistakes, lessons, custom) with hidden-answer recall, both directions (meaning → word, word → meaning) and confidence rating.
- SRS scheduler (pure, configurable) and review queue UI: due count, Again/Hard/Good/Easy, next review date shown per item.
- Exercise reviews: lesson exercises enter the review queue and map automatically to ratings.
- Mistake tracker: original answer, correction, explanation, concept, date, later results. "Practice this" link.
- Grammar notes, bookmarks, saved sentences. Edit/delete for all learner-owned items.
- Mastery now requires delayed independent recall (§6.2 of ARCHITECTURE).

**Likely files:** `src/lib/learning/srs/**`, `src/server/db/review.ts`, `src/app/app/review/**`, `src/app/app/vocabulary/**`, `src/app/app/notebook/**`, `src/app/app/mistakes/**`, `content/vocabulary/a1/**`.

**Dependencies:** M3.

**Tests**
- Unit: scheduler (new → learning → review, Again shortens and adds a lapse, Easy lengthens, ease clamping, max interval, deterministic fuzz, **timezone boundaries and DST**).
- Integration: review persistence. Users can't review or edit others' items.
- E2E: save a word → appears in notebook after reload → review it → next date shown. Incorrect review → item due sooner.

**Completion criteria:** acceptance checks #6, #7, #8 pass.

---

## Milestone 5 — Dashboard, recommendations, study planner, challenges

**Status: ✅ complete; merged and deployed 2026-10-17.** Verified with lint, typecheck, Prettier check, 129 unit tests (12 files: every recommendation rule and its order, planner allocation and adaptation, streak grace days, challenges, achievements, time zones), 38 integration tests (5 files, isolated schema: empty and real-activity dashboard, practice never completes a lesson, sessions, writing challenge, cross-learner isolation), a production build, and the full Playwright suite on desktop and phone (147 passed, 5 skipped as before; 4 older tests that checked the old home page's layout were updated and then passed on rerun), including axe on all new pages. Browser tests now run in their own `englishflow_e2e` schema, so they no longer create accounts in the live database. Deviations: the dashboard lives at `/app` (not `/app/dashboard`) and replaces the old Home page; "write five sentences" is offered every day so production practice is always available; streaks forgive one missed day per week instead of "streak freezes"; there are no curriculum-wide challenges yet; challenge writing is counted, not corrected (AI feedback is M6). One migration (additive: `study_session`, `challenge_submission`, `concept_progress.masteredAt`, attempt context `practice`) is applied on deploy.

**Goal:** the app answers "what next?" with real data and explains why.

**Features**
- Rule-based recommendation engine with reasons (ARCHITECTURE §6.4), independent of UI.
- Dashboard: welcome, estimated level (labelled estimate), continue learning, today's plan, reviews due, current objectives, skill progress (with "what this measures" explanations), recent mistakes, recent achievements, weekly activity, next lesson. Useful empty state for new learners.
- Study planner: 10/20/30/60/custom minutes, priority selection, guided session runner.
- Grammar academy browse view (by level/concept).
- Daily/weekly/curriculum challenges with submissions. Optional XP, badges and gentle streaks (streak freezes, no shaming). Gamification can be turned off.
- Study calendar (planned and completed sessions, upcoming review load).

**Likely files:** `src/lib/learning/recommend/**`, `src/lib/learning/planner.ts`, `src/app/app/dashboard/**`, `src/app/app/challenges/**`, `src/app/app/calendar/**`, `src/app/app/grammar/**`.

**Dependencies:** M3, M4.

**Tests**
- Unit: each recommendation rule. Rule ordering. Planner time allocation and adaptation.
- E2E: new user sees empty-state guidance. After activity, the dashboard reflects the actual persisted numbers.

**Completion criteria:** acceptance check #9 passes. No hard-coded or invented numbers anywhere on the dashboard.

---

## Milestone 6 — AI tutor, context retrieval, structured outputs, AI-generated exercises

**Goal:** a useful, honest AI tutor that degrades gracefully.

**Features**
- `AiProvider` interface, `AnthropicProvider`, `NullProvider`, env configuration, timeouts, retries, error mapping.
- `AiUsage` rate/token limits.
- Tutor UI: persistent conversations, mode selector, concise/detailed toggle, hint mode, streaming responses, safe markdown rendering.
- Level-adapted system prompts with teaching rules.
- Context retrieval (opt-in) with minimal, relevant data.
- LearnerMemory management page (view, edit, delete. AI-proposed items unverified).
- "Generate more practice" for a concept: structured generation, Zod validation, dedupe by hash, cache, render through existing exercise components.
- Setup message when no provider is configured. Other features keep working.

**Likely files:** `src/server/ai/**`, `src/app/app/tutor/**`, `src/app/api/tutor/route.ts`, `src/app/app/settings/memory/**`.

**Dependencies:** M3–M5. Anthropic API key (tests use a mocked provider and need no key).

**Tests**
- Unit: output schemas reject malformed exercises. Context builder includes only allowed fields.
- Integration (mocked provider): missing key → setup state. Timeout/5xx → friendly error. Invalid structured output → rejected and not stored. Usage limit enforced.
- E2E: tutor page without a key shows the setup message.

**Completion criteria:** acceptance checks #10 and #11 pass. No API key is reachable from client bundles (verified by a build-output grep in CI).

---

## Milestone 7 — Listening, reading, writing, pronunciation, communication

**Goal:** skill labs with real content and honest capabilities.

**Features**
- Audio generation script (TTS) → object storage. Player only when audio exists.
- Listening lab: listen first, then questions, transcript reveal, phrase inspection, replay, dictation. Placement adds a listening section.
- Reading library: graded texts with comprehension, inference and vocab-in-context. Save words with source sentence.
- Writing workshop: tasks by level, three-layer AI feedback (correctness / naturalness / optional style) preserving meaning, rewrite loop, journal.
- Sentence-building studio view (word order, expansion, original sentences).
- Pronunciation lab: phonemes, minimal pairs, stress/intonation with model audio. Optional recording and playback. Optional STT transcript comparison, labelled honestly. Microphone permission explained.
- Communication: scenario role-plays (text first, optional voice) via the tutor.

**Dependencies:** M3–M6. TTS provider and storage accounts.

**Tests:** unit for dictation comparison and transcript diff. E2E for listening flow (with a fixture audio file), reading save-word flow, writing feedback with mocked provider, and all speaking tasks having a text alternative.

**Completion criteria:** every audio control plays real audio. No pronunciation-scoring claims without a supporting service. Speaking never blocks unrelated progress.

---

## Milestone 8 — Analytics, accessibility, security review, testing, deployment

**Goal:** production readiness ([PROJECT_PLAN.md §7](PROJECT_PLAN.md#7-definition-of-production-ready)).

**Features**
- Progress analytics from real data (per skill, per concept, review retention, activity over time).
- Full accessibility audit (axe on all pages, manual keyboard and screen-reader pass).
- Security review: headers/CSP, rate limits, authorization test sweep across every learner route, dependency audit.
- Data export (JSON) and complete deletion.
- Sentry with scrubbing.
- Final README, deployment docs, completed-features and known-limitations list.

**Tests:** complete §20 acceptance suite (all 15) in CI, including #13 (mobile/desktop), #14 (keyboard), #15 (empty/loading/error states).

**Completion criteria:** every item in the production-ready checklist is checked.

---

## Ongoing (every milestone)
- Keep README and `.env.example` current.
- Record known limitations.
- Expand reviewed curriculum content (A2 next after A1).
- Never report a test as passing unless it actually ran.
