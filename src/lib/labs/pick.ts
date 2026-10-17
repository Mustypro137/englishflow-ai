/**
 * Choose the listening or reading activity for today's study plan. Pure function.
 * The skill practised less this week comes first (listening on a tie); within it,
 * the first item at the learner's level not done yet, else the one done longest ago.
 */
export interface PickCandidate {
  slug: string;
  title: string;
  minutes: number;
}

export interface SkillPick {
  skill: "listening" | "reading";
  slug: string;
  title: string;
  description: string;
  href: string;
}

export function pickSkillActivity(input: {
  /** Items in preferred order (closest level first). */
  listening: readonly PickCandidate[];
  reading: readonly PickCandidate[];
  /** Last completion of each item, by slug. */
  lastDone: { listening: ReadonlyMap<string, Date>; reading: ReadonlyMap<string, Date> };
  doneThisWeek: { listening: number; reading: number };
}): SkillPick | null {
  const order: ("listening" | "reading")[] =
    input.doneThisWeek.listening <= input.doneThisWeek.reading ? ["listening", "reading"] : ["reading", "listening"];
  for (const skill of order) {
    const items = input[skill];
    if (items.length === 0) continue;
    const done = input.lastDone[skill];
    const item =
      items.find((i) => !done.has(i.slug)) ??
      [...items].sort((a, b) => done.get(a.slug)!.getTime() - done.get(b.slug)!.getTime())[0];
    const fresh = !done.has(item.slug);
    return {
      skill,
      slug: item.slug,
      title: `${skill === "listening" ? "Listening" : "Reading"}: ${item.title}`,
      description:
        skill === "listening"
          ? `${fresh ? "Listen" : "Listen again"}, answer the questions, then check the transcript.`
          : `${fresh ? "Read" : "Reread"} the text, answer the questions and save useful words.`,
      href: `/app/${skill}/${item.slug}`,
    };
  }
  return null;
}
