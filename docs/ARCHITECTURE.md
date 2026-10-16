# EnglishFlow AI — Architecture

_Status: Milestones 1–3 implemented (2026-10-16); later sections describe planned design. See DEVELOPMENT_ROADMAP.md for what is built._

## 1. Overview

EnglishFlow AI is a **single Next.js application** (UI plus server code) backed by **one PostgreSQL database**. External services (email, AI provider, object storage, error monitoring) are called only from the server.

```
Browser (React UI)
   │  HTTPS (server actions / route handlers; no secrets in client)
   ▼
Next.js app on Vercel
   ├── Auth (Better Auth, DB sessions)
   ├── Repositories (Prisma) ─────────────► PostgreSQL (Neon)
   ├── Learning engine (pure TS: SRS, mastery, recommendations, planner, grading)
   ├── AI service (provider adapter) ─────► Anthropic API
   ├── Email ─────────────────────────────► Resend
   ├── Audio assets ──────────────────────► Vercel Blob / Cloudflare R2
   └── Error monitoring ──────────────────► Sentry (PII scrubbed)
```

Why this shape: one deployable unit and one database is the least complex architecture that meets every requirement. It's easy for a beginner to run, debug and deploy, and it can be split later if a measured need appears.

## 2. Technology stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Next.js (App Router)** + **TypeScript** + **React** | Preferred stack in the master prompt. Server components, server actions, route handlers and streaming in one framework. First-class Vercel support. |
| Styling | **Tailwind CSS** with design tokens (CSS variables) | Consistent design system, small CSS output, easy theming (text size, contrast). |
| UI primitives | **Radix UI** primitives, wrapped in-repo (shadcn/ui pattern) | Accessible keyboard/focus behavior out of the box. Code lives in the repo, so there's no opaque component dependency. |
| Database | **PostgreSQL** on **Neon** | Relational data with foreign keys. Managed, persistent, free tier, branching for previews. |
| ORM | **Prisma** | Typed client, migrations, seed scripts, beginner-friendly. |
| Auth | **Better Auth** (email + password, DB sessions, Prisma adapter) | Maintained, TypeScript-first, built-in rate limiting, supports email verification/reset and adding OAuth later. |
| Email | **Resend** | Simple API, free tier, for verification and password reset. |
| Validation | **Zod** | One schema language for forms, API input, curriculum content files and AI structured output. |
| AI | **Server-side provider adapter**, first implementation **Anthropic** (`@anthropic-ai/sdk`) | Configurable via env. Structured outputs validated with Zod. |
| Unit / integration tests | **Vitest** | Fast, TypeScript-native. Integration tests run against a dedicated test database. |
| Browser tests | **Playwright** + **@axe-core/playwright** | End-to-end journeys at mobile and desktop viewports, automated accessibility checks. |
| CI | **GitHub Actions** | Lint, typecheck, unit/integration tests, build, e2e on every push/PR. |
| Package manager | **npm** | Already installed. No extra tooling for a beginner. |
| Error monitoring | **Sentry** | Free tier, with PII scrubbing configured. |

**Versions:** exact versions are pinned when the project is scaffolded (Milestone 1), after checking current stable releases and compatibility between Next.js, React, Prisma and Better Auth. They'll be recorded in `package.json` and the README, not here.

## 3. Repository structure (planned)

```
englishflow-ai/
├── docs/                         planning and architecture documents
├── content/                      curriculum source files (versioned, Zod-validated)
│   ├── levels/a1/…               modules → units → lessons (JSON or TS)
│   ├── concepts/                 concept taxonomy + prerequisites
│   └── vocabulary/               vocabulary entries by level/topic
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                   loads content/ into the database (idempotent upserts)
├── public/                       static assets (no audio here; audio lives in object storage)
├── src/
│   ├── app/
│   │   ├── (public)/             home, features, how-it-works, curriculum, pricing, privacy, terms
│   │   ├── (auth)/               sign-in, sign-up, verify, reset password
│   │   ├── app/                  learner application, served under /app (auth-guarded layout)
│   │   │   ├── dashboard/  learn/  lessons/[id]/  review/  vocabulary/  notebook/
│   │   │   ├── mistakes/  tutor/  listening/  reading/  writing/  pronunciation/
│   │   │   ├── conversation/  challenges/  progress/  calendar/  settings/  onboarding/  placement/
│   │   └── api/                  route handlers (auth, tutor streaming, etc.)
│   ├── components/
│   │   ├── ui/                   design-system primitives (Button, Dialog, Tabs, …)
│   │   ├── layout/               app shell, navigation, mobile nav
│   │   └── exercises/            one renderer per exercise type + shared ExerciseShell
│   ├── server/                   server-only code (imports "server-only")
│   │   ├── db/                   prisma client + repositories (every learner query takes userId)
│   │   ├── auth/                 Better Auth config, getSession(), requireUser()
│   │   ├── ai/                   provider interface, adapters, prompts, schemas, limits, context
│   │   ├── email/
│   │   └── storage/
│   ├── lib/
│   │   ├── learning/             PURE learning logic, no I/O, no React
│   │   │   ├── srs/              scheduler.ts, config.ts
│   │   │   ├── mastery.ts
│   │   │   ├── recommend/        engine.ts, rules/*.ts
│   │   │   ├── planner.ts
│   │   │   └── grading/          deterministic answer checking per exercise type
│   │   ├── content/              Zod schemas for curriculum + exercise payloads
│   │   └── utils/                dates/timezones, text normalization
│   └── styles/
├── tests/
│   ├── unit/                     pure logic (SRS, mastery, grading, recommendations)
│   └── integration/              repositories + authorization against test DB
├── e2e/                          Playwright journeys + axe checks
├── .env.example
├── .github/workflows/ci.yml
└── README.md
```

**Module boundaries (enforced by convention and lint rules):**
- `src/lib/learning/**` must not import from `server/`, `app/`, `components/` or Prisma. It receives plain data and returns plain data.
- `src/server/**` is never imported by client components (`import "server-only"`).
- UI components never call Prisma or the AI provider directly.
- Curriculum content (`content/`) is separate from learner records.

## 4. Data model

PostgreSQL via Prisma. Every learner-owned table has a `userId` foreign key (cascade delete), an index on `userId` plus its common query field, and `createdAt`/`updatedAt` timestamps. All timestamps are stored in **UTC**.

### 4.1 Identity and preferences
| Table | Key fields |
|---|---|
| `User`, `Session`, `Account`, `Verification` | Managed by Better Auth |
| `Profile` | userId (unique), displayName, timezone (IANA, e.g. `Africa/Lagos`), nativeLanguage, goals[], estimatedLevel (CEFR, nullable), levelSource (`placement`/`self`/`assessment`) |
| `LearningPreferences` | userId, dailyMinutes, explanationStyle (`concise`/`detailed`), tutorHintMode (`hint_first`/`guided`/`direct`), translationSupport, textScale, reducedMotion, gamificationEnabled, aiContextSharing (bool) |

> **As built (M3):** the curriculum tables are `level`, `course_module`, `unit`, `lesson` (body/application JSON, `reviewStatus`, `archivedAt`), `concept`, `concept_prerequisite`, `lesson_concept`, `exercise` (`phase`: guided/independent/recall/placement; `payload` JSON with answers) and `exercise_concept`. Learner tables are `exercise_attempt`, `concept_progress`, `lesson_progress` and `placement_result`. Source of truth for content is `content/` (TypeScript, Zod-validated) loaded by `npm run db:seed`.

### 4.2 Curriculum (shared, read-only to learners)
| Table | Key fields |
|---|---|
| `Level` | code (A1–C2), order, contentStatus (`outline`/`partial`/`complete`) |
| `Module` → `Unit` → `Lesson` | slug, title, order, objective, levelId. Lesson body is structured JSON (explanation, examples, common mistakes, mastery criteria) |
| `Concept` | slug, name, skill, levelId, description |
| `ConceptPrerequisite` | conceptId, prerequisiteId |
| `Skill` | enum: grammar, vocabulary, listening, reading, writing, pronunciation, sentence_construction, functional_communication |
| `Exercise` | type, levelId, lessonId (nullable), objective, instructions, payload (JSON validated by type schema), difficulty (1–5), source (`seed`/`ai`), reviewStatus, contentHash (unique, dedupe) |
| `ExerciseConcept` | exerciseId, conceptId, weight. An exercise can practice multiple concepts. |
| `VocabularyEntry` | headword, partOfSpeech, level, definition, examples[], collocations[], ipa, audioUrl, usageNotes, commonErrors[], topic, frequencyBand |
| `Challenge` | type (daily/weekly/curriculum), criteria JSON, active window |
| `Achievement` | code, name, criteria |

### 4.3 Learner records (private)
| Table | Key fields |
|---|---|
| `ExerciseAttempt` | userId, exerciseId, response JSON, isCorrect, score, hintsUsed, independent (bool: no hint/no AI), confidence (nullable), durationMs, context (`lesson`/`review`/`placement`/`challenge`) |
| `ConceptProgress` | userId, conceptId, exposures, attempts, correct, independentCorrect, delayedIndependentCorrectDays, lastSeenAt, masteryState (`new`/`learning`/`practicing`/`mastered`) |
| `SkillAssessment` / `PlacementResult` | userId, per-skill estimates, overall estimate, evidence counts, takenAt |
| `SavedVocabulary` | userId, vocabularyEntryId (or custom word), sourceSentence, note |
| `Flashcard` | userId, front, back, sourceType (vocab/mistake/custom/lesson), sourceId |
| `ReviewItem` | stable id, userId, itemType, itemRefId, objective, state (`new`/`learning`/`review`/`relearning`), ease, intervalDays, dueAt (UTC), reps, lapses, lastReviewedAt |
| `ReviewLog` | reviewItemId, userId, rating (again/hard/good/easy), previous/next interval, reviewedAt |
| `MistakeRecord` | userId, conceptId, exerciseAttemptId, originalAnswer, correctedAnswer, explanation, resolvedAt, subsequentResults |
| `StudySession` | userId, plannedMinutes, plan JSON, startedAt, completedAt, activitiesCompleted |
| `ChallengeSubmission` | userId, challengeId, submission JSON, status |
| `UserAchievement` | userId, achievementId, earnedAt |
| `Note`, `Bookmark`, `JournalEntry` | userId, content, references |
| `TutorConversation` / `TutorMessage` | userId, mode, title / role, content, tokenUsage |
| `LearnerMemory` | userId, kind (preference/recurring_error/goal), content, source (`learner`/`ai`/`system`), verified (bool), editable and deletable by the learner |
| `AiUsage` | userId, date (UTC day), requests, inputTokens, outputTokens |

## 5. Authentication and authorization

- **Better Auth** with email + password, email verification and password reset (Resend). Sessions are stored in the database in httpOnly, secure, SameSite cookies.
- `requireUser()` server helper: every server action, route handler and page under `/app` calls it and receives the session's `userId`.
- **The userId always comes from the session, never from request input.** Repository functions take it as their first argument and include it in every `where` clause.
- The `/app` layout redirects unauthenticated users to sign-in (UX only). Real enforcement happens in each data access.
- Built-in Better Auth rate limits on sign-in/sign-up. Generic error messages so account existence isn't leaked.
- **Demo mode** (optional, later): only if it can be clearly separated. A seeded, clearly labelled demo account in non-production environments, never sharing tables with real users' data in production.

## 6. Learning engine

All learning logic lives in `src/lib/learning/` as **pure, deterministic, unit-tested functions** that take plain data plus a `now` timestamp.

### 6.1 Evidence tracking
Each attempt records whether it was **independent** (no hints, no AI help, answer not revealed). Opening a lesson increments `exposures` only. It never contributes to mastery.

### 6.2 Mastery model (initial rules, configurable)
| State | Rule |
|---|---|
| `new` | No attempts |
| `learning` | ≥1 attempt |
| `practicing` | ≥3 correct attempts with accuracy ≥70% over the last 10 |
| `mastered` | Independent correct recall in **delayed reviews on ≥2 separate days** (≥1 day after first learning), recent accuracy ≥80% |

A mastered concept drops back to `practicing` after repeated lapses. Thresholds live in a config object and are covered by tests.

### 6.3 Spaced repetition (SM-2-inspired)
- Ratings: **Again, Hard, Good, Easy**.
- New items go through short learning steps (for example, 10 min → 1 day) before graduating to `review`.
- In review: **Again** → relearning, interval reset to 1 day, lapse +1, ease −0.20. **Hard** → interval × 1.2, ease −0.15. **Good** → interval × ease. **Easy** → interval × ease × 1.3, ease +0.15.
- Ease is clamped to [1.3, 3.0] and the maximum interval is configurable (for example, 365 days). Small random fuzz (±5%) prevents review pile-ups. It's seeded, so tests stay deterministic.
- Typical successful progression is roughly 1 → 3 → 7 → 14 → 30 days, but the schedule responds to performance.
- **Time zones:** `dueAt` is stored in UTC. "Due today" means due before the end of the learner's local day in their profile timezone. Tests cover midnight boundaries and DST transitions.
- Exercise-based reviews map automatically: incorrect → Again, correct with hint → Hard, correct → Good. The learner can choose Easy for self-rated flashcards.

### 6.4 Recommendation engine (rule-based, transparent)
`recommend(learnerSnapshot, curriculumIndex, now) → Recommendation[]`, where each recommendation has `{ activity, priority, reason }`. Rules are evaluated in order:

1. Reviews due ("12 reviews are due today").
2. Concepts with repeated recent errors ("You missed 'a/an' 3 times this week").
3. Prerequisites blocking the next lesson ("Present simple is needed before Present continuous").
4. Under-practiced skills relevant to the learner's goals.
5. Next new lesson at the appropriate level.
6. Periodic cumulative assessment (for example, after every unit or every N lessons).

Each rule is a separate module in `recommend/rules/` and is unit-tested on its own. The UI only renders the output.

### 6.5 Study planner
`buildSessionPlan(minutes, snapshot, preferences)` splits time across blocks: review, new learning, targeted practice, listening/reading, independent application. Default proportions scale from the 30-minute template in the master prompt and adapt (for example, more review time when many items are due). Learners can choose priorities. No skill is mandatory every day.

### 6.6 Grading
Deterministic grading per exercise type: normalized string comparison (case, whitespace, punctuation, curly vs. straight apostrophes, contractions where allowed), multiple accepted answers, and targeted feedback keyed to specific wrong answers (distractor explanations). Open-ended tasks use rubric-based AI feedback (Milestone 6), labelled as such.

## 7. AI integration

### 7.1 Provider abstraction
```ts
interface AiProvider {
  isConfigured(): boolean;
  chat(req: ChatRequest): AsyncIterable<ChatChunk>;                       // streaming tutor
  generateStructured<T>(req: StructuredRequest, schema: ZodType<T>): Promise<T>;  // validated JSON
}
```
- Implementations: `AnthropicProvider` (official `@anthropic-ai/sdk`, structured output via `messages.parse()` with Zod schemas) and `NullProvider` (used when no key is configured. Returns a typed "not configured" result that the UI shows as a setup message).
- Selected by env: `AI_PROVIDER=anthropic`, `AI_MODEL` (tutor/writing feedback, default `claude-opus-5-5`), `AI_MODEL_FAST` (optional cheaper model for simple generation tasks, for example `claude-haiku-5-5`), `ANTHROPIC_API_KEY`.
- Server-only. Keys are never sent to the browser.

### 7.2 Reliability and limits
- Request timeouts, SDK retries for transient errors, typed error handling that maps to friendly UI messages ("The tutor is unavailable right now. Your lessons and reviews still work.").
- Per-user limits stored in `AiUsage`: requests per minute, daily token budget. Configurable via env.
- Model output is **untrusted**. It's validated with Zod where structured, rendered as escaped text or a sanitized markdown subset (no raw HTML), and never executed or used to build queries.

### 7.3 Tutor
- Modes from master prompt §10 (explain, understand a sentence, conversation, correct writing, vocabulary, quiz, remember, listening, build sentences, challenge, explain mistakes, review history).
- System prompt includes: estimated level, explanation style, hint mode, rules (hint before answer when selected, don't invent rules, flag regional/contextual variation, distinguish errors from acceptable alternatives, avoid excess praise).
- **Context retrieval** (only when the learner has enabled AI context sharing): current lesson objective, last ~5 relevant attempts, top recurring mistakes for the relevant concepts, relevant saved vocabulary, verified learner memory. Never the full history.
- Stable system-prompt prefix to benefit from prompt caching.

### 7.4 AI-generated exercises
- Generated as structured data (type, level, objective, instructions, question, accepted answers or rubric, explanation, difficulty, conceptIds) and validated by the same Zod schemas as seeded exercises. Rejected if invalid, if conceptIds don't exist, if accepted answers are empty, or if a near-duplicate exists (`contentHash`).
- Stored with `source = ai`, cached for reuse, never used to change a learner's CEFR level.

### 7.5 Tutor memory
`LearnerMemory` rows are separate from chat messages, visible on a settings page, editable and deletable. AI-proposed memories are stored as `verified = false` and aren't treated as fact until confirmed by assessment evidence or by the learner.

## 8. Audio, listening and pronunciation (Milestone 7 design)
- Curriculum audio is **pre-generated** by a script (`scripts/generate-audio.ts`) using a TTS provider and uploaded to object storage. The audio URL is stored on the content record.
- The UI renders an audio player **only** when a real audio file exists. Transcripts are always available for accessibility.
- Pronunciation v1: model audio, minimal pairs, learner record-and-playback for self-comparison, optional speech-to-text with a transcript comparison. Clearly labelled **"transcription, not pronunciation scoring."** Microphone permission is requested only when the learner starts a speaking activity, with an explanation. Recordings aren't stored unless the learner opts in.
- Phoneme-level scoring only if a service that supports it (for example, Azure Speech Pronunciation Assessment) is configured.

## 9. Security and privacy
- Input validation with Zod on every server action and route handler.
- Server-side authorization through `requireUser()` plus user-scoped repositories. Cross-user tests from M2 onward.
- Rate limiting on auth (Better Auth) and AI routes (`AiUsage`).
- Security headers via Next.js config: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- React's default escaping. No `dangerouslySetInnerHTML` except through a sanitizer for the markdown subset.
- CSRF: Better Auth's protections and Next.js server-action origin checks.
- Secrets only in environment variables. `.env.example` documents names only.
- Data retention: learners can delete notes, flashcards, review items, tutor conversations, memories and their whole account (cascade). Export in M8.
- Sentry configured to drop request bodies and learner text.
- AI-generated code or SQL is never executed.

## 10. Accessibility
- Radix primitives for focus management. Visible focus styles. Skip link. Semantic landmarks.
- Exercise feedback announced through `aria-live` regions.
- Text scale preference (CSS variable), reduced motion (`prefers-reduced-motion` plus a user setting), WCAG AA contrast tokens.
- Transcripts/captions for audio. Text alternatives for all speaking tasks. Speaking is never required to progress in unrelated lessons.
- Automated axe checks in Playwright plus manual keyboard walkthroughs per milestone.

## 11. Testing strategy
| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | SRS scheduler, mastery, recommendations, planner, grading, content schemas, AI output schemas |
| Integration | Vitest + test Postgres | Repositories, authorization (user A can't read user B), seed script, AI service with mocked provider (timeout, error, invalid output, missing key) |
| End-to-end | Playwright (mobile + desktop projects) | Sign-up/sign-in, onboarding, placement, lesson completion, persistence after reload, vocab save, reviews, dashboard real data, tutor setup message |
| Accessibility | @axe-core/playwright + keyboard tests | Core pages and exercise components |

All test layers run in CI. Tests are never reported as passing unless they actually ran.
