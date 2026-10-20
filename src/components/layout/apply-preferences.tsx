"use client";

import { useEffect } from "react";
import type { ColorTheme, TextScale } from "@/generated/prisma/enums";

const SCALE_ATTR: Record<TextScale, string | null> = { normal: null, large: "large", x_large: "x-large" };

/** Applies the learner's text size, theme and reduced-motion settings to the whole page. */
export function ApplyPreferences({
  textScale,
  colorTheme,
  reducedMotion,
}: {
  textScale: TextScale;
  colorTheme: ColorTheme;
  reducedMotion: boolean;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const scale = SCALE_ATTR[textScale];
    if (scale) root.dataset.textScale = scale;
    else delete root.dataset.textScale;
    // "system" leaves the attribute off so the device's setting decides.
    if (colorTheme !== "system") root.dataset.theme = colorTheme;
    else delete root.dataset.theme;
    if (reducedMotion) root.dataset.reducedMotion = "true";
    else delete root.dataset.reducedMotion;
    return () => {
      delete root.dataset.textScale;
      delete root.dataset.theme;
      delete root.dataset.reducedMotion;
    };
  }, [textScale, colorTheme, reducedMotion]);
  return null;
}
