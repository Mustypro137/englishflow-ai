"use client";

import { Mic, Square, Trash2 } from "lucide-react";
import { type ReactNode, useId, useState, useSyncExternalStore } from "react";
import { type AudioAvailability, ListenButton } from "@/components/audio/audio";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AudioTrack } from "@/lib/audio/track";
import { diffWords, summarizeDiff } from "@/lib/learning/text-diff";
import { DiffView } from "./lab-parts";
import { recognitionSupported, recordingSupported, useRecorder, useTranscription } from "./use-recorder";

const noSubscribe = () => () => {};

/**
 * Say something aloud: model audio, optional recording for self-comparison, optional
 * speech-recognition transcript — and always a text alternative, so speaking is never required.
 */
export function SpeakingTask({
  id,
  text,
  modelTracks,
  source,
  alternative,
}: {
  id: string;
  text: string;
  modelTracks: AudioTrack[];
  source: AudioAvailability;
  /** An equivalent task without speaking. */
  alternative: ReactNode;
}) {
  const ids = useId();
  const recorder = useRecorder();
  const transcription = useTranscription();
  const [explained, setExplained] = useState(false);
  const [sttExplained, setSttExplained] = useState(false);
  const support = {
    record: useSyncExternalStore(noSubscribe, recordingSupported, () => false),
    stt: useSyncExternalStore(noSubscribe, recognitionSupported, () => false),
  };
  const rec = recorder.state;
  const heard = transcription.state.status === "done" ? transcription.state.transcript : null;
  const comparison = heard !== null ? diffWords(text, heard) : null;

  return (
    <div className="border-border bg-surface space-y-4 rounded-lg border p-4" data-speaking-task>
      <p className="text-ink text-lg font-medium">{text}</p>
      <div className="flex flex-wrap gap-2">
        <ListenButton id={`model-${id}`} tracks={modelTracks} source={source} label="Listen to the model" />
        {support.record && !explained && rec.status === "idle" ? (
          <Button size="sm" variant="secondary" onClick={() => setExplained(true)}>
            <Mic aria-hidden /> Record yourself
          </Button>
        ) : null}
      </div>

      {explained && rec.status === "idle" ? (
        <Alert tone="info" title="About recording">
          <p>
            Your browser will ask to use your microphone. The recording stays on this device: it isn&apos;t uploaded or
            saved, and it&apos;s deleted when you leave the page. Play it back and compare it with the model.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={recorder.start}>
              <Mic aria-hidden /> Allow the microphone and record
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExplained(false)}>
              Not now
            </Button>
          </div>
        </Alert>
      ) : null}

      {rec.status === "requesting" ? <p className="text-muted text-sm">Waiting for microphone permission…</p> : null}
      {rec.status === "recording" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-danger flex items-center gap-1.5 text-sm font-medium">
            <span aria-hidden className="bg-danger size-2.5 animate-pulse rounded-full motion-reduce:animate-none" />
            Recording… {recorder.maxSeconds - rec.seconds}s left
          </p>
          <Button size="sm" variant="secondary" onClick={recorder.stop}>
            <Square aria-hidden /> Stop
          </Button>
        </div>
      ) : null}
      {rec.status === "recorded" ? (
        <div className="space-y-2">
          <p className="text-ink text-sm font-medium" id={`${ids}-rec`}>
            Your recording
          </p>
          <audio controls src={rec.url} aria-labelledby={`${ids}-rec`} className="w-full max-w-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={recorder.start}>
              <Mic aria-hidden /> Record again
            </Button>
            <Button size="sm" variant="ghost" onClick={recorder.discard}>
              <Trash2 aria-hidden /> Delete recording
            </Button>
          </div>
        </div>
      ) : null}
      {rec.status === "error" ? (
        <p role="alert" className="text-danger text-sm">
          {rec.message}
        </p>
      ) : null}

      {support.stt ? (
        <div className="space-y-2">
          {!sttExplained ? (
            <button
              type="button"
              className="text-primary text-sm underline-offset-4 hover:underline"
              onClick={() => setSttExplained(true)}
            >
              Optional: see what speech recognition hears
            </button>
          ) : (
            <div className="border-border space-y-2 rounded-md border p-3">
              <p className="text-ink text-sm">
                <strong>This is transcription, not a pronunciation score.</strong> Your browser&apos;s speech
                recognition turns speech into text. It can mishear good pronunciation and accept unclear speech. In some
                browsers (for example Chrome), the audio is sent to the browser maker&apos;s servers to do this.
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={transcription.state.status === "listening"}
                onClick={transcription.start}
              >
                <Mic aria-hidden />
                {transcription.state.status === "listening"
                  ? "Listening… say the sentence"
                  : "Say it for transcription"}
              </Button>
              {transcription.state.status === "error" ? (
                <p role="alert" className="text-danger text-sm">
                  {transcription.state.message}
                </p>
              ) : null}
              {comparison ? (
                <div aria-live="polite" className="space-y-1">
                  <p className="text-muted text-sm">
                    It heard: <span className="text-ink">{heard || "(nothing)"}</span>
                  </p>
                  {summarizeDiff(comparison).exact ? (
                    <p className="text-ink text-sm">The transcript matches the sentence.</p>
                  ) : (
                    <>
                      <p className="text-muted text-sm">Compared with the sentence:</p>
                      <DiffView ops={comparison} />
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="border-border space-y-2 border-t pt-3" data-text-alternative>
        <p className="text-muted text-sm font-medium">
          Can&apos;t or don&apos;t want to speak right now? Do this instead:
        </p>
        {alternative}
      </div>
    </div>
  );
}
