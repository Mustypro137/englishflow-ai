"use client";

import { useState } from "react";
import {
  AudioSourceNote,
  ListenButton,
  PlaybackStatus,
  useAudioAvailability,
  usePlayback,
  useStopOnUnmount,
} from "@/components/audio/audio";
import { Button } from "@/components/ui/button";
import type { AudioTrack } from "@/lib/audio/track";
import { cn } from "@/lib/utils/cn";

/** The example conversation, with optional audio and a "cover my lines" practice mode. */
export function ModelDialogue({
  partnerName,
  lines,
  tracks,
}: {
  partnerName: string;
  lines: { speaker: "partner" | "learner"; text: string }[];
  tracks: AudioTrack[];
}) {
  useStopOnUnmount();
  const source = useAudioAvailability(tracks);
  const playback = usePlayback();
  const [cover, setCover] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  return (
    <section aria-labelledby="model-heading" className="space-y-3">
      <h2 id="model-heading" className="text-ink text-lg font-semibold">
        Example conversation
      </h2>
      <p className="text-muted text-sm">
        One good way to do it — there are many others. To practise, cover your lines and say or write your reply before
        you reveal each one.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <ListenButton id="dialogue" tracks={tracks} source={source} label="Listen to the conversation" />
        <Button
          size="sm"
          variant={cover ? "primary" : "secondary"}
          aria-pressed={cover}
          onClick={() => {
            setCover((c) => !c);
            setRevealed(new Set());
          }}
        >
          {cover ? "Show all lines" : "Cover my lines"}
        </Button>
      </div>
      <AudioSourceNote source={source} />
      <PlaybackStatus />
      <ol className="space-y-2">
        {lines.map((l, i) => {
          const hidden = cover && l.speaker === "learner" && !revealed.has(i);
          const active = playback.playingId === "dialogue" && playback.index === i;
          return (
            <li
              key={i}
              className={cn(
                "rounded-lg border p-3 text-sm",
                l.speaker === "learner" ? "border-primary/30 bg-primary-soft ml-6" : "border-border bg-surface mr-6",
                active ? "ring-primary ring-2" : "",
              )}
            >
              <p className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
                {l.speaker === "learner" ? "You" : partnerName}
              </p>
              {hidden ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRevealed((r) => new Set(r).add(i))}
                  aria-label={`Reveal your line ${Math.ceil((i + 1) / 2)}`}
                >
                  Your turn — then reveal
                </Button>
              ) : (
                <p className="text-ink">{l.text}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
