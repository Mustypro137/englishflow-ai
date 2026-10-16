"use client";

import { useEffect } from "react";
import type { TextScale } from "@/generated/prisma/enums";

const SCALE_ATTR: Record<TextScale, string | null> = { normal: null, large: "large", x_large: "x-large" };

/** Applies the learner's text size and reduced-motion settings to the whole page. */
export function ApplyPreferences({ textScale, reducedMotion }: { textScale: TextScale; reducedMotion: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    const scale = SCALE_ATTR[textScale];
    if (scale) root.dataset.textScale = scale;
    else delete root.dataset.textScale;
    if (reducedMotion) root.dataset.reducedMotion = "true";
    else delete root.dataset.reducedMotion;
    return () => {
      delete root.dataset.textScale;
      delete root.dataset.reducedMotion;
    };
  }, [textScale, reducedMotion]);
  return null;
}
