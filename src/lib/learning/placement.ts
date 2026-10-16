/**
 * Placement estimate from section-based results. Pure function.
 *
 * For each section, levels are checked from A1 upwards. A level is passed when
 * at least half its items are correct AND accuracy on all items up to that level
 * is at least 70%. The estimate is the last level passed before the first failure.
 * This is an approximate starting point, not a certified level.
 */
import { CEFR_CODES, type Cefr } from "@content/schemas";

export type PlacementSection = "grammar" | "vocabulary" | "reading";

export const PLACEMENT_RULES = {
  levelMinAccuracy: 0.5,
  cumulativeMinAccuracy: 0.7,
  minAnsweredPerSection: 4,
} as const;

export interface PlacementAnswer {
  section: PlacementSection;
  level: Cefr;
  correct: boolean;
}

export interface SectionEstimate {
  section: PlacementSection;
  /** null when even the first assessed level was not passed: start at A1. */
  level: Cefr | null;
  /** True when the learner passed the highest level this check measures for the section. */
  atCeiling: boolean;
  answered: number;
  correct: number;
  enoughEvidence: boolean;
  byLevel: Partial<Record<Cefr, { correct: number; total: number }>>;
}

export interface PlacementEstimate {
  sections: SectionEstimate[];
  /** Overall starting level suggestion; null means start at A1 (or not enough evidence). */
  overall: Cefr | null;
  enoughEvidence: boolean;
}

export function estimateSection(section: PlacementSection, answers: readonly PlacementAnswer[]): SectionEstimate {
  const own = answers.filter((a) => a.section === section);
  const byLevel: SectionEstimate["byLevel"] = {};
  for (const a of own) {
    const entry = (byLevel[a.level] ??= { correct: 0, total: 0 });
    entry.total += 1;
    if (a.correct) entry.correct += 1;
  }

  const assessedLevels = CEFR_CODES.filter((code) => byLevel[code]);
  let level: Cefr | null = null;
  let cumCorrect = 0;
  let cumTotal = 0;
  for (const code of assessedLevels) {
    const { correct, total } = byLevel[code]!;
    cumCorrect += correct;
    cumTotal += total;
    const passed =
      correct / total >= PLACEMENT_RULES.levelMinAccuracy &&
      cumCorrect / cumTotal >= PLACEMENT_RULES.cumulativeMinAccuracy;
    if (!passed) break;
    level = code;
  }

  return {
    section,
    level,
    atCeiling: level !== null && level === assessedLevels[assessedLevels.length - 1],
    answered: own.length,
    correct: own.filter((a) => a.correct).length,
    enoughEvidence: own.length >= PLACEMENT_RULES.minAnsweredPerSection,
    byLevel,
  };
}

/** Lower median of the section levels (start-at-A1 counts as the lowest value). */
export function estimatePlacement(answers: readonly PlacementAnswer[]): PlacementEstimate {
  const sections = (["grammar", "vocabulary", "reading"] as const).map((s) => estimateSection(s, answers));
  const usable = sections.filter((s) => s.enoughEvidence);
  if (usable.length === 0) return { sections, overall: null, enoughEvidence: false };

  const indices = usable.map((s) => (s.level ? CEFR_CODES.indexOf(s.level) : -1)).sort((a, b) => a - b);
  const median = indices[Math.floor((indices.length - 1) / 2)];
  return { sections, overall: median >= 0 ? CEFR_CODES[median] : null, enoughEvidence: true };
}
