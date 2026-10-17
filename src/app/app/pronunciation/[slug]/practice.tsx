"use client";

import { type IntonationSet, type MinimalPairSet, pairWordsIn, type StressSet } from "@content/labs/schemas";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import {
  AudioSourceNote,
  ListenButton,
  PlaybackStatus,
  useAudioAvailability,
  useStopOnUnmount,
} from "@/components/audio/audio";
import { useHydrated } from "@/components/forms/submit-button";
import { SpeakingTask } from "@/components/labs/speaking-task";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AudioTrack } from "@/lib/audio/track";
import { cn } from "@/lib/utils/cn";
import { recordPronunciationAction } from "../actions";

type Activity = "hear" | "spelling" | "stress" | "intonation";

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A single multiple-choice check, used for quiz rounds and text alternatives. */
function ChoiceCheck({
  question,
  options,
  correct,
  explanation,
  onAnswered,
  columns = false,
}: {
  question: React.ReactNode;
  options: { id: string; label: React.ReactNode }[];
  correct: string;
  explanation?: React.ReactNode;
  onAnswered?: (right: boolean) => void;
  columns?: boolean;
}) {
  const name = useId();
  const hydrated = useHydrated();
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const right = choice === correct;
  return (
    <form
      method="post"
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!choice || checked) return;
        setChecked(true);
        onAnswered?.(choice === correct);
      }}
    >
      <fieldset>
        <legend className="text-ink text-sm font-medium">{question}</legend>
        <div className={cn("mt-2 flex flex-wrap gap-2", columns ? "flex-col" : "")}>
          {options.map((o) => (
            <label
              key={o.id}
              className={cn(
                "border-border-strong text-ink has-[:checked]:border-primary has-[:checked]:bg-primary-soft flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                checked && o.id === correct ? "border-success" : "",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                disabled={checked}
                checked={choice === o.id}
                onChange={() => setChoice(o.id)}
                className="accent-primary size-4"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      {!checked ? (
        <Button type="submit" size="sm" variant="secondary" disabled={!hydrated || !choice}>
          Check
        </Button>
      ) : (
        <div aria-live="polite" className={cn("rounded-md p-3 text-sm", right ? "bg-success-soft" : "bg-danger-soft")}>
          <p className={cn("flex items-center gap-1.5 font-semibold", right ? "text-success" : "text-danger")}>
            {right ? <CheckCircle2 aria-hidden className="size-4" /> : <CircleAlert aria-hidden className="size-4" />}
            {right ? "Correct" : "Not quite"}
          </p>
          {explanation ? <div className="text-ink mt-1">{explanation}</div> : null}
        </div>
      )}
    </form>
  );
}

/** A round of questions with a score at the end, saved as a practice record. */
function useRound(setSlug: string, activity: Activity, mode: "audio" | "text", total: number) {
  const [results, setResults] = useState<boolean[]>([]);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  function answer(right: boolean) {
    setResults((prev) => {
      const next = [...prev, right];
      if (next.length === total && !saved) {
        setSaved(true);
        startTransition(async () => {
          await recordPronunciationAction({
            setSlug,
            activity,
            mode,
            correct: next.filter(Boolean).length,
            total,
          });
        });
      }
      return next;
    });
  }
  function reset() {
    setResults([]);
    setSaved(false);
  }
  return { results, answer, reset, done: results.length >= total, score: results.filter(Boolean).length };
}

function RoundResult({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  return (
    <Alert tone={score === total ? "success" : "info"} title={`${score} of ${total} right`}>
      <p>This is your practice record, saved for you — not a pronunciation score.</p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={onRestart}>
        Practise again
      </Button>
    </Alert>
  );
}

// --- Minimal pairs -------------------------------------------------------------

export function MinimalPairsPractice({
  set,
  wordTracks,
  sentenceTracks,
}: {
  set: MinimalPairSet;
  wordTracks: Record<string, AudioTrack>;
  sentenceTracks: AudioTrack[];
}) {
  useStopOnUnmount();
  const all = useMemo(() => [...Object.values(wordTracks), ...sentenceTracks], [wordTracks, sentenceTracks]);
  const source = useAudioAvailability(all);
  const audio = source === "file" || source === "device";
  const [a, b] = set.sounds;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        {set.sounds.map((s) => (
          <div key={s.symbol} className="border-border bg-surface rounded-lg border p-4">
            <p className="text-ink text-xl font-semibold">
              {s.symbol} <span className="text-muted text-base font-normal">{s.name}</span>
            </p>
            <p className="text-ink mt-1 text-sm">{s.howTo}</p>
          </div>
        ))}
      </div>
      <p className="text-ink text-sm">{set.tip}</p>

      <section aria-labelledby="pairs-heading" className="space-y-3">
        <h2 id="pairs-heading" className="text-ink text-lg font-semibold">
          The pairs
        </h2>
        <AudioSourceNote source={source} />
        <PlaybackStatus />
        <table className="border-border bg-surface w-full rounded-lg border text-left">
          <caption className="sr-only">
            Word pairs: {a.symbol} and {b.symbol}
          </caption>
          <thead>
            <tr className="border-border border-b">
              <th scope="col" className="text-muted p-3 text-sm font-semibold">
                {a.symbol} {a.name}
              </th>
              <th scope="col" className="text-muted p-3 text-sm font-semibold">
                {b.symbol} {b.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {set.pairs.map(([x, y]) => (
              <tr key={`${x}-${y}`} className="border-border border-b last:border-0">
                {[x, y].map((w) => (
                  <td key={w} className="p-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-ink min-w-16 font-medium">{w}</span>
                      <ListenButton
                        id={`word-${w}`}
                        tracks={[wordTracks[w]]}
                        source={source}
                        label="Listen"
                        variant="ghost"
                        describedBy={undefined}
                      />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {audio ? <HearQuiz set={set} wordTracks={wordTracks} source={source} /> : null}
      <SpellingQuiz set={set} />

      <section aria-labelledby="say-heading" className="space-y-3">
        <h2 id="say-heading" className="text-ink text-lg font-semibold">
          Say it
        </h2>
        <p className="text-muted text-sm">Say each sentence slowly, then at normal speed. Recording is optional.</p>
        {set.sentences.map((s, i) => {
          const [first, second] = pairWordsIn(s, set.pairs);
          const options = shuffleStable([first[0], second[0]], s);
          return (
            <SpeakingTask
              key={s}
              id={`${set.slug}-${i}`}
              text={s}
              modelTracks={[sentenceTracks[i]]}
              source={source}
              alternative={
                <ChoiceCheck
                  question={
                    <>
                      Which word in this sentence has the sound {b.symbol} ({b.name})?
                    </>
                  }
                  options={options.map((w) => ({ id: w, label: w }))}
                  correct={second[0]}
                  explanation={`“${second[0]}” has ${b.symbol}; “${first[0]}” has ${a.symbol}.`}
                />
              }
            />
          );
        })}
      </section>
    </div>
  );
}

/** Same order on server and client (no hydration mismatch). */
function shuffleStable<T>(items: T[], seed: string): T[] {
  return seed.length % 2 === 0 ? items : [...items].reverse();
}

function HearQuiz({
  set,
  wordTracks,
  source,
}: {
  set: MinimalPairSet;
  wordTracks: Record<string, AudioTrack>;
  source: "file" | "device";
}) {
  const ROUNDS = Math.min(6, set.pairs.length);
  const [rounds, setRounds] = useState<{ pair: [string, string]; target: 0 | 1 }[] | null>(null);
  const [key, setKey] = useState(0);
  const round = useRound(set.slug, "hear", "audio", ROUNDS);
  const start = () => {
    setRounds(
      shuffle(set.pairs)
        .slice(0, ROUNDS)
        .map((pair) => ({ pair, target: Math.random() < 0.5 ? 0 : 1 })),
    );
    setKey((k) => k + 1);
  };
  const current = rounds?.[round.results.length];

  return (
    <section aria-labelledby="hear-heading" className="border-border bg-surface space-y-3 rounded-lg border p-5">
      <h2 id="hear-heading" className="text-ink text-lg font-semibold">
        Which word do you hear?
      </h2>
      {!rounds ? (
        <>
          <p className="text-muted text-sm">
            You&apos;ll hear one word from a pair. Choose the one you heard. {ROUNDS} rounds.
          </p>
          <Button onClick={start}>Start</Button>
        </>
      ) : round.done ? (
        <RoundResult
          score={round.score}
          total={ROUNDS}
          onRestart={() => {
            round.reset();
            start();
          }}
        />
      ) : current ? (
        <div key={`${key}-${round.results.length}`} className="space-y-3">
          <p className="text-muted text-sm">
            Round {round.results.length + 1} of {ROUNDS}
          </p>
          <ListenButton
            id={`quiz-${round.results.length}`}
            tracks={[wordTracks[current.pair[current.target]]]}
            source={source}
            label="Play the word"
            variant="primary"
          />
          <ChoiceCheck
            question="Which word was it?"
            options={current.pair.map((w) => ({ id: w, label: w }))}
            correct={current.pair[current.target]}
            explanation={`It was “${current.pair[current.target]}”.`}
            onAnswered={(right) => setTimeout(() => round.answer(right), 900)}
          />
        </div>
      ) : null}
    </section>
  );
}

function SpellingQuiz({ set }: { set: MinimalPairSet }) {
  const [a, b] = set.sounds;
  const [started, setStarted] = useState(false);
  const [rounds] = useState(() => set.pairs.map((pair, i) => ({ pair, ask: (i % 2) as 0 | 1 })));
  const round = useRound(set.slug, "spelling", "text", rounds.length);
  const current = rounds[round.results.length];
  return (
    <section aria-labelledby="spelling-heading" className="border-border bg-surface space-y-3 rounded-lg border p-5">
      <h2 id="spelling-heading" className="text-ink text-lg font-semibold">
        Sound and spelling (no audio needed)
      </h2>
      {!started ? (
        <>
          <p className="text-muted text-sm">
            Read each pair and choose the word with the sound asked for. {rounds.length} questions.
          </p>
          <Button variant="secondary" onClick={() => setStarted(true)}>
            Start
          </Button>
        </>
      ) : round.done ? (
        <RoundResult score={round.score} total={rounds.length} onRestart={round.reset} />
      ) : current ? (
        <div key={round.results.length} className="space-y-2">
          <p className="text-muted text-sm">
            Question {round.results.length + 1} of {rounds.length}
          </p>
          <ChoiceCheck
            question={`Which word has the sound ${set.sounds[current.ask].symbol} (${set.sounds[current.ask].name})?`}
            options={current.pair.map((w) => ({ id: w, label: w }))}
            correct={current.pair[current.ask]}
            explanation={`“${current.pair[0]}” has ${a.symbol} and “${current.pair[1]}” has ${b.symbol}.`}
            onAnswered={(right) => setTimeout(() => round.answer(right), 900)}
          />
        </div>
      ) : null}
    </section>
  );
}

// --- Word stress ---------------------------------------------------------------

function stressed(syllables: string[], index: number) {
  return syllables.map((s, i) => (i === index ? s.toUpperCase() : s)).join("·");
}

export function StressPractice({ set, wordTracks }: { set: StressSet; wordTracks: AudioTrack[] }) {
  useStopOnUnmount();
  const source = useAudioAvailability(wordTracks);
  const round = useRound(set.slug, "stress", "text", set.items.length);
  return (
    <div className="space-y-8">
      <p className="text-ink">{set.explanation}</p>
      <AudioSourceNote source={source} />
      <PlaybackStatus />
      <section aria-labelledby="stress-quiz" className="space-y-4">
        <h2 id="stress-quiz" className="text-ink text-lg font-semibold">
          Which syllable is stressed?
        </h2>
        <ol className="space-y-4">
          {set.items.map((item, i) => (
            <li key={item.word} className="border-border bg-surface space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-ink text-lg font-semibold">{item.word}</span>
                <ListenButton id={`stress-${i}`} tracks={[wordTracks[i]]} source={source} label="Listen" />
              </div>
              <ChoiceCheck
                question={`Which syllable is stressed in “${item.word}”?`}
                options={item.syllables.map((s, k) => ({ id: String(k), label: s }))}
                correct={String(item.stressed)}
                explanation={<>It&apos;s {stressed(item.syllables, item.stressed)}.</>}
                onAnswered={round.answer}
              />
            </li>
          ))}
        </ol>
        {round.done ? (
          <Alert
            tone={round.score === set.items.length ? "success" : "info"}
            title={`${round.score} of ${set.items.length} right`}
          >
            Saved as practice. Say each word aloud with the stress in the right place.
          </Alert>
        ) : null}
      </section>
      <section aria-labelledby="stress-say" className="space-y-3">
        <h2 id="stress-say" className="text-ink text-lg font-semibold">
          Say it
        </h2>
        {set.items.slice(0, 4).map((item, i) => (
          <SpeakingTask
            key={item.word}
            id={`${set.slug}-${i}`}
            text={item.word}
            modelTracks={[wordTracks[i]]}
            source={source}
            alternative={
              <p className="text-ink text-sm">
                Write the word with the stressed syllable in capitals, then check: it&apos;s{" "}
                <SpoilerText text={stressed(item.syllables, item.stressed)} />.
              </p>
            }
          />
        ))}
      </section>
    </div>
  );
}

/** Hidden until the learner chooses to see it. */
function SpoilerText({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  return shown ? (
    <strong>{text}</strong>
  ) : (
    <button type="button" className="text-primary underline underline-offset-4" onClick={() => setShown(true)}>
      show the answer
    </button>
  );
}

// --- Intonation ------------------------------------------------------------------

const PATTERN_LABEL = {
  rise: (
    <>
      <ArrowUpRight aria-hidden className="size-4" /> Goes up
    </>
  ),
  fall: (
    <>
      <ArrowDownRight aria-hidden className="size-4" /> Goes down
    </>
  ),
};

export function IntonationPractice({ set, tracks }: { set: IntonationSet; tracks: AudioTrack[] }) {
  useStopOnUnmount();
  const source = useAudioAvailability(tracks);
  const round = useRound(set.slug, "intonation", "text", set.items.length);
  return (
    <div className="space-y-8">
      <p className="text-ink">{set.explanation}</p>
      <AudioSourceNote source={source} />
      <p className="text-muted text-sm">
        Computer voices don&apos;t always use natural intonation, so trust the explanation if the audio sounds odd.
      </p>
      <PlaybackStatus />
      <section aria-labelledby="intonation-quiz" className="space-y-4">
        <h2 id="intonation-quiz" className="text-ink text-lg font-semibold">
          Up or down at the end?
        </h2>
        <ol className="space-y-4">
          {set.items.map((item, i) => (
            <li key={item.sentence} className="border-border bg-surface space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-ink text-lg font-medium">{item.sentence}</span>
                <ListenButton id={`into-${i}`} tracks={[tracks[i]]} source={source} label="Listen" />
              </div>
              <ChoiceCheck
                question="How does the voice usually move at the end?"
                options={[
                  { id: "rise", label: PATTERN_LABEL.rise },
                  { id: "fall", label: PATTERN_LABEL.fall },
                ]}
                correct={item.pattern}
                explanation={item.why}
                onAnswered={round.answer}
              />
            </li>
          ))}
        </ol>
        {round.done ? (
          <Alert
            tone={round.score === set.items.length ? "success" : "info"}
            title={`${round.score} of ${set.items.length} right`}
          >
            Saved as practice.
          </Alert>
        ) : null}
      </section>
      <section aria-labelledby="intonation-say" className="space-y-3">
        <h2 id="intonation-say" className="text-ink text-lg font-semibold">
          Say it
        </h2>
        {set.items.slice(0, 4).map((item, i) => (
          <SpeakingTask
            key={item.sentence}
            id={`${set.slug}-${i}`}
            text={item.sentence}
            modelTracks={[tracks[i]]}
            source={source}
            alternative={
              <p className="text-ink text-sm">
                Write the question and draw an arrow at the end showing up (↗) or down (↘), then check:{" "}
                <SpoilerText text={item.pattern === "rise" ? "↗ up" : "↘ down"} />.
              </p>
            }
          />
        ))}
      </section>
    </div>
  );
}
