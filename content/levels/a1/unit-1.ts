/**
 * A1 · Unit 1 · People and things
 * Lessons: subject pronouns and be; be negatives and questions; a/an; plural nouns.
 */
import { exerciseKit } from "../../kit";

// ---------------------------------------------------------------------------
// Lesson 1 — Subject pronouns and be (am / is / are)
// ---------------------------------------------------------------------------
const l1 = exerciseKit({
  prefix: "a1-be",
  objective: "Use the correct form of be (am, is, are) with each subject.",
  concepts: ["subject-pronouns", "be-present-positive"],
});

export const lessonBe = {
  slug: "a1-subject-pronouns-and-be",
  status: "published" as const,
  title: "I am, you are, she is: subject pronouns and be",
  objective: "Use subject pronouns and the correct form of be (am, is, are) to talk about yourself and other people.",
  estimatedMinutes: 15,
  concepts: ["subject-pronouns", "be-present-positive"],
  body: [
    {
      type: "paragraph" as const,
      text: "**Subject pronouns** replace a person or thing at the start of a sentence: **I, you, he, she, it, we, they**. The verb **be** changes with the subject: **am, is** or **are**.",
    },
    {
      type: "table" as const,
      caption: "The verb be in the present",
      headers: ["Subject", "be", "Short form", "Example"],
      rows: [
        ["I", "am", "I'm", "I'm a student."],
        ["you", "are", "you're", "You're early."],
        ["he", "is", "he's", "He's my brother."],
        ["she", "is", "she's", "She's from Kenya."],
        ["it", "is", "it's", "It's cold today."],
        ["we", "are", "we're", "We're friends."],
        ["they", "are", "they're", "They're at home."],
      ],
    },
    {
      type: "rule" as const,
      title: "He, she, it or they?",
      text: "Use **he** for a man or boy, **she** for a woman or girl, and **it** for a thing or an animal. Use **they** for more than one person or thing. **You** is the same for one person or many people.",
    },
    {
      type: "examples" as const,
      items: [
        { text: "My name **is** Ana. **I'm** 24." },
        { text: "Tom and Lucy **are** in London. **They're** on holiday.", note: "Tom and Lucy → they" },
        { text: "This phone **is** new. **It's** very fast.", note: "a thing → it" },
        { text: "My sister and I **are** students. **We're** in the same class.", note: "my sister and I → we" },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        { wrong: "She are a teacher.", right: "She is a teacher.", why: "With he, she and it, use is." },
        { wrong: "I is hungry.", right: "I am hungry.", why: "I always takes am." },
        {
          wrong: "My brother he is a doctor.",
          right: "My brother is a doctor.",
          why: "Don't repeat the subject. Use the noun or the pronoun, not both.",
        },
        {
          wrong: "Is cold today.",
          right: "It is cold today.",
          why: "English sentences need a subject. Use it for weather, time and distance.",
        },
      ],
    },
  ],
  guided: [
    l1("multiple_choice", "g1", {
      instructions: "Choose the correct word.",
      hint: "She is one person, and she is not I or you.",
      explanation: "With he, she and it, the verb be is is: She is a nurse.",
      payload: {
        prompt: "She ___ a nurse.",
        options: [
          { id: "a", text: "am" },
          { id: "b", text: "is" },
          { id: "c", text: "are" },
        ],
        correct: "b",
        optionFeedback: { a: "Am is only for I.", c: "Are goes with you, we and they." },
      },
    }),
    l1("matching", "g2", {
      instructions: "Match each person or thing to the pronoun that replaces it.",
      hint: "Ask: is it a man, a woman, a thing, or more than one?",
      explanation: "my sister → she · Mr Lee → he · my phone → it · Ali and I → we · the children → they.",
      concepts: ["subject-pronouns"],
      payload: {
        pairs: [
          { left: "my sister", right: "she" },
          { left: "Mr Lee", right: "he" },
          { left: "my phone", right: "it" },
          { left: "Ali and I", right: "we" },
          { left: "the children", right: "they" },
        ],
      },
    }),
    l1("gap_fill", "g3", {
      instructions: "Write am, is or are.",
      hint: "We means more than one person.",
      explanation: "We is plural, so the verb is are: We are in the same class.",
      payload: {
        text: "We ___ in the same class.",
        blanks: [
          { accepted: ["are"], feedback: { is: "We is more than one person, so use are.", am: "Am is only for I." } },
        ],
      },
    }),
    l1("gap_fill", "g4", {
      instructions: "Write am, is or are in each gap.",
      hint: "Look at the subject before each gap: I, then my friends.",
      explanation: "I am from Nigeria. My friends = they, so: my friends are from Ghana.",
      difficulty: 2,
      payload: {
        text: "I ___ from Nigeria and my friends ___ from Ghana.",
        blanks: [
          { accepted: ["am"], feedback: { is: "I always takes am.", are: "I always takes am." } },
          { accepted: ["are"], feedback: { is: "My friends means more than one person (they), so use are." } },
        ],
      },
    }),
  ],
  independent: [
    l1("multiple_choice", "i1", {
      instructions: "Choose the correct pronoun.",
      explanation: "The second sentence says her name, so the friend is a woman or girl: She is my best friend.",
      concepts: ["subject-pronouns"],
      payload: {
        prompt: "___ is my best friend. Her name is Mia.",
        options: [
          { id: "a", text: "He" },
          { id: "b", text: "She" },
          { id: "c", text: "It" },
        ],
        correct: "b",
        optionFeedback: {
          a: "Her name tells us the friend is female.",
          c: "It is for things and animals, not people.",
        },
      },
    }),
    l1("transformation", "i2", {
      instructions: "Rewrite the sentence.",
      explanation: "Maria is a woman, so the pronoun is she, and she takes is: She is a doctor (or She's a doctor).",
      payload: {
        source: "Maria is a doctor.",
        instruction: "Replace Maria with a pronoun.",
        accepted: ["She is a doctor."],
        feedback: {
          "he is a doctor": "Maria is a woman's name, so use she.",
          "she are a doctor": "She takes is, not are.",
        },
      },
    }),
    l1("error_correction", "i3", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "They is plural, so the verb is are: They are very kind.",
      difficulty: 2,
      payload: {
        sentence: "They is very kind.",
        accepted: ["They are very kind."],
        feedback: { "they is very kind": "Look again at the verb after they." },
      },
    }),
    l1("word_order", "i4", {
      instructions: "Put the words in the correct order.",
      explanation: "Subject + be + the rest: They are my classmates.",
      skill: "sentence_construction",
      difficulty: 2,
      payload: { tokens: ["are", "my", "they", "classmates"], accepted: ["they are my classmates"], punctuation: "." },
    }),
  ],
  recall: [
    l1("short_answer", "r1", {
      instructions: "Answer from memory.",
      explanation: "I always takes am: I am (I'm).",
      payload: { prompt: "Which form of be goes with I?", accepted: ["am"] },
    }),
    l1("gap_fill", "r2", {
      instructions: "Complete the sentence from memory.",
      explanation: "Use it for the weather, and it takes is: It is sunny today.",
      payload: {
        text: "___ is sunny today.",
        blanks: [{ accepted: ["It"], feedback: { is: "The sentence needs a subject before is: It is sunny today." } }],
      },
    }),
    l1("short_answer", "r3", {
      instructions: "Answer from memory.",
      explanation: "My parents are more than one person, so the pronoun is they.",
      concepts: ["subject-pronouns"],
      payload: { prompt: "Which pronoun replaces 'my parents'?", accepted: ["they"] },
    }),
  ],
  application: {
    prompt: "Write three sentences about yourself and people you know. Use I am, he or she is, and they are.",
    modelAnswers: [
      "I'm Ana and I'm a student.",
      "My brother is a chef. He's 30.",
      "My parents are in Lagos. They're teachers.",
    ],
    checklist: [
      "Every sentence has a subject (I, he, she, it, we, they or a name).",
      "I uses am; he, she and it use is; you, we and they use are.",
      "You used at least one short form, such as I'm or she's.",
    ],
  },
  masteryCriteria: [
    "Choose am, is or are correctly for every subject.",
    "Replace names and nouns with the right pronoun.",
    "Write simple sentences about yourself and others without help.",
  ],
};

// ---------------------------------------------------------------------------
// Lesson 2 — Be: negatives and questions
// ---------------------------------------------------------------------------
const l2 = exerciseKit({
  prefix: "a1-be-neg",
  objective: "Make negatives, questions and short answers with be.",
  concepts: ["be-negatives-questions"],
});

export const lessonBeNegatives = {
  slug: "a1-be-negatives-and-questions",
  status: "published" as const,
  title: "Is she here? No, she isn't: be in negatives and questions",
  objective: "Make negative sentences, ask yes/no and wh- questions, and give short answers with be.",
  estimatedMinutes: 15,
  concepts: ["be-negatives-questions"],
  body: [
    {
      type: "paragraph" as const,
      text: "To make **be** negative, put **not** after am, is or are. To ask a question, put **am, is** or **are** before the subject.",
    },
    {
      type: "table" as const,
      caption: "Negatives and questions with be",
      headers: ["Positive", "Negative", "Question"],
      rows: [
        ["I am ready.", "I'm not ready.", "Am I ready?"],
        ["She is at work.", "She isn't at work. / She's not at work.", "Is she at work?"],
        ["They are late.", "They aren't late. / They're not late.", "Are they late?"],
      ],
    },
    {
      type: "rule" as const,
      title: "Short answers",
      text: "Answer yes/no questions with a short answer: **Yes, I am. / No, I'm not. Yes, she is. / No, she isn't.** In a positive short answer, don't use the short form: say **Yes, she is**, not Yes, she's.",
    },
    {
      type: "examples" as const,
      items: [
        { text: "**Are you** a student? — Yes, **I am**." },
        { text: "**Is it** expensive? — No, **it isn't**." },
        {
          text: "**Where are** you from? — I'm from Egypt.",
          note: "Question words (where, what, how) come before be.",
        },
        { text: "I**'m not** tired. My brothers **aren't** tired either." },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        {
          wrong: "You are a student?",
          right: "Are you a student?",
          why: "In standard questions, be comes before the subject. (In speech, “You're a student?” can show surprise.)",
        },
        { wrong: "She not is here.", right: "She is not here.", why: "Not comes after be." },
        {
          wrong: "Yes, I'm.",
          right: "Yes, I am.",
          why: "Don't use a short form at the end of a positive short answer.",
        },
        {
          wrong: "Is they at home?",
          right: "Are they at home?",
          why: "The verb still matches the subject: they → are.",
        },
      ],
    },
  ],
  guided: [
    l2("multiple_choice", "g1", {
      instructions: "Choose the correct word.",
      hint: "Your sister is one person.",
      explanation: "Your sister = she, so the question starts with is: Is your sister at home?",
      payload: {
        prompt: "___ your sister at home?",
        options: [
          { id: "a", text: "Am" },
          { id: "b", text: "Is" },
          { id: "c", text: "Are" },
        ],
        correct: "b",
        optionFeedback: { a: "Am is only for I.", c: "Your sister is one person, so use is." },
      },
    }),
    l2("transformation", "g2", {
      instructions: "Rewrite the sentence.",
      hint: "Put not after are.",
      explanation: "Put not after are: We are not tired. Short forms: We aren't tired / We're not tired.",
      payload: {
        source: "We are tired.",
        instruction: "Make it negative.",
        accepted: ["We are not tired.", "We're not tired.", "We aren't tired."],
        feedback: { "we not are tired": "Not goes after are: We are not tired." },
      },
    }),
    l2("word_order", "g3", {
      instructions: "Put the words in order to make a question.",
      hint: "In a question, is comes first.",
      explanation: "Be + subject + the rest: Is he from Canada?",
      skill: "sentence_construction",
      payload: { tokens: ["from", "is", "Canada", "he"], accepted: ["is he from Canada"], punctuation: "?" },
    }),
    l2("multiple_choice", "g4", {
      instructions: "Choose the correct short answer.",
      hint: "Positive short answers end with the full form.",
      explanation: "Positive short answers use the full form at the end: Yes, I am.",
      payload: {
        prompt: "Are you hungry? — Yes, ___.",
        options: [
          { id: "a", text: "I am" },
          { id: "b", text: "I'm" },
          { id: "c", text: "I are" },
        ],
        correct: "a",
        optionFeedback: {
          b: "Don't use a short form at the end of a positive short answer: Yes, I am.",
          c: "I always takes am.",
        },
      },
    }),
  ],
  independent: [
    l2("gap_fill", "i1", {
      instructions: "Complete the sentence. Use a negative form of be.",
      explanation:
        "The second sentence says the phone is old, so the first is negative: My phone isn't new (is not new).",
      payload: {
        text: "My phone ___ new. It's very old!",
        blanks: [
          {
            accepted: ["isn't", "is not"],
            feedback: {
              is: "The second sentence says it's old, so the first must be negative.",
              "not is": "Not comes after is: is not.",
            },
          },
        ],
      },
    }),
    l2("transformation", "i2", {
      instructions: "Rewrite the sentence.",
      explanation: "Put are before they: Are they in the classroom?",
      payload: {
        source: "They are in the classroom.",
        instruction: "Make it a question.",
        accepted: ["Are they in the classroom?"],
        feedback: { "they are in the classroom": "In a question, put are before they." },
      },
    }),
    l2("error_correction", "i3", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "Your parents = they, so the question uses are: Are your parents at work?",
      difficulty: 2,
      payload: {
        sentence: "Is your parents at work?",
        accepted: ["Are your parents at work?"],
        feedback: { "is your parents at work": "Your parents are more than one person." },
      },
    }),
    l2("matching", "i4", {
      instructions: "Match each question to the best answer.",
      explanation: "The short answer repeats the subject and be from the question: Is it…? — Yes, it is.",
      difficulty: 2,
      payload: {
        pairs: [
          { left: "Are you from Italy?", right: "No, I'm not." },
          { left: "Is it Monday today?", right: "Yes, it is." },
          { left: "Are they your friends?", right: "Yes, they are." },
          { left: "Is Sam a teacher?", right: "No, he isn't." },
        ],
      },
    }),
  ],
  recall: [
    l2("short_answer", "r1", {
      instructions: "Answer from memory.",
      explanation: "Put not after am: I am not late (I'm not late).",
      payload: {
        prompt: "Make this sentence negative: I am late.",
        accepted: ["I am not late."],
        feedback: { "i amn't late": "Amn't is not used. Say I'm not late." },
      },
    }),
    l2("multiple_choice", "r2", {
      instructions: "Choose the correct question.",
      explanation: "Question word + be + subject: Where are you from?",
      payload: {
        prompt: "Which question is correct?",
        options: [
          { id: "a", text: "Where you are from?" },
          { id: "b", text: "Where are you from?" },
          { id: "c", text: "Where is you from?" },
        ],
        correct: "b",
        optionFeedback: { a: "Put are before you.", c: "You takes are." },
      },
    }),
  ],
  application: {
    prompt:
      "Write two yes/no questions you could ask a new classmate. Then answer them about yourself with short answers.",
    modelAnswers: [
      "Are you from Lagos? — No, I'm not. I'm from Abuja.",
      "Is your English class in the morning? — Yes, it is.",
    ],
    checklist: [
      "Each question starts with am, is or are, or with a question word + be.",
      "Each short answer repeats be: Yes, I am / No, I'm not.",
      "Positive short answers have no short form at the end (Yes, it is — not Yes, it's).",
    ],
  },
  masteryCriteria: [
    "Make negative sentences with I'm not, isn't and aren't.",
    "Form yes/no and wh- questions with be.",
    "Give correct short answers.",
  ],
};

// ---------------------------------------------------------------------------
// Lesson 3 — a / an
// ---------------------------------------------------------------------------
const l3 = exerciseKit({
  prefix: "a1-a-an",
  objective: "Choose a or an by the first sound of the next word.",
  concepts: ["articles-a-an"],
});

export const lessonAAn = {
  slug: "a1-a-and-an",
  status: "published" as const,
  title: "A book, an apple: using a and an",
  objective: "Use a and an with one person or thing, and choose between them by sound.",
  estimatedMinutes: 12,
  concepts: ["articles-a-an"],
  body: [
    {
      type: "paragraph" as const,
      text: "Use **a** or **an** before **one** person or thing (a singular noun) when you mention it for the first time, or to say what someone or something is: **She's a teacher. I have an idea.**",
    },
    {
      type: "rule" as const,
      title: "Sound, not spelling",
      text: "Use **a** before a consonant sound and **an** before a vowel sound. What matters is the first **sound** you hear, not the first letter.",
    },
    {
      type: "examples" as const,
      items: [
        { text: "**a** book, **a** car, **a** doctor" },
        { text: "**an** apple, **an** egg, **an** engineer" },
        { text: "**an** hour", note: "The h is silent, so the first sound is a vowel." },
        { text: "**a** university, **a** uniform", note: "These start with a “y” sound (you-niversity)." },
        { text: "She's **an** English teacher.", note: "A/an goes with the word right after it — here, English." },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        { wrong: "She is teacher.", right: "She is a teacher.", why: "Use a or an when you say someone's job." },
        { wrong: "It's an university.", right: "It's a university.", why: "University starts with a “y” sound." },
        { wrong: "I waited a hour.", right: "I waited an hour.", why: "The h in hour is silent." },
        {
          wrong: "I have a apples.",
          right: "I have an apple. / I have some apples.",
          why: "A and an are only for one thing.",
        },
      ],
    },
  ],
  guided: [
    l3("multiple_choice", "g1", {
      instructions: "Choose a or an.",
      hint: "Say engineer aloud. What is the first sound?",
      explanation: "Engineer starts with a vowel sound, so use an: I'm an engineer.",
      payload: {
        prompt: "I'm ___ engineer.",
        options: [
          { id: "a", text: "a" },
          { id: "b", text: "an" },
        ],
        correct: "b",
        optionFeedback: { a: "Engineer starts with a vowel sound." },
      },
    }),
    l3("multiple_choice", "g2", {
      instructions: "Choose a or an.",
      hint: "Say hour aloud. Do you hear the h?",
      explanation: "The h in hour is silent, so the first sound is a vowel: an hour.",
      payload: {
        prompt: "It takes ___ hour to get there.",
        options: [
          { id: "a", text: "a" },
          { id: "b", text: "an" },
        ],
        correct: "b",
        optionFeedback: { a: "The h in hour is silent, so it starts with a vowel sound." },
      },
    }),
    l3("gap_fill", "g3", {
      instructions: "Write a or an in each gap.",
      hint: "Egg starts with a vowel sound; banana starts with a consonant sound.",
      explanation: "an egg (vowel sound) · a banana (consonant sound).",
      payload: {
        text: "I eat ___ egg and ___ banana every morning.",
        blanks: [
          { accepted: ["an"], feedback: { a: "Egg starts with a vowel sound." } },
          { accepted: ["a"], feedback: { an: "Banana starts with a consonant sound /b/." } },
        ],
      },
    }),
    l3("gap_fill", "g4", {
      instructions: "Write a or an.",
      explanation: "Umbrella starts with a vowel sound: an umbrella.",
      payload: {
        text: "Don't forget ___ umbrella!",
        blanks: [{ accepted: ["an"], feedback: { a: "Umbrella starts with a vowel sound." } }],
      },
    }),
  ],
  independent: [
    l3("multiple_choice", "i1", {
      instructions: "Choose a or an.",
      explanation: "University starts with a “y” sound (a consonant sound), so use a.",
      difficulty: 2,
      payload: {
        prompt: "This is ___ university in Ghana.",
        options: [
          { id: "a", text: "a" },
          { id: "b", text: "an" },
        ],
        correct: "a",
        optionFeedback: { b: "University starts with a “y” sound, so use a." },
      },
    }),
    l3("error_correction", "i2", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "Architect starts with a vowel sound: My father is an architect.",
      payload: {
        sentence: "My father is a architect.",
        accepted: ["My father is an architect."],
        feedback: { "my father is a architect": "Look at the word before architect." },
      },
    }),
    l3("error_correction", "i3", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "Use a or an to say someone's job: He is a doctor.",
      payload: {
        sentence: "He is doctor.",
        accepted: ["He is a doctor."],
        feedback: { "he is an doctor": "Doctor starts with a consonant sound, so use a." },
      },
    }),
    l3("transformation", "i4", {
      instructions: "Rewrite the sentence.",
      explanation: "One person needs a: She is a student (She's a student).",
      difficulty: 2,
      payload: {
        source: "They are students.",
        instruction: "Rewrite it about one person. Start with She is.",
        accepted: ["She is a student."],
        feedback: {
          "she is student": "Use a with one person's job or role: She is a student.",
          "she is a students": "One person: student, not students.",
        },
      },
    }),
  ],
  recall: [
    l3("short_answer", "r1", {
      instructions: "Answer from memory.",
      explanation: "Orange starts with a vowel sound: an orange.",
      payload: { prompt: "Which word goes before 'orange'? Write a or an.", accepted: ["an"] },
    }),
    l3("multiple_choice", "r2", {
      instructions: "Choose the correct phrase.",
      explanation: "The h in hour is silent: an hour.",
      payload: {
        prompt: "Which is correct?",
        options: [
          { id: "a", text: "a hour" },
          { id: "b", text: "an hour" },
        ],
        correct: "b",
      },
    }),
  ],
  application: {
    prompt:
      "Write three sentences about jobs or things you own, using a and an. Include at least one word that starts with a vowel sound.",
    modelAnswers: ["My sister is an artist.", "I have a bike and an old phone.", "My uncle is a taxi driver."],
    checklist: [
      "Each single job or thing has a or an in front of it.",
      "You used an before vowel sounds (an artist, an old phone).",
      "You didn't use a or an with plural words.",
    ],
  },
  masteryCriteria: [
    "Use a or an with jobs and single things.",
    "Choose a or an by the first sound of the next word.",
    "Never use a or an with plural nouns.",
  ],
};

// ---------------------------------------------------------------------------
// Lesson 4 — Plural nouns
// ---------------------------------------------------------------------------
const l4 = exerciseKit({
  prefix: "a1-plural",
  objective: "Spell regular plurals and use common irregular plurals.",
  concepts: ["plural-nouns"],
});

export const lessonPlurals = {
  slug: "a1-plural-nouns",
  status: "published" as const,
  title: "One book, two books: plural nouns",
  objective: "Spell regular plural nouns correctly and use the most common irregular plurals.",
  estimatedMinutes: 15,
  concepts: ["plural-nouns"],
  body: [
    { type: "paragraph" as const, text: "Most nouns add **-s** to make the plural: one book → two **books**." },
    {
      type: "table" as const,
      caption: "Spelling the plural",
      headers: ["Ending", "Rule", "Examples"],
      rows: [
        ["most nouns", "add -s", "book → books, car → cars"],
        ["-s, -sh, -ch, -x", "add -es", "bus → buses, dish → dishes, watch → watches, box → boxes"],
        ["consonant + y", "change y to -ies", "city → cities, baby → babies"],
        ["vowel + y", "add -s", "day → days, key → keys"],
        ["-f / -fe (many words)", "change to -ves", "knife → knives, wife → wives"],
      ],
    },
    {
      type: "rule" as const,
      title: "Irregular plurals",
      text: "Some common nouns have special plurals: man → **men**, woman → **women**, child → **children**, person → **people**, foot → **feet**, tooth → **teeth**.",
    },
    {
      type: "examples" as const,
      items: [
        { text: "I have two **brothers** and three **sisters**." },
        { text: "Thirty **children** are in the class." },
        { text: "These **boxes** are heavy." },
        { text: "Five **people** are in my family.", note: "people = more than one person" },
      ],
    },
    {
      type: "mistakes" as const,
      items: [
        { wrong: "two childs", right: "two children", why: "Child has an irregular plural." },
        {
          wrong: "three persons",
          right: "three people",
          why: "People is the normal plural of person. (Persons appears mainly in formal or legal writing.)",
        },
        { wrong: "two citys", right: "two cities", why: "Consonant + y changes to -ies." },
        { wrong: "a books", right: "a book / books", why: "Don't use a or an with a plural noun." },
      ],
    },
  ],
  guided: [
    l4("multiple_choice", "g1", {
      instructions: "Choose the correct plural.",
      hint: "Bus ends in -s.",
      explanation: "Nouns ending in -s add -es: bus → buses.",
      payload: {
        prompt: "one bus, two ___",
        options: [
          { id: "a", text: "buss" },
          { id: "b", text: "buses" },
          { id: "c", text: "busies" },
        ],
        correct: "b",
        optionFeedback: { a: "After -s, add -es.", c: "-ies is for words ending in consonant + y." },
      },
    }),
    l4("gap_fill", "g2", {
      instructions: "Write the plural of the word in brackets.",
      hint: "This one is irregular.",
      explanation: "Child → children (irregular).",
      payload: {
        text: "I have two ___ (child).",
        blanks: [
          {
            accepted: ["children"],
            feedback: {
              childs: "Child has an irregular plural: children.",
              childrens: "Children is already plural — no -s.",
            },
          },
        ],
      },
    }),
    l4("matching", "g3", {
      instructions: "Match each word to its plural.",
      hint: "All of these are irregular.",
      explanation: "woman → women · foot → feet · tooth → teeth · person → people · man → men.",
      payload: {
        pairs: [
          { left: "woman", right: "women" },
          { left: "foot", right: "feet" },
          { left: "tooth", right: "teeth" },
          { left: "person", right: "people" },
          { left: "man", right: "men" },
        ],
      },
    }),
    l4("gap_fill", "g4", {
      instructions: "Write the plural of the word in brackets.",
      hint: "Beach ends in -ch.",
      explanation: "After -ch, add -es: beach → beaches.",
      payload: {
        text: "My city has many beautiful ___ (beach).",
        blanks: [{ accepted: ["beaches"], feedback: { beachs: "After -ch, add -es." } }],
      },
    }),
  ],
  independent: [
    l4("gap_fill", "i1", {
      instructions: "Write the plural of each word in brackets.",
      explanation: "baby → babies (consonant + y) · boy → boys (vowel + y).",
      difficulty: 2,
      payload: {
        text: "I can see three ___ (baby) and two ___ (boy) in the photo.",
        blanks: [
          { accepted: ["babies"], feedback: { babys: "Consonant + y changes to -ies." } },
          { accepted: ["boys"], feedback: { boies: "Vowel + y just adds -s." } },
        ],
      },
    }),
    l4("error_correction", "i2", {
      instructions: "There is one mistake. Write the correct sentence.",
      explanation: "Knife → knives (-fe changes to -ves).",
      payload: {
        sentence: "We need two knifes.",
        accepted: ["We need two knives."],
        feedback: { "we need two knifes": "Look at the plural of knife." },
      },
    }),
    l4("short_answer", "i3", {
      instructions: "Write the plural.",
      explanation: "City ends in consonant + y, so y → -ies: cities.",
      payload: {
        prompt: "Write the plural of 'city'.",
        accepted: ["cities"],
        feedback: { citys: "Consonant + y changes to -ies." },
      },
    }),
    l4("multiple_choice", "i4", {
      instructions: "Choose the correct sentence.",
      explanation: "Numbers above one go with a plural noun and no a: I have two cats.",
      payload: {
        prompt: "Which sentence is correct?",
        options: [
          { id: "a", text: "I have a two cats." },
          { id: "b", text: "I have two cats." },
          { id: "c", text: "I have two cat." },
        ],
        correct: "b",
        optionFeedback: { a: "Don't use a with a plural noun.", c: "Two needs a plural noun: cats." },
      },
    }),
  ],
  recall: [
    l4("short_answer", "r1", {
      instructions: "Answer from memory.",
      explanation: "After -x, add -es: boxes.",
      payload: { prompt: "Write the plural of 'box'.", accepted: ["boxes"], feedback: { boxs: "After -x, add -es." } },
    }),
    l4("short_answer", "r2", {
      instructions: "Answer from memory.",
      explanation: "The normal plural of person is people.",
      payload: {
        prompt: "Write the usual plural of 'person'.",
        accepted: ["people"],
        feedback: { persons: "People is the usual plural in everyday English." },
      },
    }),
  ],
  application: {
    prompt:
      "Describe your home or classroom in two or three sentences using plural nouns. Include one irregular plural if you can.",
    modelAnswers: [
      "My kitchen has two windows and four chairs.",
      "My brother has three children.",
      "I have two keys and a lot of books.",
    ],
    checklist: [
      "Plural nouns end in -s, -es or -ies, or use a special form (children, people).",
      "There is no a or an before plural nouns.",
      "Numbers above one go with plural nouns (two windows).",
    ],
  },
  masteryCriteria: [
    "Spell regular plurals correctly (-s, -es, -ies).",
    "Use common irregular plurals such as children and people.",
    "Never use a or an with plurals.",
  ],
};
