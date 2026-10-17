/**
 * Pronunciation lab content: minimal pairs, word stress and intonation.
 * Sounds are British English (IPA). Model audio is a computer-generated voice:
 * a useful guide, not a perfect model of natural speech.
 * Written with AI assistance — pending review by an English teacher.
 */
import type { z } from "zod";
import type { pronunciationSchema } from "./schemas";

type PronunciationInput = z.input<typeof pronunciationSchema>;

export const pronunciation: PronunciationInput = {
  minimalPairs: [
    {
      slug: "short-i-long-ee",
      level: "A1",
      title: "ship or sheep? /ɪ/ and /iː/",
      sounds: [
        { symbol: "/ɪ/", name: "short i", howTo: "Short and relaxed. Your mouth is only a little open." },
        { symbol: "/iː/", name: "long ee", howTo: "Longer. Smile a little and keep your tongue high at the front." },
      ],
      tip: "The long sound is usually written ee, ea or e (sheep, leave, he). The short sound is usually i (ship, live).",
      pairs: [
        ["ship", "sheep"],
        ["live", "leave"],
        ["sit", "seat"],
        ["fill", "feel"],
        ["hit", "heat"],
        ["bin", "bean"],
        ["chip", "cheap"],
      ],
      sentences: ["Please sit in this seat.", "I live here, but I leave at six."],
    },
    {
      slug: "cat-or-cut",
      level: "A1",
      title: "cat or cut? /æ/ and /ʌ/",
      sounds: [
        { symbol: "/æ/", name: "a in cat", howTo: "Open your mouth wide, with your tongue low and forward." },
        { symbol: "/ʌ/", name: "u in cut", howTo: "Short, with your mouth less open and your tongue in the middle." },
      ],
      tip: "/æ/ is usually written a (cat, bag). /ʌ/ is usually written u or o (cut, son, money).",
      pairs: [
        ["cat", "cut"],
        ["hat", "hut"],
        ["bag", "bug"],
        ["cap", "cup"],
        ["ran", "run"],
        ["match", "much"],
      ],
      sentences: ["My cat sat on a cup.", "Thank you very much for the match."],
    },
    {
      slug: "think-or-sink",
      level: "A1",
      title: "think or sink? /θ/ and /s/",
      sounds: [
        { symbol: "/θ/", name: "th in think", howTo: "Put the tip of your tongue between your teeth and blow gently." },
        { symbol: "/s/", name: "s in sink", howTo: "Keep your tongue behind your teeth and make a hissing sound." },
      ],
      tip: "If people hear “sink” when you say “think”, put your tongue further forward, between your teeth.",
      pairs: [
        ["think", "sink"],
        ["thin", "sin"],
        ["thick", "sick"],
        ["mouth", "mouse"],
        ["path", "pass"],
      ],
      sentences: ["I think my mouse is sick.", "The path is thin, so pass slowly."],
    },
    {
      slug: "very-or-berry",
      level: "A2",
      title: "very or berry? /v/ and /b/",
      sounds: [
        { symbol: "/v/", name: "v in very", howTo: "Touch your top teeth to your bottom lip and use your voice." },
        { symbol: "/b/", name: "b in berry", howTo: "Close both lips, then open them quickly with your voice." },
      ],
      tip: "For /v/ your lips never close completely. For /b/ they close and then open.",
      pairs: [
        ["very", "berry"],
        ["vote", "boat"],
        ["van", "ban"],
        ["vest", "best"],
        ["vet", "bet"],
      ],
      sentences: ["The van is very big, but the boat is bigger.", "Vote for the best boat."],
    },
    {
      slug: "light-or-right",
      level: "A2",
      title: "light or right? /l/ and /r/",
      sounds: [
        { symbol: "/l/", name: "l in light", howTo: "Touch the tip of your tongue to the area behind your top teeth." },
        {
          symbol: "/r/",
          name: "r in right",
          howTo: "Curl your tongue back a little. It doesn't touch the top of your mouth.",
        },
      ],
      tip: "In British English, r at the end of a word (car, door) is usually not pronounced.",
      pairs: [
        ["light", "right"],
        ["long", "wrong"],
        ["play", "pray"],
        ["glass", "grass"],
        ["collect", "correct"],
      ],
      sentences: ["Turn right at the light.", "Is this the long road or the wrong road?"],
    },
  ],
  stress: [
    {
      slug: "two-syllable-stress",
      level: "A1",
      title: "Word stress: two-syllable words",
      explanation:
        "In words with two syllables, one syllable is stronger: longer, louder and clearer. Many nouns stress the first syllable (TAble), but not all (hoTEL).",
      items: [
        { word: "table", syllables: ["ta", "ble"], stressed: 0 },
        { word: "hotel", syllables: ["ho", "tel"], stressed: 1 },
        { word: "doctor", syllables: ["doc", "tor"], stressed: 0 },
        { word: "begin", syllables: ["be", "gin"], stressed: 1 },
        { word: "morning", syllables: ["mor", "ning"], stressed: 0 },
        { word: "about", syllables: ["a", "bout"], stressed: 1 },
        { word: "kitchen", syllables: ["kit", "chen"], stressed: 0 },
        { word: "police", syllables: ["po", "lice"], stressed: 1 },
      ],
    },
    {
      slug: "three-syllable-stress",
      level: "A2",
      title: "Word stress: three-syllable words",
      explanation:
        "Longer words have one main stressed syllable. The other syllables are often weak and short — for example, the first and last syllables of baNAna.",
      items: [
        { word: "banana", syllables: ["ba", "na", "na"], stressed: 1 },
        { word: "family", syllables: ["fam", "i", "ly"], stressed: 0 },
        { word: "computer", syllables: ["com", "pu", "ter"], stressed: 1 },
        { word: "hospital", syllables: ["hos", "pi", "tal"], stressed: 0 },
        { word: "tomorrow", syllables: ["to", "mor", "row"], stressed: 1 },
        { word: "holiday", syllables: ["hol", "i", "day"], stressed: 0 },
        { word: "important", syllables: ["im", "por", "tant"], stressed: 1 },
        { word: "restaurant", syllables: ["res", "tau", "rant"], stressed: 0 },
      ],
    },
  ],
  intonation: [
    {
      slug: "question-intonation",
      level: "A1",
      title: "Intonation in questions",
      explanation:
        "Yes/no questions (Are you…? Do you…?) usually go up at the end. Questions with a question word (What, Where, How…) usually go down at the end. This is a tendency, not a fixed rule — your voice can also show surprise or interest.",
      items: [
        {
          sentence: "Are you a student?",
          pattern: "rise",
          why: "A yes/no question: the voice usually goes up at the end.",
        },
        { sentence: "Where do you live?", pattern: "fall", why: "A question with Where: the voice usually goes down." },
        { sentence: "Is this your bag?", pattern: "rise", why: "A yes/no question starting with Is." },
        { sentence: "What time is it?", pattern: "fall", why: "A question with What: the voice usually goes down." },
        { sentence: "Do you like coffee?", pattern: "rise", why: "A yes/no question starting with Do." },
        { sentence: "How are you?", pattern: "fall", why: "A question with How: the voice usually goes down." },
        { sentence: "Can you help me?", pattern: "rise", why: "A yes/no question starting with Can." },
        { sentence: "Why are you late?", pattern: "fall", why: "A question with Why: the voice usually goes down." },
      ],
    },
  ],
};
