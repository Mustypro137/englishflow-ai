import type { Voice } from "@content/schemas";

/** One piece of audio as the browser gets it: the words, a voice, and a file if one exists. */
export interface AudioTrack {
  key: string;
  text: string;
  voice: Voice;
  /** Pre-generated file. When null, the page may use the device's own voice instead. */
  url: string | null;
}
