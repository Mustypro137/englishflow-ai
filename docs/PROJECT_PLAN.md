# EnglishFlow AI — Project Plan

_Status: planning phase. Last updated 2026-10-16._

> **Nothing described in this document is implemented yet.** Every feature below is planned. Feature status is tracked in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) and, once code exists, in the README's "Completed features" list.

Related documents:
- [ARCHITECTURE.md](ARCHITECTURE.md): stack, code structure, data model, learning engine, AI, security
- [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md): ordered milestones with tests and completion criteria
- [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md): hosting, environments, setup steps, costs

---

## 1. Vision

EnglishFlow AI is a web platform that takes learners from A1 (absolute beginner) to C2 (proficient). It combines structured lessons, active recall, spaced repetition, skill-specific practice and an AI tutor.

The goal is **independent ability**: learners understand English, remember useful language, build original sentences and communicate without copying examples or leaning on the AI for every answer.

For every learner, the product answers three questions:

1. **What should I learn next?** (curriculum + recommendation engine)
2. **What do I need to practice or review?** (spaced repetition + mistake tracking)
3. **Can I use what I learned without help?** (independent recall + production tasks + evidence-based mastery)

### Product principles
- **Real functionality over surface area.** A small set of modules that work beats a wide set of placeholder pages. Navigation only shows modules that are built.
- **Honest data.** No fake statistics, invented mastery percentages or charts without data. Empty states explain what will appear and how to get there.
- **Honest claims.** CEFR level is labelled an *estimate*. Speech-to-text is never presented as pronunciation scoring. AI output is never treated as established fact about a learner.
- **AI where it adds value.** All core learning (lessons, exercises, reviews, notebooks) works without an AI provider configured.
- **Accessible by default.** Keyboard, screen reader, text size, reduced motion. Speaking is always optional.

## 2. Audience

| Group | Levels | Primary needs |
|---|---|---|
| Beginners | A1–A2 | Simple explanations, high-frequency vocabulary, sentence building, heavy repetition, translation support where it helps |
| Intermediate | B1–B2 | Fluency, collocations, phrasal verbs, longer listening/reading, recurring-error analysis |
| Advanced | C1–C2 | Precision, register, nuance, authentic texts, argumentation, naturalness vs. correctness |

CEFR is the curriculum framework. Learners can have uneven profiles (for example, B1 reading and A2 listening), so skills are tracked separately.

## 3. Current state (inspection results, 2026-10-16)

| Item | Finding |
|---|---|
| Repository | New. `C:\Users\hp\Desktop\projects` was empty (0 files). Project folder `englishflow-ai/` created with `git init` and a `.gitignore`. |
| Existing code | None |
| Existing docs | None, so no documentation was overwritten |
| package.json / dependencies | None yet |
| Framework / architecture | None yet; chosen in [ARCHITECTURE.md](ARCHITECTURE.md) |
| Local toolchain | Node v22.17.1, npm 11.6.1, git 2.56.0, Python 3.12.10, Windows 11 |

### Gap analysis

Every requirement in the master build prompt is currently **missing**. The table maps each requirement area to the milestone that delivers it.

| Requirement area (master prompt §) | Status | Delivered in |
|---|---|---|
| Public website: home, features, how it works, curriculum overview, pricing, legal placeholders (§5) | Missing | M1 |
| Design system, navigation, responsive shell (§5, §19) | Missing | M1 |
| Sign-up / login, profiles, onboarding (§5, §16, §18) | Missing | M2 |
| Settings and accessibility preferences (§5, §17) | Missing | M2 |
| Curriculum structure A1–C2 + seed content (§9) | Missing | M3 (A1 deep, A2–C2 outlined), expanded continuously |
| Reusable exercise engine, grading, feedback (§7) | Missing | M3 |
| Placement assessment (§6) | Missing | M3 (grammar/vocab/reading), M7 (listening) |
| Skill model and mastery tracking (§6) | Missing | M3 (tracking), M4 (delayed-recall mastery) |
| Vocabulary academy and notebook (§9, §15) | Missing | M4 |
| Spaced repetition and active recall (§8) | Missing | M4 |
| Mistake tracker, notes, bookmarks, custom flashcards (§15) | Missing | M4 |
| Personalized dashboard (§12) | Missing | M5 |
| Recommendation engine (§6) | Missing | M5 |
| Daily study planner (§13) | Missing | M5 |
| Challenges and gamification (§14) | Missing | M5 |
| Study calendar (§5) | Missing | M5 |
| AI tutor, modes, context, memory (§10) | Missing | M6 |
| AI-generated exercises and feedback (§11) | Missing | M6 |
| Grammar academy (§9) | Missing | M3 (lessons), M5 (browsable academy view) |
| Listening lab (§9) | Missing | M7 |
| Pronunciation lab (§9) | Missing | M7 |
| Reading library (§9) | Missing | M7 |
| Writing workshop (§9) | Missing | M7 (needs M6 for AI feedback) |
| Sentence-building studio (§5, §9) | Missing | M3 (word-order and production exercises), M7 (studio view) |
| Conversation / communication practice (§9, §10) | Missing | M7 (needs M6) |
| Progress analytics (§5) | Missing | M8 (basic skill progress from M5) |
| Security review, data deletion/export (§18) | Missing | M2 baseline, M8 review |
| Tests for the 15 acceptance criteria (§20) | Missing | Added per milestone; full suite in M8 |
| README, .env.example, setup/deploy docs (§22) | Missing | M1, updated each milestone |

## 4. Scope strategy

The master prompt describes more than 20 modules and a full A1–C2 curriculum. That's months of engineering and, more importantly, a large amount of **content authoring**. To keep the product genuinely working at every stage:

1. **Build vertically.** Every milestone ends with something a learner can actually use end to end.
2. **Content depth before breadth.** A1 gets fully built lessons first. A2–C2 start as a structured outline (modules, units, concepts, prerequisites), so the taxonomy and recommendation engine work across all levels while content fills in. The curriculum overview page shows which levels have full content.
3. **No placeholder pages.** A module enters the navigation when it works.
4. **Defer infrastructure.** No Redis, queues, microservices or vector database until a measured need appears.

## 5. Accounts, API keys, services and costs

| Service | Purpose | Needed from | Starting cost | Notes |
|---|---|---|---|---|
| **GitHub** | Code hosting, CI (GitHub Actions), Vercel integration | M1 | Free | |
| **Vercel** | Hosting, public URL, preview deploys | First deploy (M1/M2) | Free (Hobby) | Hobby is limited to **non-commercial use**. Upgrade to Pro before charging learners. |
| **Neon** | Managed PostgreSQL (persistent storage) | M2 | Free tier | Check storage/compute limits at signup. Branching is useful for preview environments. |
| **Resend** | Transactional email (verification, password reset) | M2 | Free tier | Needs a verified sending domain for production. A test sender works in development. |
| **Anthropic API** | AI tutor, writing feedback, generated exercises | M6 | Pay-as-you-go | Key is stored only in server env vars. Set a monthly spend limit in the Anthropic Console. |
| **Sentry** | Error monitoring | M8 (optional earlier) | Free tier | PII and learner text scrubbed before sending. |
| **TTS provider** | Generating curriculum audio | M7 | Small, mostly one-off | Audio is generated once by a script and stored, not generated per request. |
| **Object storage** (Vercel Blob or Cloudflare R2) | Audio files, learner recordings if kept | M7 | Free tier / low | |
| **Azure Speech** (optional) | Phoneme-level pronunciation assessment | Post-M7, optional | Pay-as-you-go | Only if real pronunciation scoring is wanted. |
| **Domain name** (optional) | Custom URL instead of `*.vercel.app` | Any time | ~$10–15/year | |

**Free-tier limits and paid prices change.** Check each provider's current pricing page when you sign up. This plan deliberately doesn't quote paid-tier prices it hasn't verified.

### Estimated AI cost

The model is configured by environment variable, so choosing between quality and cost is a configuration change, not a code change. Published Anthropic rates as of 2026-10-06, for a typical tutor turn of about 3,000 input tokens and 500 output tokens:

| Model | Input / output per 1M tokens | Approx. cost per tutor turn | 1,000 turns |
|---|---|---|---|
| Claude Opus 5.5 (`claude-opus-5-5`, default) | $4 / $20 | ~$0.022 | ~$22 |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2 / $10 | ~$0.011 | ~$11 |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 / $0.50 | ~$0.0006 | ~$0.60 |

Prompt caching (stable system prompts) reduces input cost further. Per-user daily token budgets ([ARCHITECTURE.md §7](ARCHITECTURE.md#7-ai-integration)) cap worst-case spend.

**Expected cost to launch a beginner-scale public site: $0/month in hosting, plus AI usage** (a few dollars a month at low traffic on a cheaper model), plus an optional domain.

## 6. Major risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Content volume.** A1–C2 means thousands of lessons, exercises and vocabulary entries. | Highest. Engineering can outpace content. | Content lives in Zod-validated files with a `reviewStatus` field. AI may draft content, but drafts are validated and marked for human review before seeding. Build A1 fully first. The site states which levels are complete. |
| **Scope creep** across 20+ modules | Many half-built features | Milestones are vertical slices. Nav lists only finished modules. "Smaller and working" is the explicit rule (master prompt §21). |
| **Overclaiming** (pronunciation scoring, CEFR certainty, fake progress) | Learner trust, ethics | Honest labels. Placement shown as an estimate with per-skill profile. Mastery requires delayed independent recall. Empty states instead of fake numbers. |
| **AI unreliability** (invalid output, outages, invented grammar rules) | Bad feedback, broken UI | Zod-validated structured outputs, timeouts, retries, deterministic grading wherever possible, NullProvider fallback, prompts that require stating uncertainty and regional variation. |
| **AI cost runaway** | Unexpected bills | Per-user daily token budget, per-minute caps, Anthropic Console spend limit, minimal context retrieval, cached generated exercises. |
| **Spaced-repetition timezone bugs** | Reviews due at wrong times | UTC storage, user IANA timezone on profile, scheduler as pure functions with boundary tests (midnight, DST changes). |
| **Authorization leaks** (one learner reading another's data) | Privacy breach | Repository functions always take a `userId` from the server session, never from the client. Cross-user integration tests in M2 onward. |
| **Unnecessary complexity** | Slower progress for a beginner-maintained project | Single Next.js app, single Postgres database, no Redis/queues/microservices until needed. |
| **Dependency churn** (fast-moving Next.js/auth libraries) | Breakage on upgrade | Pin exact versions at scaffold time. Upgrade deliberately with tests. Check current docs when scaffolding. |
| **Legal** (privacy policy, terms, learner data, recordings) | Compliance | Placeholders clearly marked "requires review". Microphone use explained. Recordings not stored by default. Data export/delete in M8. Human/legal review before launch. |

## 7. Definition of production-ready

The website is considered production-ready only when **all** of the following are true:

**Functionality**
- [ ] All 15 acceptance checks in master prompt §20 are covered by automated tests that pass in CI.
- [ ] At least one CEFR level (A1) has complete, reviewed content. Every other level is clearly labelled with its content status.
- [ ] Every module in the navigation is fully functional. No placeholder pages.
- [ ] The app works with no AI key configured (AI features show a clear setup message).

**Data and reliability**
- [ ] Migrations apply cleanly to a fresh database and to the production database.
- [ ] Seed scripts are idempotent.
- [ ] Database backups / point-in-time restore confirmed on the chosen Neon plan, and a restore has been tested once.
- [ ] Learner progress persists across sessions, devices and deploys.

**Security and privacy**
- [ ] Secrets exist only in environment variables. `.env.example` has no real values.
- [ ] Server-side authorization tested for every learner-data route.
- [ ] Rate limits active on auth and AI routes. Per-user AI budgets enforced.
- [ ] Security headers (CSP, HSTS, frame-ancestors, referrer policy) configured.
- [ ] Error monitoring active with PII/learner-text scrubbing.
- [ ] Learners can export and delete their data.
- [ ] Privacy policy and terms reviewed by a human (legal review recommended) and placeholders removed.

**Quality**
- [ ] axe reports no serious or critical violations on core pages. Keyboard-only walkthrough of core journeys passes.
- [ ] Core pages tested at mobile (≈375px) and desktop (≈1280px) widths.
- [ ] Loading, empty and error states exist for every data-driven view.

**Operations**
- [ ] README setup and DEPLOYMENT_PLAN steps reproduced from scratch on a clean machine/account.
- [ ] Custom domain (if used) with HTTPS. Transactional email from a verified domain.
- [ ] Published list of completed features and known limitations.

## 8. Recommended first milestone

**Milestone 1: Foundation shell.** Scaffold the Next.js + TypeScript + Tailwind project, design tokens and accessible UI primitives, the public website pages, the responsive learner-app shell (navigation listing only implemented areas), test tooling (Vitest, Playwright, axe), CI, README and `.env.example`.

It needs no external accounts and produces a deployable public site. Details are in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md#milestone-1--foundation-shell).
