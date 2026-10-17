"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Optional microphone features. Nothing starts until the learner asks, recordings stay
 * in the browser (never uploaded or saved), and every failure has a plain explanation.
 */

export type RecorderState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "recording"; seconds: number }
  | { status: "recorded"; url: string }
  | { status: "error"; message: string };

const MAX_SECONDS = 10;

export function recordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function micError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access was not allowed. You can allow it in your browser's site settings, or use the text version of this task.";
  if (name === "NotFoundError")
    return "No microphone was found on this device. You can use the text version of this task.";
  return "Recording didn't work on this device. You can use the text version of this task.";
}

/** Record a short clip for playback on this device only. */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>({ status: "idle" });
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const url = useRef<string | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(
    () => () => {
      release();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [release],
  );

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (!recordingSupported()) {
      setState({
        status: "error",
        message: "This browser can't record audio. You can use the text version of this task.",
      });
      return;
    }
    setState({ status: "requesting" });
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      release();
      setState({ status: "error", message: micError(err) });
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current);
    recorder.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      release();
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      setState({ status: "recorded", url: url.current });
    };
    rec.start();
    let seconds = 0;
    setState({ status: "recording", seconds });
    timer.current = setInterval(() => {
      seconds += 1;
      if (seconds >= MAX_SECONDS) rec.stop();
      else setState({ status: "recording", seconds });
    }, 1000);
  }, [release]);

  const discard = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setState({ status: "idle" });
  }, []);

  return { state, start, stop, discard, maxSeconds: MAX_SECONDS };
}

// --- Speech recognition (optional, browser-provided) -------------------------

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export type TranscriptionState =
  | { status: "idle" }
  | { status: "listening" }
  | { status: "done"; transcript: string }
  | { status: "error"; message: string };

/** Ask the browser's speech recognition what it heard. A transcription, never a score. */
export function useTranscription() {
  const [state, setState] = useState<TranscriptionState>({ status: "idle" });
  const rec = useRef<Recognition | null>(null);
  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setState({ status: "error", message: "This browser doesn't offer speech recognition." });
      return;
    }
    const r = new Ctor();
    rec.current = r;
    r.lang = "en-GB";
    r.interimResults = false;
    r.maxAlternatives = 1;
    let heard = "";
    r.onresult = (e) => {
      heard = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    r.onerror = (e) =>
      setState({
        status: "error",
        message:
          e.error === "not-allowed" || e.error === "service-not-allowed"
            ? "Speech recognition wasn't allowed. You can still record and listen to yourself."
            : e.error === "no-speech"
              ? "Nothing was heard. Try again a little closer to the microphone."
              : "Speech recognition didn't work this time. Try again, or record and listen to yourself instead.",
      });
    r.onend = () => setState((s) => (s.status === "listening" ? { status: "done", transcript: heard } : s));
    setState({ status: "listening" });
    r.start();
  }, []);

  return { state, start, reset: () => setState({ status: "idle" }) };
}
