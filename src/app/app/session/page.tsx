import { ArrowRight, CircleCheck, Circle, Clock, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input, Label } from "@/components/ui/form-controls";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  clampSessionMinutes,
  MAX_SESSION,
  MIN_SESSION,
  SESSION_LENGTHS,
  type SessionPlan,
} from "@/lib/learning/planner";
import { requireUser } from "@/server/auth/session";
import { getPreferences, getProfile } from "@/server/db/learner-profile";
import { getCurrentSession, previewSession, type SessionView } from "@/server/db/sessions";
import { endSessionAction, setBlockDoneAction, startSessionAction } from "./actions";

export const metadata: Metadata = { title: "Study session" };

export default async function SessionPage({ searchParams }: PageProps<"/app/session">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const params = await searchParams;
  const [current, prefs] = await Promise.all([getCurrentSession(user.id), getPreferences(user.id)]);
  const planning = params.new === "1" || !current;

  return (
    <Container width="narrow" className="space-y-6 py-8 sm:py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Study session</h1>
        <p className="text-muted mt-2">
          A plan for the time you have, built from your reviews, mistakes and next lesson. Work through the steps in
          order and tick them off as you go.
        </p>
      </div>
      {planning ? (
        <Planner userId={user.id} params={params} defaultMinutes={prefs.dailyMinutes} />
      ) : (
        <Checklist session={current!} />
      )}
    </Container>
  );
}

async function Planner({
  userId,
  params,
  defaultMinutes,
}: {
  userId: string;
  params: Record<string, string | string[] | undefined>;
  defaultMinutes: number;
}) {
  const custom = typeof params.custom === "string" && params.custom.trim() !== "" ? Number(params.custom) : NaN;
  const chosen = typeof params.minutes === "string" ? Number(params.minutes) : NaN;
  const minutes = clampSessionMinutes(
    Number.isFinite(custom) ? custom : Number.isFinite(chosen) ? chosen : defaultMinutes,
  );
  const plan = await previewSession(userId, minutes);
  const isPreset = (SESSION_LENGTHS as readonly number[]).includes(minutes);

  return (
    <>
      <form method="get" className="border-border bg-surface space-y-4 rounded-lg border p-5 sm:p-6">
        {params.new === "1" ? <input type="hidden" name="new" value="1" /> : null}
        <fieldset>
          <legend className="text-ink text-base font-semibold">How much time do you have?</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SESSION_LENGTHS.map((m) => (
              <label
                key={m}
                className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-primary flex cursor-pointer items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
              >
                <input
                  type="radio"
                  name="minutes"
                  value={m}
                  defaultChecked={isPreset && m === minutes}
                  className="accent-primary size-4 focus-visible:outline-none"
                />
                {m} min
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom">Or another length (minutes)</Label>
            <Input
              id="custom"
              name="custom"
              type="number"
              inputMode="numeric"
              min={MIN_SESSION}
              max={MAX_SESSION}
              defaultValue={isPreset ? "" : minutes}
              className="w-32"
            />
          </div>
          <button type="submit" className={buttonClasses({ variant: "secondary" })}>
            Update plan
          </button>
        </div>
      </form>

      <PlanPreview plan={plan} />

      <form action={startSessionAction}>
        <input type="hidden" name="minutes" value={plan.minutes} />
        <SubmitButton className="w-full sm:w-auto">
          Start this {plan.minutes}-minute session <ArrowRight aria-hidden />
        </SubmitButton>
      </form>
    </>
  );
}

function PlanPreview({ plan }: { plan: SessionPlan }) {
  return (
    <section aria-labelledby="preview-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
      <h2 id="preview-heading" className="text-ink text-lg font-semibold">
        Your {plan.minutes}-minute plan
      </h2>
      <ol className="mt-4 space-y-3">
        {plan.blocks.map((b, i) => (
          <li key={b.id} className="border-border flex gap-3 rounded-md border p-3">
            <span className="text-muted w-5 shrink-0 text-sm">{i + 1}.</span>
            <div className="flex-1">
              <p className="text-ink font-medium">{b.title}</p>
              <p className="text-muted mt-0.5 text-sm">{b.description}</p>
            </div>
            <span className="text-muted flex shrink-0 items-center gap-1 text-sm">
              <Clock aria-hidden className="size-4" /> {b.minutes} min
            </span>
          </li>
        ))}
      </ol>
      <PlanNotes notes={plan.notes} />
    </section>
  );
}

function PlanNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="text-muted mt-4 space-y-1 text-sm">
      {notes.map((n) => (
        <li key={n} className="flex gap-2">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" /> {n}
        </li>
      ))}
    </ul>
  );
}

function Checklist({ session }: { session: SessionView }) {
  const { plan } = session;
  const done = new Set(session.completedBlocks);
  const doneMinutes = plan.blocks.filter((b) => done.has(b.id)).reduce((a, b) => a + b.minutes, 0);
  const finished = session.completedAt !== null;
  const allDone = plan.blocks.every((b) => done.has(b.id));

  return (
    <>
      {finished ? (
        <Alert tone="success" title={allDone ? "Session complete — well done." : "Session ended."}>
          {allDone
            ? `You finished all ${plan.blocks.length} steps of your ${plan.minutes}-minute plan.`
            : `You finished ${done.size} of ${plan.blocks.length} steps. That still counts.`}
        </Alert>
      ) : null}
      <section aria-labelledby="checklist-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="checklist-heading" className="text-ink text-lg font-semibold">
            Today&apos;s {plan.minutes}-minute session
          </h2>
          <span className="text-muted text-sm">
            {done.size} of {plan.blocks.length} steps done
          </span>
        </div>
        <ProgressBar
          className="mt-3"
          tone={allDone ? "success" : "primary"}
          value={doneMinutes}
          max={plan.minutes}
          label="Session progress"
        />
        <ol className="mt-5 space-y-3">
          {plan.blocks.map((b, i) => {
            const isDone = done.has(b.id);
            return (
              <li key={b.id} className="border-border rounded-md border p-4">
                <div className="flex gap-3">
                  {isDone ? (
                    <CircleCheck aria-hidden className="text-success mt-0.5 size-5 shrink-0" />
                  ) : (
                    <Circle aria-hidden className="text-muted mt-0.5 size-5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-ink font-medium">
                      <span className="sr-only">Step {i + 1}: </span>
                      {b.title}
                      <span className="text-muted ml-2 text-sm font-normal">{b.minutes} min</span>
                      {isDone ? <span className="sr-only"> (done)</span> : null}
                    </p>
                    <p className="text-muted mt-0.5 text-sm">{b.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={b.href}
                        className={buttonClasses({ size: "sm", variant: isDone ? "secondary" : "primary" })}
                      >
                        Open <span className="sr-only">{b.title}</span>
                        <ArrowRight aria-hidden />
                      </Link>
                      <form action={setBlockDoneAction.bind(null, session.id, b.id, !isDone)}>
                        <SubmitButton size="sm" variant="ghost">
                          {isDone ? "Mark not done" : "Mark done"}
                          <span className="sr-only">: {b.title}</span>
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <PlanNotes notes={plan.notes} />
      </section>
      <div className="flex flex-wrap gap-3">
        {!finished ? (
          <form action={endSessionAction.bind(null, session.id)}>
            <SubmitButton variant="secondary">End session</SubmitButton>
          </form>
        ) : null}
        <Link href="/app/session?new=1" className={buttonClasses({ variant: finished ? "primary" : "ghost" })}>
          Plan another session
        </Link>
      </div>
    </>
  );
}
