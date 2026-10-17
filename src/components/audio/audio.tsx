"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useHydrated } from "@/components/forms/submit-button";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { AudioTrack } from "@/lib/audio/track";
import { type AudioSource, audioController, englishVoices, type PlaybackState } from "./audio-controller";

export type AudioAvailability = "checking" | AudioSource | "none";

const IDLE: PlaybackState = { playingId: null, index: 0, error: null };

// Device voices often load a moment after the page, so they are watched as an external store.
let voiceWaitOver = false;
const voiceListeners = new Set<() => void>();

function subscribeVoices(listener: () => void): () => void {
  voiceListeners.add(listener);
  const notify = () => voiceListeners.forEach((l) => l());
  const synth = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
  synth?.addEventListener("voiceschanged", notify);
  const timer = setTimeout(() => {
    voiceWaitOver = true;
    notify();
  }, 2000);
  return () => {
    voiceListeners.delete(listener);
    synth?.removeEventListener("voiceschanged", notify);
    clearTimeout(timer);
  };
}

function deviceVoiceSnapshot(): AudioAvailability {
  if (!window.speechSynthesis) return "none";
  if (englishVoices().length > 0) return "device";
  return voiceWaitOver ? "none" : "checking";
}

/**
 * How this device can play these tracks: from files when every track has one,
 * otherwise with the device's own English voice, otherwise not at all.
 */
export function useAudioAvailability(tracks: readonly AudioTrack[]): AudioAvailability {
  const hydrated = useHydrated();
  const device = useSyncExternalStore(subscribeVoices, deviceVoiceSnapshot, () => "checking" as const);
  const allFiles = tracks.length > 0 && tracks.every((t) => t.url);
  if (allFiles) return hydrated ? "file" : "checking";
  return device;
}

export function usePlayback(): PlaybackState {
  return useSyncExternalStore(
    (cb) => audioController().subscribe(cb),
    () => audioController().getState(),
    () => IDLE,
  );
}

/** Stop any audio when the component using it goes away. */
export function useStopOnUnmount() {
  useEffect(() => () => audioController().stop(), []);
}

/** Honest label for where the sound comes from. */
export function AudioSourceNote({ source }: { source: AudioAvailability }) {
  if (source === "checking") return null;
  return (
    <p className="text-muted flex items-start gap-1.5 text-xs" data-audio-source={source}>
      <Volume2 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {source === "file"
        ? "Audio: a computer-generated voice, recorded for this activity."
        : source === "device"
          ? "Audio: your device's built-in computer voice. How natural it sounds depends on your device."
          : "Audio isn't available on this device, so the text version is shown instead."}
    </p>
  );
}

/**
 * A play/stop button for some tracks. Renders nothing when the device can't play
 * them, so there is never a control that does nothing.
 */
export function ListenButton({
  id,
  tracks,
  source,
  label = "Listen",
  playingLabel = "Stop",
  rate = 1,
  onFinished,
  onStart,
  variant = "secondary",
  size = "sm",
  className,
  describedBy,
}: {
  id: string;
  tracks: AudioTrack[];
  source: AudioAvailability;
  label?: string;
  playingLabel?: string;
  rate?: number;
  onFinished?: () => void;
  onStart?: () => void;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  describedBy?: string;
}) {
  const playback = usePlayback();
  if (source !== "file" && source !== "device") return null;
  const playing = playback.playingId === id;
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      aria-describedby={describedBy}
      data-audio-state={playing ? "playing" : "idle"}
      onClick={async () => {
        if (playing) {
          audioController().stop();
          return;
        }
        onStart?.();
        const finished = await audioController().play(id, tracks, source, rate);
        if (finished) onFinished?.();
      }}
    >
      {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
      {playing ? playingLabel : label}
    </Button>
  );
}

/** Screen-reader announcements and errors for the page's audio. */
export function PlaybackStatus({ ids, describe }: { ids?: string[]; describe?: (s: PlaybackState) => string }) {
  const playback = usePlayback();
  const mine = playback.playingId && (!ids || ids.includes(playback.playingId));
  return (
    <div>
      <p role="status" className="sr-only">
        {mine ? (describe ? describe(playback) : "Playing audio…") : ""}
      </p>
      {playback.error ? (
        <p role="alert" className="text-danger text-sm">
          {playback.error}
        </p>
      ) : null}
    </div>
  );
}
