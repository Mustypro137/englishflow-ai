/**
 * Daily and weekly challenges. They reward recalling and using English on your
 * own — not clicking. Progress is measured from real activity in the period.
 */

export type ChallengeMetric =
  | "independent_correct" // correct answers without a hint or revealed answer
  | "clear_reviews" // review everything that's due today
  | "words_recalled" // saved-word reviews remembered
  | "original_sentences" // written submission with N sentences of your own
  | "mistakes_fixed" // earlier mistakes answered correctly later
  | "days_studied" // different days with study activity this week
  | "lessons_completed"
  | "concepts_mastered";

export interface ChallengeDefinition {
  slug: string;
  period: "daily" | "weekly";
  title: string;
  description: string;
  metric: ChallengeMetric;
  target: number;
}

export const CHALLENGES: readonly ChallengeDefinition[] = [
  {
    slug: "daily-ten-on-your-own",
    period: "daily",
    title: "Ten on your own",
    description: "Answer 10 exercises correctly without a hint or looking at the answer.",
    metric: "independent_correct",
    target: 10,
  },
  {
    slug: "daily-clear-reviews",
    period: "daily",
    title: "Clear today's reviews",
    description: "Review every item that's due today.",
    metric: "clear_reviews",
    target: 1,
  },
  {
    slug: "daily-recall-five-words",
    period: "daily",
    title: "Recall five words",
    description: "Remember five of your saved words in reviews.",
    metric: "words_recalled",
    target: 5,
  },
  {
    slug: "daily-five-sentences",
    period: "daily",
    title: "Five sentences of your own",
    description: "Write five original sentences using English you've learned. Then check them yourself.",
    metric: "original_sentences",
    target: 5,
  },
  {
    slug: "daily-fix-a-mistake",
    period: "daily",
    title: "Fix a mistake",
    description: "Answer correctly an exercise you got wrong before.",
    metric: "mistakes_fixed",
    target: 1,
  },
  {
    slug: "weekly-four-days",
    period: "weekly",
    title: "Four study days",
    description: "Study on four different days this week. Short sessions count.",
    metric: "days_studied",
    target: 4,
  },
  {
    slug: "weekly-finish-a-lesson",
    period: "weekly",
    title: "Finish a lesson",
    description: "Answer every exercise in one lesson this week.",
    metric: "lessons_completed",
    target: 1,
  },
  {
    slug: "weekly-master-a-topic",
    period: "weekly",
    title: "Master a topic",
    description: "Get a topic to “mastered” by remembering it in reviews on two separate days.",
    metric: "concepts_mastered",
    target: 1,
  },
];
