/**
 * Achievements derived from real learning events (nothing is stored separately,
 * so a badge can never claim something that didn't happen). Pure function.
 */

export interface AchievementFacts {
  firstAnswerAt: Date | null;
  lessonCompletions: Date[];
  /** Completion time of each fully finished unit. */
  unitCompletions: Date[];
  firstReviewAt: Date | null;
  masteredAt: Date[];
  /** Local dates ("YYYY-MM-DD") with any study activity, oldest first. */
  studyDays: string[];
  challengeCompletions: Date[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
}

const sorted = (d: Date[]) => [...d].sort((a, b) => a.getTime() - b.getTime());

export function deriveAchievements(f: AchievementFacts): Achievement[] {
  const out: Achievement[] = [];
  const add = (id: string, title: string, description: string, at: Date | null | undefined) => {
    if (at) out.push({ id, title, description, earnedAt: at });
  };
  const lessons = sorted(f.lessonCompletions);
  const mastered = sorted(f.masteredAt);
  const challenges = sorted(f.challengeCompletions);

  add("first-answer", "First steps", "Answered your first exercise.", f.firstAnswerAt);
  add("first-lesson", "Lesson complete", "Answered every exercise in a lesson.", lessons[0]);
  add("first-unit", "Unit complete", "Finished every lesson in a unit.", sorted(f.unitCompletions)[0]);
  add("first-review", "Came back to it", "Did your first spaced review.", f.firstReviewAt);
  add("first-mastered", "Remembered", "Mastered a topic by recalling it on two separate days.", mastered[0]);
  add("five-mastered", "Five topics mastered", "Mastered five topics.", mastered[4]);
  if (f.studyDays.length >= 5) {
    // Earned on the fifth day of study; noon UTC of that date is a stable timestamp for display.
    add("five-days", "Steady learner", "Studied on five different days.", new Date(`${f.studyDays[4]}T12:00:00Z`));
  }
  add("first-challenge", "Challenge accepted", "Completed your first challenge.", challenges[0]);

  return out.sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
}
