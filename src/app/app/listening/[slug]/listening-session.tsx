"use client";

import { ArrowRight, Eye, FileText, Headphones } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  AudioSourceNote,
  ListenButton,
  PlaybackStatus,
  useAudioAvailability,
  usePlayback,
  useStopOnUnmount,
} from "@/components/audio/audio";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { useHydrated } from "@/components/forms/submit-button";
import { DiffLegend, DiffView } from "@/components/labs/lab-parts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form-controls";
import type { AudioTrack } from "@/lib/audio/track";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { compareDictation } from "@/lib/learning/text-diff";
import { cn } from "@/lib/utils/cn";
import { type CompleteListeningResult, completeListeningAction } from "../actions";

interface Item {
  slug: string;
  title: string;
  level: string;
  context: string;
  lines: { speaker: string; text: string }[];
  dictation: number[];
  phrases: { line: number; text: string; meaning: string }[];
}

type Stage = "listen" | "questions" | "review";

/** Split a line into plain text and highlighted phrases (case-insensitive, first match each). */
function highlight(text: string, phrases: string[]): { text: string; phrase: boolean }[] {
  const ranges: [number, number][] = [];
  for (const p of phrases) {
    const at = text.toLowerCase().indexOf(p.toLowerCase());
    if (at >= 0 && !ranges.some(([s, e]) => at < e && at + p.length > s)) ranges.push([at, at + p.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: { text: string; phrase: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of ranges) {
    if (s > pos) out.push({ text: text.slice(pos, s), phrase: false });
    out.push({ text: text.slice(s, e), phrase: true });
    pos = e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), phrase: false });
  return out;
}

export function ListeningSession({
  item,
  tracks,
  questions,
  expectedQuestions,
  next,
}: {
  item: Item;
  tracks: AudioTrack[];
  questions: ClientExercise[];
  expectedQuestions: number;
  next: { slug: string; title: string } | null;
}) {
  useStopOnUnmount();
  const hydrated = useHydrated();
  const source = useAudioAvailability(tracks);
  const playback = usePlayback();
  const [chosenText, setChosenText] = useState(false);
  const audio = (source === "file" || source === "device") && !chosenText;
  const mode: "audio" | "text" = audio ? "audio" : "text";
  const [stage, setStage] = useState<Stage>("listen");
  const [plays, setPlays] = useState(0);
  const [slow, setSlow] = useState(false);
  const [transcriptEarly, setTranscriptEarly] = useState(false);
  const [first, setFirst] = useState<Record<string, boolean>>({});
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [result, setResult] = useState<CompleteListeningResult | null>(null);
  const [pending, startTransition] = useTransition();
  const questionsRef = useRef<HTMLHeadingElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);

  const rate = slow ? 0.8 : 1;
  const answered = Object.keys(first).length;
  const allAnswered = questions.length > 0 && answered >= questions.length;
  const showTranscript = mode === "text" || stage === "review" || transcriptEarly;
  const playingLine = (i: number) => playback.playingId === `line-${i}`;

  function goTo(next: Stage) {
    setStage(next);
    requestAnimationFrame(() => (next === "questions" ? questionsRef : reviewRef).current?.focus());
  }

  function finish() {
    startTransition(async () => {
      const res = await completeListeningAction({
        slug: item.slug,
        mode,
        plays,
        transcriptEarly,
        dictation: Object.entries(typed).map(([line, text]) => ({ line: Number(line), typed: text })),
      });
      setResult(res);
    });
  }

  const transcript = (
    <ol className="space-y-2" aria-label="Transcript">
      {item.lines.map((l, i) => {
        const linePhrases = item.phrases.filter((p) => p.line === i).map((p) => p.text);
        return (
          <li
            key={i}
            className={cn(
              "flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md p-2",
              playingLine(i) || (playback.playingId === "all" && playback.index === i) ? "bg-primary-soft" : "",
            )}
          >
            <span className="text-muted w-28 shrink-0 text-sm font-semibold">{l.speaker}</span>
            <span className="text-ink min-w-0 flex-1">
              {highlight(l.text, stage === "review" ? linePhrases : []).map((part, k) =>
                part.phrase ? (
                  <mark key={k} className="bg-accent-soft text-ink rounded-sm px-0.5">
                    {part.text}
                  </mark>
                ) : (
                  <span key={k}>{part.text}</span>
                ),
              )}
            </span>
            {audio ? (
              <ListenButton
                id={`line-${i}`}
                tracks={[tracks[i]]}
                source={source}
                rate={rate}
                label="Play line"
                variant="ghost"
                className="shrink-0"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{item.level}</Badge>
          <Badge>{mode === "audio" ? "Listening" : "Reading the transcript"}</Badge>
        </div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{item.title}</h1>
        <p className="text-ink">{item.context}</p>
      </div>

      {questions.length < expectedQuestions ? (
        <Alert tone="warning" title="Some questions aren't available yet">
          The questions for this activity haven&apos;t been loaded on this site yet. You can still listen and use the
          transcript.
        </Alert>
      ) : null}

      <section aria-labelledby="listen-heading" className="border-border bg-surface space-y-4 rounded-lg border p-5">
        <h2 id="listen-heading" className="text-ink flex items-center gap-2 text-lg font-semibold">
          <Headphones aria-hidden className="text-primary size-5" /> 1. Listen
        </h2>
        {source === "checking" ? (
          <p className="text-muted text-sm">Checking whether this device can play audio…</p>
        ) : audio ? (
          <>
            <p className="text-ink text-sm">
              Listen without reading first. Try to understand the main idea, then listen again for details.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ListenButton
                id="all"
                tracks={tracks}
                source={source}
                rate={rate}
                label={plays === 0 ? "Play the recording" : "Play again"}
                variant="primary"
                size="md"
                onStart={() => setPlays((n) => n + 1)}
              />
              <label className="text-ink flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={slow}
                  onChange={(e) => setSlow(e.target.checked)}
                  className="accent-primary size-4"
                />
                Slower
              </label>
              <span className="text-muted text-sm" aria-live="polite" data-plays={plays}>
                {plays === 0 ? "Not played yet" : plays === 1 ? "Played once" : `Played ${plays} times`}
              </span>
            </div>
            <PlaybackStatus
              describe={(s) =>
                s.playingId === "all" ? `Playing line ${s.index + 1} of ${tracks.length}` : "Playing one line"
              }
            />
            <AudioSourceNote source={source} />
            <button
              type="button"
              className="text-primary text-sm underline-offset-4 hover:underline"
              onClick={() => setChosenText(true)}
            >
              Can&apos;t listen right now? Read the transcript instead
            </button>
          </>
        ) : (
          <>
            {source === "none" ? <AudioSourceNote source={source} /> : null}
            <p className="text-ink text-sm">
              <FileText aria-hidden className="mr-1 inline size-4" />
              Read the conversation, then answer the questions. This counts as reading practice, not listening.
            </p>
            {transcript}
            {chosenText && (source === "file" || source === "device") ? (
              <button
                type="button"
                className="text-primary text-sm underline-offset-4 hover:underline"
                onClick={() => setChosenText(false)}
              >
                Switch back to listening
              </button>
            ) : null}
          </>
        )}
        {stage === "listen" && source !== "checking" ? (
          <Button onClick={() => goTo("questions")} disabled={!hydrated} variant={audio ? "secondary" : "primary"}>
            Answer the questions <ArrowRight aria-hidden />
          </Button>
        ) : null}
      </section>

      {stage !== "listen" ? (
        <section aria-labelledby="questions-heading" className="space-y-4">
          <h2
            id="questions-heading"
            ref={questionsRef}
            tabIndex={-1}
            className="text-ink text-lg font-semibold focus:outline-none"
          >
            2. Questions
          </h2>
          {audio ? <p className="text-muted text-sm">You can play the recording again at any time.</p> : null}
          <ol className="space-y-6">
            {questions.map((q, i) => (
              <li key={q.id}>
                <ExerciseCard
                  exercise={q}
                  label={`Question ${i + 1} of ${questions.length}`}
                  allowHints={false}
                  context="lab"
                  onResult={(r) => setFirst((prev) => (q.id in prev ? prev : { ...prev, [q.id]: r.correct }))}
                />
              </li>
            ))}
          </ol>
          {audio && !transcriptEarly && stage === "questions" && !allAnswered ? (
            <button
              type="button"
              className="text-muted inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
              onClick={() => setTranscriptEarly(true)}
            >
              <Eye aria-hidden className="size-4" /> I&apos;m stuck — show the transcript now
            </button>
          ) : null}
          {audio && transcriptEarly && stage === "questions" ? transcript : null}
          {stage === "questions" ? (
            <Button onClick={() => goTo("review")} disabled={!allAnswered && questions.length > 0}>
              {allAnswered || questions.length === 0
                ? "Check the transcript"
                : `Answer all questions to continue (${answered} of ${questions.length})`}
            </Button>
          ) : null}
        </section>
      ) : null}

      {stage === "review" ? (
        <section aria-labelledby="review-heading" className="space-y-6">
          <h2
            id="review-heading"
            ref={reviewRef}
            tabIndex={-1}
            className="text-ink text-lg font-semibold focus:outline-none"
          >
            3. Transcript and useful phrases
          </h2>
          {showTranscript && mode === "audio" ? transcript : null}
          <div className="border-border bg-surface rounded-lg border p-5">
            <h3 className="text-ink mb-3 font-semibold">Useful phrases</h3>
            <dl className="space-y-3">
              {item.phrases.map((p) => (
                <div key={`${p.line}-${p.text}`}>
                  <dt className="text-ink font-medium">
                    <mark className="bg-accent-soft rounded-sm px-0.5">{p.text}</mark>
                  </dt>
                  <dd className="text-muted text-sm">{p.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          {mode === "audio" ? (
            <div className="space-y-4">
              <h3 className="text-ink font-semibold">4. Dictation</h3>
              <p className="text-muted text-sm">
                Play the sentence, then write exactly what you hear. Capital letters and punctuation don&apos;t count.
              </p>
              {item.dictation.map((line, n) => {
                const value = typed[line] ?? "";
                const comparison = checked[line] ? compareDictation(item.lines[line].text, value) : null;
                return (
                  <div key={line} className="border-border bg-surface space-y-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-ink text-sm font-semibold">Sentence {n + 1}</span>
                      <ListenButton
                        id={`line-${line}`}
                        tracks={[tracks[line]]}
                        source={source}
                        rate={rate}
                        label="Play sentence"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`dictation-${line}`}>What you hear</Label>
                      <Textarea
                        id={`dictation-${line}`}
                        rows={2}
                        maxLength={500}
                        value={value}
                        onChange={(e) => {
                          setTyped((t) => ({ ...t, [line]: e.target.value }));
                          setChecked((c) => ({ ...c, [line]: false }));
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!value.trim()}
                      onClick={() => setChecked((c) => ({ ...c, [line]: true }))}
                    >
                      Check
                    </Button>
                    {comparison ? (
                      <div
                        aria-live="polite"
                        className="space-y-2"
                        data-dictation-result={comparison.summary.exact ? "exact" : "diff"}
                      >
                        <p className="text-ink text-sm font-semibold">
                          {comparison.summary.exact
                            ? "Exactly right."
                            : `${comparison.summary.correct} of ${comparison.summary.total} words right.`}
                        </p>
                        {!comparison.summary.exact ? (
                          <>
                            <DiffView ops={comparison.ops} />
                            <DiffLegend />
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {result?.ok ? (
            <Alert tone="success" title="Saved">
              {result.result.correct} of {result.result.total} questions right first time
              {result.result.dictation.length
                ? ` · dictation ${Math.round(
                    (result.result.dictation.reduce((s, d) => s + d.accuracy, 0) / result.result.dictation.length) *
                      100,
                  )}% of words right`
                : ""}
              .{" "}
              {result.result.correct < result.result.total
                ? "Listening again to the lines you missed is a good next step."
                : "Well understood."}
            </Alert>
          ) : (
            <div className="space-y-2">
              {result && !result.ok ? (
                <p role="alert" className="text-danger text-sm">
                  {result.error}
                </p>
              ) : null}
              <Button onClick={finish} disabled={pending || !hydrated}>
                {pending ? "Saving…" : "Finish and save"}
              </Button>
            </div>
          )}
          {result?.ok ? (
            <div className="flex flex-wrap gap-3">
              {next ? (
                <Link href={`/app/listening/${next.slug}`} className={buttonClasses()}>
                  Next: {next.title} <ArrowRight aria-hidden />
                </Link>
              ) : null}
              <Link href="/app/listening" className={buttonClasses({ variant: "secondary" })}>
                All listening
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
