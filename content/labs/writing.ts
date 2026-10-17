/**
 * Writing workshop tasks by level. Each has guidance, a self-check list and a
 * model answer, so the workshop is useful with or without AI feedback.
 * Written with AI assistance — pending review by an English teacher.
 */
import type { z } from "zod";
import type { writingTaskSchema } from "./schemas";

type WritingInput = z.input<typeof writingTaskSchema>;
const define = (tasks: WritingInput[]) => tasks;

export const writingTasks = define([
  {
    slug: "a1-introduce-yourself",
    level: "A1",
    title: "Introduce yourself",
    genre: "message",
    prompt: "You are joining an online English class. Write a short message to the class to introduce yourself.",
    guidance: ["Your name and where you are from", "Your job or what you study", "Something you like doing"],
    minWords: 25,
    maxWords: 80,
    checklist: [
      "I used I'm / I am correctly.",
      "Each sentence starts with a capital letter and ends with a full stop.",
      "I used a or an before jobs (I'm a teacher, I'm an engineer).",
      "I said where I'm from with from.",
    ],
    modelAnswer:
      "Hello everyone! My name is Ana and I'm from Valencia, in Spain. I'm a nurse and I work in a big hospital. I like cooking and walking in the mountains at the weekend. I want to speak English for my job. See you in class!",
    concepts: ["be-present-positive", "articles-a-an", "subject-pronouns"],
    estimatedMinutes: 10,
  },
  {
    slug: "a1-describe-your-home",
    level: "A1",
    title: "Describe your home",
    genre: "description",
    prompt: "Describe your flat or house for a friend who wants to visit you.",
    guidance: [
      "How many rooms there are",
      "What is in your favourite room",
      "Where things are (next to, opposite, in, on)",
    ],
    minWords: 35,
    maxWords: 100,
    checklist: [
      "I used there is for one thing and there are for two or more.",
      "I used prepositions of place (in, on, next to, under, opposite).",
      "Plural nouns end in -s where needed (two bedrooms).",
      "I used a or an the first time I mention a thing.",
    ],
    modelAnswer:
      "I live in a small flat on the third floor. There are two bedrooms, a kitchen and a living room. My favourite room is the living room. There's a big sofa next to the window, and there are lots of plants on the table. There isn't a garden, but there's a park opposite my building.",
    concepts: ["there-is-there-are", "prepositions-of-place", "plural-nouns"],
    estimatedMinutes: 12,
  },
  {
    slug: "a1-my-daily-routine",
    level: "A1",
    title: "My daily routine",
    genre: "description",
    prompt: "Write about a normal weekday in your life, from the morning to the evening.",
    guidance: [
      "What time you get up",
      "What you do in the morning and the afternoon",
      "What you usually do in the evening",
    ],
    minWords: 40,
    maxWords: 110,
    checklist: [
      "I used the present simple for routines (I get up, I work).",
      "I used at with clock times (at seven o'clock).",
      "I used words like usually, always, sometimes or never before the main verb.",
      "I used then or after that to connect the steps of my day.",
    ],
    modelAnswer:
      "On weekdays I get up at half past six. I have breakfast with my sister and then I go to work by train. I work in an office from nine to five. I usually have lunch with my colleagues in a café. After work I sometimes go to the gym. In the evening I cook dinner, watch TV and go to bed at eleven.",
    concepts: ["present-simple-third-person", "present-simple-do-does"],
    estimatedMinutes: 12,
  },
  {
    slug: "a1-describe-a-family-member",
    level: "A1",
    title: "Someone in my family",
    genre: "description",
    prompt: "Write about a person in your family. Say who they are, what they do and what they like.",
    guidance: [
      "Who the person is (my brother, my aunt…)",
      "Their job and where they live",
      "What they like or don't like",
    ],
    minWords: 35,
    maxWords: 100,
    checklist: [
      "I added -s to verbs after he or she (she works, he likes).",
      "I used doesn't for negatives with he or she (she doesn't like).",
      "I used his for a man and her for a woman.",
    ],
    modelAnswer:
      "I want to write about my aunt Lucy. She is my mother's sister and she lives in Cork, in Ireland. She is a doctor and she works at a children's hospital. Her husband is a teacher. Lucy loves music and she plays the piano every evening. She doesn't like coffee, but she drinks a lot of tea!",
    concepts: ["present-simple-third-person", "possessive-adjectives"],
    estimatedMinutes: 12,
  },
  {
    slug: "a1-email-about-your-town",
    level: "A1",
    title: "An email about your town",
    genre: "email",
    prompt: "A friend from another country wants to visit your town. Write an email and tell them about it.",
    guidance: [
      "Start with Hi or Dear and a name",
      "What there is in your town",
      "A place you think they will like, and why",
      "Finish with a friendly line",
    ],
    minWords: 40,
    maxWords: 120,
    checklist: [
      "I started and finished the email correctly (Hi …, See you soon, …).",
      "I used there is / there are to describe the town.",
      "I gave a reason with because.",
      "I checked capital letters for names of places.",
    ],
    modelAnswer:
      "Hi Marco,\n\nThanks for your email! My town is small but very nice. There's an old castle on the hill and there are some good restaurants near the river. You can visit the market on Saturday morning — it's my favourite place because the food is great. There isn't an airport, but the train station is in the centre.\n\nSee you soon,\nEmma",
    concepts: ["there-is-there-are"],
    estimatedMinutes: 15,
  },
  {
    slug: "a1-reply-to-an-invitation",
    level: "A1",
    title: "Reply to an invitation",
    genre: "message",
    prompt:
      "Your friend writes: “It's my birthday on Saturday! Can you come to my party at 7 pm?” Write a reply. You can say yes or no.",
    guidance: ["Say thank you", "Say if you can come (I can / I can't)", "Give a reason or ask a question"],
    minWords: 20,
    maxWords: 70,
    checklist: [
      "I used can or can't followed by a verb without to (I can come).",
      "I said thank you.",
      "If I can't come, I gave a short reason.",
    ],
    modelAnswer:
      "Hi Sara, thank you for the invitation! Happy birthday for Saturday. I'm sorry, but I can't come to your party, because I work on Saturday evenings. Can we meet for coffee on Sunday? I have a small present for you.",
    concepts: ["can-ability"],
    estimatedMinutes: 8,
  },
  {
    slug: "a2-last-weekend",
    level: "A2",
    title: "What I did last weekend",
    genre: "story",
    prompt:
      "Write about what you did last weekend. Include at least one thing that went well and one thing that didn't.",
    guidance: ["Where you went and who you were with", "What happened, in order", "How you felt"],
    minWords: 60,
    maxWords: 150,
    checklist: [
      "I used the past simple for finished actions (went, saw, didn't go).",
      "I checked irregular verbs (go → went, see → saw, have → had).",
      "I used first, then, after that or in the end to order events.",
      "I said how I felt (It was great, I was tired).",
    ],
    modelAnswer:
      "Last weekend I went to Brighton with two friends. We took the train on Saturday morning and arrived at about ten. First, we walked along the beach and had coffee by the sea. The weather was beautiful. Then we visited the old shops in the town centre. In the afternoon it started to rain, and we didn't have umbrellas, so we got very wet! In the end, we had dinner in a small Italian restaurant and went home on the last train. I was tired but happy.",
    concepts: [],
    estimatedMinutes: 15,
  },
  {
    slug: "a2-review-a-cafe",
    level: "A2",
    title: "Review a café or restaurant",
    genre: "review",
    prompt: "Write a short online review of a café or restaurant you visited recently.",
    guidance: [
      "Where it is and when you went",
      "What you ate or drank",
      "What was good and what wasn't",
      "Would you recommend it?",
    ],
    minWords: 60,
    maxWords: 150,
    checklist: [
      "I described the food and the place with adjectives (fresh, friendly, noisy).",
      "I used but or however to contrast good and bad points.",
      "I used the past simple for my visit.",
      "I finished with a clear recommendation.",
    ],
    modelAnswer:
      "I visited Café Lumen on Market Street last Friday with my colleague. It's a small, bright café with big windows and lots of plants. I had a vegetable soup and a slice of carrot cake. The soup was fresh and hot, and the cake was delicious. The staff were friendly, but the service was quite slow because there was only one waiter. It was also a bit expensive. However, I'd definitely recommend it for a relaxed lunch.",
    concepts: [],
    estimatedMinutes: 15,
  },
  {
    slug: "a2-email-asking-for-information",
    level: "A2",
    title: "Ask for information",
    genre: "email",
    prompt: "You want to join an evening course at a language school. Write an email to ask for information.",
    guidance: [
      "Say which course you're interested in",
      "Ask about days, times and the price",
      "Ask one more question",
      "Finish politely",
    ],
    minWords: 50,
    maxWords: 130,
    checklist: [
      "I used a polite opening and closing (Dear …, Best wishes).",
      "I asked questions with the correct word order (When does the course start?).",
      "I used polite phrases (Could you tell me…? I would like to…).",
      "I explained why I'm writing in the first sentence.",
    ],
    modelAnswer:
      "Dear Sir or Madam,\n\nI am writing to ask about your evening Spanish course for beginners. Could you tell me which days the classes are on and what time they start? I would also like to know the price of the course and if the books are included. Finally, is it possible to try one class before I pay?\n\nThank you for your help.\n\nBest wishes,\nDaniel Park",
    concepts: [],
    estimatedMinutes: 15,
  },
]);
