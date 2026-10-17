"use client";

import { Alert } from "@/components/ui/alert";
import { useAudioAvailability } from "./audio";

const PROBE = [{ key: "probe", text: "", voice: "female" as const, url: null }];

/** Tells the learner up front whether this device can speak the activities aloud. */
export function DeviceAudioNote({ filesAvailable }: { filesAvailable: boolean }) {
  const device = useAudioAvailability(PROBE);
  if (filesAvailable || device === "checking") return null;
  if (device === "device")
    return (
      <p className="text-muted text-sm" data-device-audio="available">
        Audio here is spoken by your device&apos;s built-in computer voice. It&apos;s clear, but less natural than a
        real speaker.
      </p>
    );
  return (
    <Alert tone="info" title="Your device can't play the audio here" data-device-audio="unavailable">
      This browser has no English speech voice, so activities show their transcript instead. Questions still work.
      Another browser (for example Chrome, Edge or Safari) usually includes a voice.
    </Alert>
  );
}
