/**
 * A1 · Unit 2 · Daily life and places
 * Lessons: present simple (he/she/it); do/does; there is/are; prepositions of place.
 */
import { exerciseKit } from "../../kit";

// ---------------------------------------------------------------------------
// Lesson 5 — Present simple: he / she / it + -s
// ---------------------------------------------------------------------------
const l5 = exerciseKit({
  prefix: "a1-ps",
  objective: "Use the present simple with the correct -s ending after he, she and it.",
  concepts: ["present-simple-third-person"],
});

export const lessonPresentSimple = {
  slug: "a1-present-simple-he-she-it",
  status: "published" as const,
  title: "She works, they work: the present simple",
  objective: "Talk about routines and facts with the present simple, adding -s after he, she and it.",
  estimatedMinutes: 15,
  concepts: ["present-simple-third-person"],
  body: [
    {
      type: "paragraph" as const,
      text: "Use the **present simple** for habits, routines and things that are generally true: I **work** in a bank. Water **boils** at 100°C.",
    },
    {
      type: "rule" as const,
      title: "He, she, it + -s",
      text: "With **he, she, it** (or one person or thing), add **-s** to the verb: I work → she **works**. With **I, you, we** and **they**, use the base verb with no -s.",
    },
    {
      type: "table" as const,
      caption: "Spelling after he, she, it",
      headers: ["Verb ending", "Rule", "Examples"],
      rows: [
        ["most verbs", "add -s", "work → works, play → plays"],
        ["-s, -sh, -ch, -x, -o", "add -es", "watch → watches, go → goes, do → does, fix → fixes"],
        ["consonant + y", "change y to -ies", "study → studies, fly → flies"],
        ["have", "irregular", "have → has"],
      ],
    },
    {
      type: "examples" as const,
      items: [
        { text: "I **live** in Accra, but my brother **lives** in Kumasi." },
        { text: "She **watches** TV every evening." },
        { text: "My dad **has** a small shop." },
        { text: "The shop **opens** at nine o'clock.", note: "the shop = it, so add -s" },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        { wrong: "She work in a hospital.", right: "She works in a hospital.", why: "After she, add -s." },
        { wrong: "He haves two cars.", right: "He has two cars.", why: "Have is irregular: he has." },
        { wrong: "They plays football.", right: "They play football.", why: "No -s after they." },
        { wrong: "She studys English.", right: "She studies English.", why: "Consonant + y changes to -ies." },
      ],
    },
  ],
  guided: [
    l5("multiple_choice", "g1", {
      instructions: "Choose the correct verb.",
      hint: "My sister = she.",
      explanation: "My sister = she, so add -s: My sister works in a bank.",
      payload: {
        prompt: "My sister ___ in a bank.",
        options: [
          { id: "a", text: "work" },
          { id: "b", text: "works" },
          { id: "c", text: "working" },
        ],
        correct: "b",
        optionFeedback: {
          a: "My sister = she, so the verb needs -s.",
          c: "Working needs am/is/are. For a routine, use works.",
        },
      },
    }),
    l5("gap_fill", "g2", {
      instructions: "Write the correct form of the verb in brackets.",
      hint: "Go ends in -o.",
      explanation: "Verbs ending in -o add -es: he goes.",
      payload: {
        text: "He ___ (go) to school by bus.",
        blanks: [
          {
            accepted: ["goes"],
            feedback: { go: "After he, the verb needs an ending.", gos: "Verbs ending in -o add -es." },
          },
        ],
      },
    }),
    l5("gap_fill", "g3", {
      instructions: "Write the correct form of like in each gap.",
      hint: "First gap: I. Second gap: my husband = he.",
      explanation: "I like (no -s) · my husband likes (he → -s).",
      payload: {
        text: "I ___ (like) tea, but my husband ___ (like) coffee.",
        blanks: [
          { accepted: ["like"], feedback: { likes: "No -s after I." } },
          { accepted: ["likes"], feedback: { like: "My husband = he, so add -s." } },
        ],
      },
    }),
    l5("matching", "g4", {
      instructions: "Match each verb to its he/she/it form.",
      hint: "Watch the spelling rules in the table.",
      explanation: "study → studies · watch → watches · have → has · play → plays · do → does.",
      payload: {
        pairs: [
          { left: "study", right: "studies" },
          { left: "watch", right: "watches" },
          { left: "have", right: "has" },
          { left: "play", right: "plays" },
          { left: "do", right: "does" },
        ],
      },
    }),
  ],
  independent: [
    l5("error_correction", "i1", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "My brother = he, so add -s: My brother speaks three languages.",
      payload: {
        sentence: "My brother speak three languages.",
        accepted: ["My brother speaks three languages."],
        feedback: { "my brother speak three languages": "Look at the verb after my brother." },
      },
    }),
    l5("transformation", "i2", {
      instructions: "Rewrite the sentence.",
      explanation: "With she, add -s: She gets up at 7.",
      difficulty: 2,
      payload: {
        source: "I get up at 7.",
        instruction: "Start with She.",
        accepted: ["She gets up at 7.", "She gets up at seven."],
        feedback: { "she get up at 7": "With she, add -s: she gets up." },
      },
    }),
    l5("word_order", "i3", {
      instructions: "Put the words in the correct order.",
      explanation:
        "Subject + verb + object + time: He drinks coffee every morning. (Every morning he drinks coffee is also correct.)",
      skill: "sentence_construction",
      difficulty: 2,
      payload: {
        tokens: ["coffee", "every", "drinks", "morning", "he"],
        accepted: ["he drinks coffee every morning", "every morning he drinks coffee"],
        punctuation: ".",
      },
    }),
    l5("multiple_choice", "i4", {
      instructions: "Choose the correct sentence.",
      explanation: "Tom = he, so add -s: Tom lives near the park.",
      payload: {
        prompt: "Which sentence is correct?",
        options: [
          { id: "a", text: "They lives near the park." },
          { id: "b", text: "Tom live near the park." },
          { id: "c", text: "Tom lives near the park." },
        ],
        correct: "c",
        optionFeedback: { a: "No -s after they.", b: "Tom = he, so the verb needs -s." },
      },
    }),
  ],
  recall: [
    l5("short_answer", "r1", {
      instructions: "Answer from memory.",
      explanation: "Consonant + y → -ies: she flies.",
      payload: {
        prompt: "Write the he/she/it form of 'fly'.",
        accepted: ["flies"],
        feedback: { flys: "Consonant + y changes to -ies." },
      },
    }),
    l5("gap_fill", "r2", {
      instructions: "Complete the sentence from memory.",
      explanation: "Have is irregular: she has.",
      payload: {
        text: "She ___ (have) a big family.",
        blanks: [{ accepted: ["has"], feedback: { haves: "Have is irregular: has.", have: "After she, use has." } }],
      },
    }),
  ],
  application: {
    prompt:
      "Write three sentences about the daily routine of someone you know, such as a friend or a parent. Use he or she.",
    modelAnswers: [
      "My mother gets up at six o'clock.",
      "She drinks tea and reads the news.",
      "She goes to work by bus.",
    ],
    checklist: [
      "Every verb after he, she or a person's name ends in -s or -es (or is has).",
      "The spelling is right: goes, watches, studies.",
      "The sentences describe habits or routines.",
    ],
  },
  masteryCriteria: [
    "Add -s, -es or -ies correctly after he, she and it.",
    "Use the base verb after I, you, we and they.",
    "Describe someone's routine in the present simple.",
  ],
};

// ---------------------------------------------------------------------------
// Lesson 6 — Present simple: do / does
// ---------------------------------------------------------------------------
const l6 = exerciseKit({
  prefix: "a1-do",
  objective: "Make present simple negatives and questions with do and does.",
  concepts: ["present-simple-do-does"],
});

export const lessonDoDoes = {
  slug: "a1-present-simple-do-does",
  status: "published" as const,
  title: "Do you work? She doesn't: negatives and questions",
  objective: "Make negatives and ask questions in the present simple with do, does, don't and doesn't.",
  estimatedMinutes: 15,
  concepts: ["present-simple-do-does"],
  body: [
    {
      type: "paragraph" as const,
      text: "In the present simple, use **do** and **does** to make negatives and questions.",
    },
    {
      type: "table" as const,
      caption: "Negatives and questions in the present simple",
      headers: ["Subject", "Negative", "Question"],
      rows: [
        ["I / you / we / they", "I don't like fish.", "Do you like fish?"],
        ["he / she / it", "She doesn't like fish.", "Does she like fish?"],
      ],
    },
    {
      type: "rule" as const,
      title: "Does takes the -s",
      text: "When you use **does** or **doesn't**, the main verb goes back to its base form: She works → She **doesn't work**. → **Does** she **work**?",
    },
    {
      type: "examples" as const,
      items: [
        { text: "I **don't drive**. I take the bus." },
        { text: "**Does** your brother **live** with you? — No, he **doesn't**." },
        { text: "**Where do** they **work**?", note: "Question word + do/does + subject + verb" },
        { text: "We **don't have** a car." },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        { wrong: "She doesn't works.", right: "She doesn't work.", why: "After doesn't, use the base verb." },
        { wrong: "Does he likes pizza?", right: "Does he like pizza?", why: "After does, use the base verb." },
        { wrong: "I not like coffee.", right: "I don't like coffee.", why: "Use don't (do not) before the verb." },
        { wrong: "Where you live?", right: "Where do you live?", why: "Questions need do or does." },
      ],
    },
  ],
  guided: [
    l6("multiple_choice", "g1", {
      instructions: "Choose the correct word.",
      hint: "The subject is you.",
      explanation: "With you, the question starts with do: Do you speak French?",
      payload: {
        prompt: "___ you speak French?",
        options: [
          { id: "a", text: "Do" },
          { id: "b", text: "Does" },
          { id: "c", text: "Are" },
        ],
        correct: "a",
        optionFeedback: {
          b: "Does is for he, she and it. Here the subject is you.",
          c: "Speak is a main verb, so the question uses do, not be.",
        },
      },
    }),
    l6("gap_fill", "g2", {
      instructions: "Write the negative form of the verb in brackets.",
      hint: "He takes does — and then the base verb.",
      explanation: "He doesn't eat meat (does not eat). The -s moves to does, so eat has no -s.",
      payload: {
        text: "He ___ (not / eat) meat.",
        blanks: [
          {
            accepted: ["doesn't eat", "does not eat"],
            feedback: {
              "don't eat": "With he, use doesn't.",
              "doesn't eats": "After doesn't, use the base verb: eat.",
              "not eats": "Use doesn't before the verb.",
            },
          },
        ],
      },
    }),
    l6("word_order", "g3", {
      instructions: "Put the words in order to make a question.",
      hint: "Question word first, then does.",
      explanation: "Question word + does + subject + base verb: Where does she work?",
      skill: "sentence_construction",
      payload: { tokens: ["she", "does", "where", "work"], accepted: ["where does she work"], punctuation: "?" },
    }),
    l6("multiple_choice", "g4", {
      instructions: "Choose the correct short answer.",
      hint: "The question uses does.",
      explanation: "A does question gets a does short answer: No, he doesn't.",
      payload: {
        prompt: "Does Kofi play football? — No, he ___.",
        options: [
          { id: "a", text: "don't" },
          { id: "b", text: "doesn't" },
          { id: "c", text: "isn't" },
        ],
        correct: "b",
        optionFeedback: { a: "With he, use doesn't.", c: "The question uses does, so the answer uses doesn't." },
      },
    }),
  ],
  independent: [
    l6("transformation", "i1", {
      instructions: "Rewrite the sentence.",
      explanation: "They → don't + base verb: They don't watch TV in the evening.",
      payload: {
        source: "They watch TV in the evening.",
        instruction: "Make it negative.",
        accepted: ["They don't watch TV in the evening."],
        feedback: {
          "they not watch tv in the evening": "Use don't before the verb.",
          "they doesn't watch tv in the evening": "With they, use don't.",
        },
      },
    }),
    l6("transformation", "i2", {
      instructions: "Rewrite the sentence.",
      explanation: "Does + she + base verb: Does she like rice?",
      difficulty: 2,
      payload: {
        source: "She likes rice.",
        instruction: "Make it a yes/no question.",
        accepted: ["Does she like rice?"],
        feedback: {
          "does she likes rice": "After does, use the base verb: like.",
          "do she like rice": "With she, use does.",
        },
      },
    }),
    l6("error_correction", "i3", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "My father = he, so use doesn't: My father doesn't work on Sundays.",
      difficulty: 2,
      payload: {
        sentence: "My father don't work on Sundays.",
        accepted: ["My father doesn't work on Sundays."],
        feedback: { "my father don't work on sundays": "My father = he. Which negative goes with he?" },
      },
    }),
    l6("gap_fill", "i4", {
      instructions: "Write do or does.",
      explanation: "The film = it, so use does: What time does the film start?",
      payload: {
        text: "What time ___ the film start?",
        blanks: [{ accepted: ["does"], feedback: { do: "The film = it, so use does." } }],
      },
    }),
  ],
  recall: [
    l6("short_answer", "r1", {
      instructions: "Answer from memory.",
      explanation: "He + doesn't + base verb: He doesn't play tennis.",
      payload: {
        prompt: "Make this sentence negative: He plays tennis.",
        accepted: ["He doesn't play tennis."],
        feedback: {
          "he doesn't plays tennis": "After doesn't, drop the -s: play.",
          "he don't play tennis": "With he, use doesn't.",
        },
      },
    }),
    l6("multiple_choice", "r2", {
      instructions: "Choose the correct question.",
      explanation: "Does + she + base verb: Does she work here?",
      payload: {
        prompt: "Which question is correct?",
        options: [
          { id: "a", text: "Do she work here?" },
          { id: "b", text: "Does she work here?" },
          { id: "c", text: "Does she works here?" },
        ],
        correct: "b",
        optionFeedback: { a: "With she, use does.", c: "After does, use the base verb: work." },
      },
    }),
  ],
  application: {
    prompt: "Write two things you don't do, and two questions you could ask a friend about their routine.",
    modelAnswers: [
      "I don't eat breakfast. I don't watch TV in the morning.",
      "Do you work at the weekend? What time does your class start?",
    ],
    checklist: [
      "Negatives use don't or doesn't + the base verb.",
      "Questions use do or does before the subject.",
      "After does and doesn't, the verb has no -s.",
    ],
  },
  masteryCriteria: [
    "Make present simple negatives with don't and doesn't.",
    "Ask yes/no and wh- questions with do and does.",
    "Use the base verb after does and doesn't.",
  ],
};

// ---------------------------------------------------------------------------
// Lesson 7 — There is / there are
// ---------------------------------------------------------------------------
const l7 = exerciseKit({
  prefix: "a1-there",
  objective: "Use there is and there are for singular and plural nouns.",
  concepts: ["there-is-there-are"],
});

export const lessonThereIs = {
  slug: "a1-there-is-there-are",
  status: "published" as const,
  title: "There's a café, there are two banks: there is / there are",
  objective: "Say what exists in a place with there is and there are, and ask and answer questions about places.",
  estimatedMinutes: 15,
  concepts: ["there-is-there-are"],
  body: [
    {
      type: "paragraph" as const,
      text: "Use **there is** and **there are** to say that something exists or is in a place.",
    },
    {
      type: "table" as const,
      caption: "There is and there are",
      headers: ["Form", "One thing (singular)", "More than one (plural)"],
      rows: [
        ["Positive", "There is (There's) a bank near here.", "There are two banks near here."],
        ["Negative", "There isn't a bank near here.", "There aren't any banks near here."],
        ["Question", "Is there a bank near here?", "Are there any banks near here?"],
        ["Short answers", "Yes, there is. / No, there isn't.", "Yes, there are. / No, there aren't."],
      ],
    },
    {
      type: "rule" as const,
      title: "Any",
      text: "In negatives and questions with plural nouns, we usually use **any**: There aren't **any** chairs. Are there **any** shops?",
    },
    {
      type: "examples" as const,
      items: [
        { text: "**There's** a café on the corner." },
        { text: "**There are** three bedrooms in our flat." },
        { text: "**Is there** a bus to the airport? — Yes, **there is**." },
        { text: "**There aren't any** eggs in the fridge." },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        {
          wrong: "There are a book on the table.",
          right: "There is a book on the table.",
          why: "One thing: there is.",
        },
        {
          wrong: "It has a park near my house.",
          right: "There is a park near my house.",
          why: "To say something exists in a place, use there is, not it has.",
        },
        { wrong: "Have there any shops?", right: "Are there any shops?", why: "Questions use is there / are there." },
        {
          wrong: "There is two windows.",
          right: "There are two windows.",
          why: "Plural: there are. (In fast speech people sometimes say there's with plurals, but write there are.)",
        },
      ],
    },
  ],
  guided: [
    l7("multiple_choice", "g1", {
      instructions: "Choose the correct words.",
      hint: "A supermarket = one thing.",
      explanation: "One thing that exists in a place: There is a supermarket in my street.",
      payload: {
        prompt: "___ a supermarket in my street.",
        options: [
          { id: "a", text: "There is" },
          { id: "b", text: "There are" },
          { id: "c", text: "It has" },
        ],
        correct: "a",
        optionFeedback: {
          b: "A supermarket is singular: there is.",
          c: "To say something exists in a place, use there is.",
        },
      },
    }),
    l7("gap_fill", "g2", {
      instructions: "Write is or are.",
      hint: "Five people = more than one.",
      explanation: "Five people is plural: There are five people in my family.",
      payload: {
        text: "There ___ five people in my family.",
        blanks: [{ accepted: ["are"], feedback: { is: "Five people is plural: there are." } }],
      },
    }),
    l7("multiple_choice", "g3", {
      instructions: "Choose the correct word.",
      hint: "Restaurants is plural.",
      explanation: "Plural question: Are there any good restaurants near here?",
      payload: {
        prompt: "___ there any good restaurants near here?",
        options: [
          { id: "a", text: "Is" },
          { id: "b", text: "Are" },
          { id: "c", text: "Do" },
        ],
        correct: "b",
        optionFeedback: { a: "Restaurants is plural: are there.", c: "Questions with there use is or are, not do." },
      },
    }),
    l7("matching", "g4", {
      instructions: "Match each question to the best answer.",
      explanation: "Is there…? — Yes, there is. · Are there…? — No, there aren't. · How many…? — There are four.",
      payload: {
        pairs: [
          { left: "Is there a lift in the building?", right: "Yes, there is." },
          { left: "Are there any parks near you?", right: "No, there aren't." },
          { left: "How many rooms are there?", right: "There are four." },
        ],
      },
    }),
  ],
  independent: [
    l7("error_correction", "i1", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "A problem = one thing: There is (There's) a problem with my phone.",
      payload: {
        sentence: "There are a problem with my phone.",
        accepted: ["There is a problem with my phone."],
        feedback: { "there are a problem with my phone": "A problem is singular." },
      },
    }),
    l7("transformation", "i2", {
      instructions: "Rewrite the sentence.",
      explanation: "There isn't a TV in the room. (There's no TV in the room is also correct.)",
      payload: {
        source: "There is a TV in the room.",
        instruction: "Make it negative.",
        accepted: ["There isn't a TV in the room.", "There's no TV in the room."],
        feedback: { "there not is a tv in the room": "Put not after is: there isn't." },
      },
    }),
    l7("transformation", "i3", {
      instructions: "Rewrite the sentence.",
      explanation:
        "Put are before there: Are there any shops near the station? Any is the usual choice in questions; Are there some…? is possible when you expect the answer yes.",
      difficulty: 2,
      payload: {
        source: "There are some shops near the station.",
        instruction: "Make it a question.",
        accepted: ["Are there any shops near the station?", "Are there some shops near the station?"],
        feedback: { "there are any shops near the station": "In a question, are comes before there." },
      },
    }),
    l7("gap_fill", "i4", {
      instructions: "Write is or are in each gap.",
      explanation: "a sofa → there is · two armchairs → there are.",
      payload: {
        text: "In the living room there ___ a sofa and there ___ two armchairs.",
        blanks: [
          { accepted: ["is"], feedback: { are: "A sofa is one thing." } },
          { accepted: ["are"], feedback: { is: "Two armchairs is plural." } },
        ],
      },
    }),
  ],
  recall: [
    l7("sentence_completion", "r1", {
      instructions: "Complete the short answer from memory.",
      explanation: "Positive short answers use the full form: Yes, there is.",
      payload: {
        stem: "Is there a bank near here? — Yes,",
        accepted: ["there is"],
        exactContractions: true,
        feedback: { "there's": "In a positive short answer, don't use the short form: Yes, there is." },
      },
    }),
    l7("gap_fill", "r2", {
      instructions: "Complete the sentence from memory.",
      explanation: "Ten students is plural: there are.",
      payload: {
        text: "There ___ ten students in my class.",
        blanks: [{ accepted: ["are"], feedback: { is: "Ten students is plural." } }],
      },
    }),
  ],
  application: {
    prompt: "Describe a room in your home, or your street, in three sentences with there is and there are.",
    modelAnswers: [
      "In my street there's a small shop and there are two cafés.",
      "There isn't a park, but there are a lot of trees.",
      "Is there a bus stop? Yes, there is — it's next to the shop.",
    ],
    checklist: [
      "There is (there's) with one thing; there are with more than one.",
      "Negatives: there isn't a… / there aren't any….",
      "You didn't use “it has” to say that something exists in a place.",
    ],
  },
  masteryCriteria: [
    "Use there is and there are with singular and plural nouns.",
    "Make negatives and questions, using any with plurals.",
    "Describe what is in a place.",
  ],
};

// ---------------------------------------------------------------------------
// Lesson 8 — Prepositions of place
// ---------------------------------------------------------------------------
const l8 = exerciseKit({
  prefix: "a1-prep",
  objective: "Say where things are with prepositions of place.",
  concepts: ["prepositions-of-place"],
});

export const lessonPrepositions = {
  slug: "a1-prepositions-of-place",
  status: "published" as const,
  title: "In, on, under, next to: saying where things are",
  objective: "Use in, on, under, next to, between, in front of and behind to say where people and things are.",
  estimatedMinutes: 15,
  concepts: ["prepositions-of-place"],
  body: [
    {
      type: "paragraph" as const,
      text: "Prepositions of place say **where** something is: The keys are **on** the table.",
    },
    {
      type: "table" as const,
      caption: "Common prepositions of place",
      headers: ["Preposition", "Meaning", "Example"],
      rows: [
        ["in", "inside a space", "The milk is in the fridge."],
        ["on", "touching a surface", "Your phone is on the desk."],
        ["under", "below", "The cat is under the bed."],
        ["next to", "beside", "The bank is next to the post office."],
        ["between", "in the middle of two things", "The café is between the bank and the shop."],
        ["in front of", "facing, ahead of", "There's a car in front of the house."],
        ["behind", "at the back of", "The garden is behind the house."],
      ],
    },
    {
      type: "rule" as const,
      title: "In or on?",
      text: "Use **in** for inside a room, box, city or country (**in** the kitchen, **in** Lagos). Use **on** for surfaces (**on** the wall, **on** the floor) and for floors of a building (**on** the second floor).",
    },
    {
      type: "examples" as const,
      items: [
        { text: "My bag is **under** the chair." },
        { text: "There's a picture **on** the wall." },
        { text: "She lives **in** Cairo." },
        { text: "The school is **between** the hospital and the park." },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        { wrong: "The book is in the table.", right: "The book is on the table.", why: "On = touching a surface." },
        { wrong: "She lives on London.", right: "She lives in London.", why: "Use in for cities and countries." },
        { wrong: "The bank is next the shop.", right: "The bank is next to the shop.", why: "Next always needs to." },
        {
          wrong: "The café is between the bank.",
          right: "The café is between the bank and the shop.",
          why: "Between needs two things: between … and ….",
        },
      ],
    },
  ],
  guided: [
    l8("multiple_choice", "g1", {
      instructions: "Choose the correct preposition.",
      hint: "The milk is inside the fridge.",
      explanation: "Inside a space: in the fridge.",
      payload: {
        prompt: "The milk is ___ the fridge.",
        options: [
          { id: "a", text: "in" },
          { id: "b", text: "on" },
          { id: "c", text: "under" },
        ],
        correct: "a",
        optionFeedback: { b: "On is for surfaces. The milk is inside the fridge.", c: "Under means below." },
      },
    }),
    l8("multiple_choice", "g2", {
      instructions: "Choose the correct preposition.",
      hint: "A wall is a surface.",
      explanation: "Surfaces such as walls take on: a clock on the wall.",
      payload: {
        prompt: "There's a clock ___ the wall.",
        options: [
          { id: "a", text: "in" },
          { id: "b", text: "on" },
          { id: "c", text: "between" },
        ],
        correct: "b",
        optionFeedback: { a: "A wall is a surface, so use on.", c: "Between needs two things." },
      },
    }),
    l8("matching", "g3", {
      instructions: "Match each meaning to its preposition.",
      explanation: "inside → in · below → under · beside → next to · at the back of → behind.",
      payload: {
        pairs: [
          { left: "inside", right: "in" },
          { left: "below", right: "under" },
          { left: "beside", right: "next to" },
          { left: "at the back of", right: "behind" },
        ],
      },
    }),
    l8("gap_fill", "g4", {
      instructions: "Write the correct preposition.",
      hint: "Read the second sentence.",
      explanation: "On the floor below the bed: under the bed.",
      payload: {
        text: "My shoes are ___ the bed. They're on the floor below it.",
        blanks: [
          { accepted: ["under"], feedback: { on: "Then the shoes would be on top of the bed. They are below it." } },
        ],
      },
    }),
  ],
  independent: [
    l8("error_correction", "i1", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "Cities take in: My parents live in Nairobi.",
      payload: {
        sentence: "My parents live on Nairobi.",
        accepted: ["My parents live in Nairobi."],
        feedback: { "my parents live on nairobi": "Which preposition goes with cities?" },
      },
    }),
    l8("gap_fill", "i2", {
      instructions: "Write the correct preposition.",
      explanation: "Two places are named, so use between … and ….",
      difficulty: 2,
      payload: {
        text: "The pharmacy is ___ the bank and the supermarket.",
        blanks: [{ accepted: ["between"], feedback: { "next to": "Two places are mentioned: between … and …." } }],
      },
    }),
    l8("word_order", "i3", {
      instructions: "Put the words in the correct order.",
      explanation:
        "Subject + is + next to + place: The bank is next to the school (or The school is next to the bank).",
      skill: "sentence_construction",
      difficulty: 2,
      payload: {
        tokens: ["the", "is", "next", "to", "bank", "the", "school"],
        accepted: ["the bank is next to the school", "the school is next to the bank"],
        punctuation: ".",
      },
    }),
    l8("multiple_choice", "i4", {
      instructions: "Choose the correct sentence.",
      explanation: "A table is a surface: The keys are on the table.",
      payload: {
        prompt: "Which sentence is correct?",
        options: [
          { id: "a", text: "The keys are in the table." },
          { id: "b", text: "The keys are on the table." },
          { id: "c", text: "The keys are on table." },
        ],
        correct: "b",
        optionFeedback: { a: "A table is a surface: on.", c: "You need the before table here." },
      },
    }),
  ],
  recall: [
    l8("gap_fill", "r1", {
      instructions: "Complete the sentence from memory.",
      explanation: "A wall is a surface: on the wall.",
      payload: {
        text: "The photo is ___ the wall.",
        blanks: [{ accepted: ["on"], feedback: { in: "A wall is a surface: on." } }],
      },
    }),
    l8("short_answer", "r2", {
      instructions: "Answer from memory.",
      explanation: "Between = in the middle of two things.",
      payload: { prompt: "Which preposition means 'in the middle of two things'?", accepted: ["between"] },
    }),
  ],
  application: {
    prompt: "Describe where five things are in your room, using different prepositions.",
    modelAnswers: [
      "My bed is next to the window.",
      "There's a lamp on the desk.",
      "My shoes are under the bed.",
      "The wardrobe is behind the door.",
      "My phone is in my bag.",
    ],
    checklist: [
      "You used at least four different prepositions.",
      "In for inside things and places; on for surfaces.",
      "Next to (with to) and between … and ….",
    ],
  },
  masteryCriteria: [
    "Use in, on, under, next to, between, in front of and behind correctly.",
    "Choose in or on for rooms, cities and surfaces.",
    "Describe where things are in a room.",
  ],
};
