/**
 * A2–C2 outlines: modules, units, concepts and planned lessons.
 * No lesson bodies yet — these appear as "coming soon" so the roadmap and
 * prerequisite chain are complete while content is written and reviewed.
 */
import { planned } from "../kit";
import { defineLevel } from "../schemas";

type Skill = "grammar" | "vocabulary" | "reading" | "writing" | "functional_communication";
const c = (
  slug: string,
  name: string,
  description: string,
  prerequisites: string[] = [],
  skill: Skill = "grammar",
) => ({
  slug,
  name,
  description,
  skill,
  prerequisites,
});

export const a2 = defineLevel({
  code: "A2",
  title: "Elementary",
  description: "Communicate in simple, routine tasks. Describe your background, your surroundings and immediate needs.",
  concepts: [
    c("past-simple-regular", "Past simple: regular verbs", "-ed verbs for finished past actions.", ["past-of-be"]),
    c("past-simple-irregular", "Past simple: irregular verbs", "Common irregular past forms.", ["past-simple-regular"]),
    c("past-simple-questions", "Past simple: negatives and questions", "Did/didn't + base verb.", [
      "past-simple-irregular",
      "present-simple-do-does",
    ]),
    c("comparatives", "Comparative adjectives", "-er/more … than.", ["be-present-positive"]),
    c("superlatives", "Superlative adjectives", "the -est / the most.", ["comparatives"]),
    c("going-to-future", "Going to for plans", "Be going to + base verb.", ["present-continuous"]),
    c("present-continuous-future", "Present continuous for arrangements", "Fixed future arrangements.", [
      "present-continuous",
    ]),
    c("countable-uncountable", "Countable and uncountable nouns", "Nouns you can and can't count.", ["plural-nouns"]),
    c("some-any-much-many", "Some, any, much, many", "Quantifiers with countable and uncountable nouns.", [
      "countable-uncountable",
      "there-is-there-are",
    ]),
  ],
  modules: [
    {
      slug: "a2-past-and-comparison",
      title: "The past and comparing things",
      description: "Tell simple stories about the past and compare people, places and things.",
      units: [
        {
          slug: "a2-past-simple",
          title: "Talking about the past",
          lessons: [
            planned(
              "a2-past-simple-regular",
              "I worked, she played: the past simple",
              "Talk about finished past actions with regular verbs.",
              ["past-simple-regular"],
            ),
            planned(
              "a2-past-simple-irregular",
              "I went, she saw: irregular verbs",
              "Use the most common irregular past forms.",
              ["past-simple-irregular"],
            ),
            planned(
              "a2-past-simple-questions",
              "Did you go? Past simple questions",
              "Ask and answer questions about the past.",
              ["past-simple-questions"],
            ),
          ],
        },
        {
          slug: "a2-comparing",
          title: "Comparing",
          lessons: [
            planned("a2-comparatives", "Bigger, more expensive: comparatives", "Compare two things.", ["comparatives"]),
            planned(
              "a2-superlatives",
              "The biggest, the most expensive: superlatives",
              "Compare one thing with a whole group.",
              ["superlatives"],
            ),
          ],
        },
      ],
    },
    {
      slug: "a2-plans-and-quantities",
      title: "Plans and quantities",
      description: "Talk about the future and about how much or how many.",
      units: [
        {
          slug: "a2-future-plans",
          title: "Future plans",
          lessons: [
            planned("a2-going-to", "I'm going to travel: plans with going to", "Talk about plans and intentions.", [
              "going-to-future",
            ]),
            planned(
              "a2-present-continuous-future",
              "I'm meeting Sam tomorrow: arrangements",
              "Talk about fixed arrangements.",
              ["present-continuous-future"],
            ),
          ],
        },
        {
          slug: "a2-quantities",
          title: "How much and how many",
          lessons: [
            planned(
              "a2-countable-uncountable",
              "Apples and rice: countable and uncountable",
              "Tell countable and uncountable nouns apart.",
              ["countable-uncountable"],
            ),
            planned("a2-some-any-much-many", "Some, any, much, many", "Talk about quantities.", ["some-any-much-many"]),
          ],
        },
      ],
    },
  ],
});

export const b1 = defineLevel({
  code: "B1",
  title: "Intermediate",
  description:
    "Deal with most situations while travelling. Describe experiences and events, and briefly give reasons for opinions.",
  concepts: [
    c("present-perfect-experience", "Present perfect for experience", "Have you ever…? I've never….", [
      "past-simple-irregular",
    ]),
    c("present-perfect-vs-past", "Present perfect or past simple", "Unfinished vs finished time.", [
      "present-perfect-experience",
    ]),
    c("for-since", "For and since", "Duration with the present perfect.", ["present-perfect-experience"]),
    c("past-continuous", "Past continuous", "Was/were + -ing for background actions.", [
      "past-simple-questions",
      "present-continuous",
    ]),
    c("used-to", "Used to", "Past habits and states.", ["past-simple-questions"]),
    c("first-conditional", "First conditional", "If + present, will + verb.", ["going-to-future"]),
    c("second-conditional", "Second conditional", "If + past, would + verb.", ["first-conditional"]),
    c("must-have-to", "Must and have to", "Obligation and necessity.", ["can-ability"]),
    c("should-advice", "Should for advice", "Giving and asking for advice.", ["can-ability"]),
  ],
  modules: [
    {
      slug: "b1-experiences-and-stories",
      title: "Experiences and stories",
      description: "Talk about life experiences and tell stories in the past.",
      units: [
        {
          slug: "b1-present-perfect",
          title: "Experiences",
          lessons: [
            planned(
              "b1-present-perfect-experience",
              "Have you ever…? The present perfect",
              "Talk about life experiences.",
              ["present-perfect-experience"],
            ),
            planned(
              "b1-present-perfect-vs-past",
              "I've been or I went? Choosing the tense",
              "Choose between present perfect and past simple.",
              ["present-perfect-vs-past"],
            ),
            planned("b1-for-since", "For three years, since 2020", "Say how long something has continued.", [
              "for-since",
            ]),
          ],
        },
        {
          slug: "b1-narratives",
          title: "Telling stories",
          lessons: [
            planned("b1-past-continuous", "I was walking when…: the past continuous", "Set the scene in a story.", [
              "past-continuous",
            ]),
            planned("b1-used-to", "I used to live in…", "Talk about past habits.", ["used-to"]),
          ],
        },
      ],
    },
    {
      slug: "b1-conditions-and-advice",
      title: "Conditions, obligation and advice",
      description: "Talk about possible situations, rules and advice.",
      units: [
        {
          slug: "b1-conditionals",
          title: "If…",
          lessons: [
            planned("b1-first-conditional", "If it rains, we'll stay in", "Talk about real future possibilities.", [
              "first-conditional",
            ]),
            planned("b1-second-conditional", "If I had more time, I would…", "Talk about imaginary situations.", [
              "second-conditional",
            ]),
          ],
        },
        {
          slug: "b1-modals",
          title: "Rules and advice",
          lessons: [
            planned("b1-must-have-to", "You must, you have to", "Express obligation.", ["must-have-to"]),
            planned("b1-should", "You should see a doctor", "Give advice.", ["should-advice"]),
          ],
        },
      ],
    },
  ],
});

export const b2 = defineLevel({
  code: "B2",
  title: "Upper intermediate",
  description:
    "Interact with fluency and spontaneity. Produce clear, detailed text and explain a viewpoint on a topical issue.",
  concepts: [
    c("passive-present-past", "The passive: present and past", "Is made / was built.", ["past-simple-irregular"]),
    c("passive-modals", "The passive with modals", "Can be done / should be checked.", [
      "passive-present-past",
      "must-have-to",
    ]),
    c("reported-statements", "Reported statements", "She said (that)…; tense changes.", [
      "past-continuous",
      "present-perfect-vs-past",
    ]),
    c("reported-questions", "Reported questions", "He asked where I lived.", ["reported-statements"]),
    c("defining-relative-clauses", "Defining relative clauses", "Who, which, that.", ["present-perfect-experience"]),
    c("non-defining-relative-clauses", "Non-defining relative clauses", "Extra information with commas.", [
      "defining-relative-clauses",
    ]),
    c("third-conditional", "Third conditional", "If + past perfect, would have.", ["second-conditional"]),
    c("mixed-conditionals", "Mixed conditionals", "Mixing past and present time.", ["third-conditional"]),
  ],
  modules: [
    {
      slug: "b2-reporting-and-passive",
      title: "Reporting and the passive",
      description: "Report what others said and focus on actions rather than people.",
      units: [
        {
          slug: "b2-passive",
          title: "The passive",
          lessons: [
            planned(
              "b2-passive-present-past",
              "It was built in 1890: the passive",
              "Use the passive in the present and past.",
              ["passive-present-past"],
            ),
            planned(
              "b2-passive-modals",
              "It should be checked: passive with modals",
              "Combine modals with the passive.",
              ["passive-modals"],
            ),
          ],
        },
        {
          slug: "b2-reported-speech",
          title: "Reported speech",
          lessons: [
            planned("b2-reported-statements", "She said she was tired", "Report statements.", ["reported-statements"]),
            planned("b2-reported-questions", "He asked where I lived", "Report questions.", ["reported-questions"]),
          ],
        },
      ],
    },
    {
      slug: "b2-complex-sentences",
      title: "Complex sentences",
      description: "Combine ideas precisely with relative clauses and conditionals.",
      units: [
        {
          slug: "b2-relative-clauses",
          title: "Relative clauses",
          lessons: [
            planned(
              "b2-defining-relative-clauses",
              "The person who called: defining clauses",
              "Identify people and things precisely.",
              ["defining-relative-clauses"],
            ),
            planned("b2-non-defining-relative-clauses", "My sister, who lives in Paris, …", "Add extra information.", [
              "non-defining-relative-clauses",
            ]),
          ],
        },
        {
          slug: "b2-conditionals",
          title: "Past and mixed conditionals",
          lessons: [
            planned("b2-third-conditional", "If I had known, I would have…", "Imagine a different past.", [
              "third-conditional",
            ]),
            planned(
              "b2-mixed-conditionals",
              "If I had studied, I would be…",
              "Connect past causes and present results.",
              ["mixed-conditionals"],
            ),
          ],
        },
      ],
    },
  ],
});

export const c1 = defineLevel({
  code: "C1",
  title: "Advanced",
  description:
    "Use language flexibly and effectively for social, academic and professional purposes, and understand implicit meaning.",
  concepts: [
    c("cleft-sentences", "Cleft sentences", "What I need is… / It was Sam who….", ["defining-relative-clauses"]),
    c("inversion-emphasis", "Inversion for emphasis", "Not only…, Never have I….", ["present-perfect-experience"]),
    c("hedging", "Hedging and softening", "It seems that…, tend to, arguably.", ["should-advice"], "writing"),
    c("past-modal-deduction", "Past modals of deduction", "Must have, can't have, might have.", ["third-conditional"]),
    c("nominalisation", "Nominalisation", "Turning verbs into nouns in formal writing.", ["passive-modals"], "writing"),
    c(
      "cohesive-devices",
      "Cohesive devices",
      "Linking ideas across sentences and paragraphs.",
      ["non-defining-relative-clauses"],
      "writing",
    ),
    c(
      "register",
      "Formal and informal register",
      "Choosing tone for audience and purpose.",
      ["reported-questions"],
      "functional_communication",
    ),
  ],
  modules: [
    {
      slug: "c1-precision-and-emphasis",
      title: "Precision and emphasis",
      description: "Control emphasis and certainty in speech and writing.",
      units: [
        {
          slug: "c1-emphasis",
          title: "Emphasis",
          lessons: [
            planned("c1-cleft-sentences", "What matters is…: cleft sentences", "Focus attention on key information.", [
              "cleft-sentences",
            ]),
            planned("c1-inversion", "Not only did she…: inversion", "Add emphasis in formal English.", [
              "inversion-emphasis",
            ]),
          ],
        },
        {
          slug: "c1-certainty",
          title: "Certainty and caution",
          lessons: [
            planned("c1-hedging", "It would appear that…: hedging", "Soften claims appropriately.", ["hedging"]),
            planned("c1-past-modals", "She must have left: past deduction", "Draw conclusions about the past.", [
              "past-modal-deduction",
            ]),
          ],
        },
      ],
    },
    {
      slug: "c1-academic-and-professional",
      title: "Academic and professional English",
      description: "Write and speak effectively at work and in study.",
      units: [
        {
          slug: "c1-formal-writing",
          title: "Formal writing",
          lessons: [
            planned("c1-nominalisation", "The decision to expand: nominalisation", "Write in a concise formal style.", [
              "nominalisation",
            ]),
            planned("c1-cohesion", "Moreover, in contrast: cohesion", "Connect ideas clearly across a text.", [
              "cohesive-devices",
            ]),
          ],
        },
        {
          slug: "c1-register",
          title: "Register",
          lessons: [
            planned("c1-register", "Could you possibly…? Choosing register", "Match tone to audience and purpose.", [
              "register",
            ]),
          ],
        },
      ],
    },
  ],
});

export const c2 = defineLevel({
  code: "C2",
  title: "Proficient",
  description:
    "Understand virtually everything heard or read, and express yourself spontaneously and precisely, distinguishing finer shades of meaning.",
  concepts: [
    c("subjunctive-formulaic", "Subjunctive and formulaic language", "It's essential that he be…; be that as it may.", [
      "inversion-emphasis",
    ]),
    c("ellipsis-substitution", "Ellipsis and substitution", "Leaving words out naturally: I hope so, if not.", [
      "cohesive-devices",
    ]),
    c("fronting-stylistic-inversion", "Fronting and stylistic inversion", "Rarely do we see…; Gone are the days….", [
      "inversion-emphasis",
    ]),
    c(
      "idiomatic-precision",
      "Idiomatic precision",
      "Choosing idioms and collocations with exact nuance.",
      ["register"],
      "vocabulary",
    ),
  ],
  modules: [
    {
      slug: "c2-nuance-and-style",
      title: "Nuance and style",
      description: "Fine control of meaning, rhythm and tone.",
      units: [
        {
          slug: "c2-nuance",
          title: "Nuance",
          lessons: [
            planned(
              "c2-subjunctive",
              "Be that as it may: the subjunctive",
              "Use subjunctive and formulaic structures.",
              ["subjunctive-formulaic"],
            ),
            planned("c2-ellipsis", "I'd like to, but…: ellipsis and substitution", "Avoid repetition naturally.", [
              "ellipsis-substitution",
            ]),
          ],
        },
        {
          slug: "c2-style",
          title: "Style",
          lessons: [
            planned("c2-fronting", "Gone are the days…: fronting", "Use fronting for style and emphasis.", [
              "fronting-stylistic-inversion",
            ]),
            planned(
              "c2-idiomatic-precision",
              "Hit the nail on the head: precise idioms",
              "Choose idioms with the right nuance.",
              ["idiomatic-precision"],
            ),
          ],
        },
      ],
    },
  ],
});
