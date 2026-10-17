/**
 * Plays audio tracks one after another, from pre-generated files or the device's own
 * speech voice. One controller per page, so starting new audio stops the old.
 * Browser-only (used from client components).
 */
import type { Voice } from "@content/schemas";
import type { AudioTrack } from "@/lib/audio/track";

export type AudioSource = "file" | "device";

export interface PlaybackState {
  /** Id of what's playing (a player or a single line), or null when idle. */
  playingId: string | null;
  /** Index of the track being played within that id's tracks. */
  index: number;
  /** Set when playback failed (e.g. a file couldn't load). */
  error: string | null;
}

type Listener = (s: PlaybackState) => void;

const FEMALE_HINTS =
  /female|woman|samantha|victoria|karen|moira|tessa|serena|kate|susan|hazel|zira|libby|sonia|jenny|aria|natasha|emma|amy|joanna|salli|kimberly|fiona|martha/i;
const MALE_HINTS =
  /\bmale\b|\bman\b|daniel|alex\b|fred|oliver|george|ryan|guy|david|mark|thomas|arthur|brian|matthew|joey|justin|rishi|aaron/i;

/** English voices, British first. */
export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort(
      (a, b) =>
        Number(b.lang === "en-GB") - Number(a.lang === "en-GB") || Number(b.localService) - Number(a.localService),
    );
}

/**
 * Pick a device voice for a speaker. Browsers don't say which voices sound female or
 * male, so names are used as hints; if nothing matches, different speakers get
 * different voices (or a different pitch when there's only one voice).
 */
export function pickDeviceVoice(
  voices: SpeechSynthesisVoice[],
  voice: Voice,
): { voice: SpeechSynthesisVoice | null; pitch: number } {
  if (voices.length === 0) return { voice: null, pitch: 1 };
  const hint = voice === "female" ? FEMALE_HINTS : MALE_HINTS;
  const other = voice === "female" ? MALE_HINTS : FEMALE_HINTS;
  const match = voices.find((v) => hint.test(v.name) && !(voice === "male" && FEMALE_HINTS.test(v.name)));
  if (match) return { voice: match, pitch: 1 };
  const neutral = voices.filter((v) => !other.test(v.name));
  if (neutral.length >= 2) return { voice: voice === "female" ? neutral[0] : neutral[1], pitch: 1 };
  return { voice: neutral[0] ?? voices[0], pitch: voice === "female" ? 1.15 : 0.85 };
}

/** Split long text into sentences: some browsers stop speaking very long utterances. */
function chunks(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g)?.map((p) => p.trim()) ?? [text];
  return parts.filter(Boolean);
}

class AudioController {
  private state: PlaybackState = { playingId: null, index: 0, error: null };
  private listeners = new Set<Listener>();
  private element: HTMLAudioElement | null = null;
  private run = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): PlaybackState {
    return this.state;
  }

  private set(next: Partial<PlaybackState>) {
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) l(this.state);
  }

  stop() {
    this.run++;
    if (this.element) {
      this.element.pause();
      this.element.removeAttribute("src");
      this.element.load();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    if (this.state.playingId) this.set({ playingId: null, index: 0 });
  }

  /** Play the tracks in order. Resolves true when everything was played, false if stopped or failed. */
  async play(id: string, tracks: AudioTrack[], source: AudioSource, rate = 1): Promise<boolean> {
    this.stop();
    const run = this.run;
    this.set({ playingId: id, index: 0, error: null });
    try {
      for (let i = 0; i < tracks.length; i++) {
        if (run !== this.run) return false;
        this.set({ index: i });
        if (source === "file") await this.playFile(tracks[i], rate, run);
        else await this.speak(tracks[i], rate, run);
        // A short pause between lines, like a real recording.
        if (i < tracks.length - 1) await new Promise((r) => setTimeout(r, 350));
      }
      if (run !== this.run) return false;
      this.set({ playingId: null, index: 0 });
      return true;
    } catch (err) {
      if (run !== this.run) return false;
      this.set({
        playingId: null,
        index: 0,
        error:
          err instanceof Error && err.message === "file"
            ? "The audio file couldn't be played. Check your connection, or use the transcript."
            : "Your device couldn't play the audio. You can use the transcript instead.",
      });
      return false;
    }
  }

  private playFile(track: AudioTrack, rate: number, run: number): Promise<void> {
    if (!track.url) return Promise.reject(new Error("file"));
    this.element ??= new Audio();
    const el = this.element;
    return new Promise((resolve, reject) => {
      const done = (ok: boolean) => {
        el.onended = null;
        el.onerror = null;
        if (ok || run !== this.run) resolve();
        else reject(new Error("file"));
      };
      el.onended = () => done(true);
      el.onerror = () => done(false);
      el.src = track.url!;
      el.playbackRate = rate;
      el.play().catch(() => done(false));
    });
  }

  private speak(track: AudioTrack, rate: number, run: number): Promise<void> {
    const synth = window.speechSynthesis;
    const { voice, pitch } = pickDeviceVoice(englishVoices(), track.voice);
    const parts = chunks(track.text);
    return parts.reduce(
      (prev, part) =>
        prev.then(
          () =>
            new Promise<void>((resolve, reject) => {
              if (run !== this.run) return resolve();
              const u = new SpeechSynthesisUtterance(part);
              if (voice) {
                u.voice = voice;
                u.lang = voice.lang;
              } else u.lang = "en-GB";
              u.pitch = pitch;
              u.rate = rate * 0.95;
              u.onend = () => resolve();
              u.onerror = (e) =>
                e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error("speech"));
              synth.speak(u);
            }),
        ),
      Promise.resolve(),
    );
  }
}

let controller: AudioController | null = null;

export function audioController(): AudioController {
  controller ??= new AudioController();
  return controller;
}
