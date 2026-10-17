/**
 * Reading library: short graded texts with comprehension, inference and
 * vocabulary-in-context questions. Glossary words can be saved with their sentence.
 * Written with AI assistance — pending review by an English teacher.
 */
import type { z } from "zod";
import { questionKit } from "./kit";
import type { readingTextSchema } from "./schemas";

type ReadingInput = z.input<typeof readingTextSchema>;
const define = (texts: ReadingInput[]) => texts;

const family = questionKit("read-a1-family", "reading");
const email = questionKit("read-a1-email", "reading");
const nurse = questionKit("read-a1-nurse", "reading");
const street = questionKit("read-a1-street", "reading");
const pool = questionKit("read-a1-pool", "reading");
const messages = questionKit("read-a1-messages", "reading");
const hotel = questionKit("read-a2-hotel-review", "reading", 2);
const phone = questionKit("read-a2-lost-phone", "reading", 2);

export const readingTexts = define([
  {
    slug: "a1-lena-and-her-family",
    level: "A1",
    title: "Lena and her family",
    genre: "story",
    summary: "Lena describes the people in her home.",
    estimatedMinutes: 5,
    paragraphs: [
      "Hi, I'm Lena. I'm twenty-four and I'm a student. I live in a small flat in Lisbon with my cousin, Inês.",
      "Inês is a chef. She works in a restaurant in the city centre, so she isn't at home in the evening. Our kitchen is very small, but she cooks amazing food at the weekend.",
      "My mother and father live in Porto. They are teachers. I visit them every month.",
      "Our neighbour, Mr Costa, is seventy. He is very friendly. He sometimes gives us fruit from his garden.",
    ],
    glossary: [
      { word: "cousin", definition: "The child of your aunt or uncle.", entry: "a1-cousin" },
      { word: "chef", definition: "A person whose job is cooking in a restaurant.", entry: "a1-chef" },
      { word: "kitchen", definition: "The room where you cook.", entry: "a1-kitchen" },
      { word: "neighbour", definition: "A person who lives near you.", entry: "a1-neighbour" },
      { word: "friendly", definition: "Kind and nice to other people." },
      { word: "garden", definition: "Land next to a house where people grow flowers, fruit or vegetables." },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: family.mc(
          "q1",
          "Who does Lena live with?",
          ["Her mother", "Her cousin", "Mr Costa"],
          1,
          "“I live in a small flat in Lisbon with my cousin, Inês.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: family.short(
          "q2",
          "What is the job of Lena's parents?",
          ["teachers", "teacher", "they are teachers", "they're teachers"],
          "“They are teachers.”",
        ),
      },
      {
        focus: "inference",
        exercise: family.mc(
          "q3",
          "Why isn't Inês at home in the evening?",
          ["She studies in the evening", "She works in the restaurant then", "She visits Porto"],
          1,
          "The text says she is a chef in a restaurant, “so she isn't at home in the evening”. Restaurants are busy in the evening.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: family.mc(
          "q4",
          "“He is very friendly.” Friendly means…",
          ["kind and nice to people", "very old", "quiet and shy"],
          0,
          "The next sentence helps: he gives them fruit from his garden — a kind thing to do.",
        ),
      },
    ],
  },
  {
    slug: "a1-an-email-from-a-new-student",
    level: "A1",
    title: "An email from a new student",
    genre: "email",
    summary: "Kenji writes to his new English class.",
    estimatedMinutes: 5,
    paragraphs: [
      "Hello everyone,",
      "My name is Kenji and I'm from Osaka, in Japan. I'm an engineer and I work for a car company. I'm in London for six months.",
      "I study English every day. I usually study in the morning, before work, at a café near my flat. In the evening I'm often tired, so I watch films in English.",
      "At the weekend I like walking in the park. Do you know a good park in London? Please write and tell me!",
      "See you in class on Tuesday,",
      "Kenji",
    ],
    glossary: [
      {
        word: "engineer",
        definition: "A person who designs or builds machines, roads or buildings.",
        entry: "a1-engineer",
      },
      { word: "every day", definition: "On all days.", entry: "a1-every-day" },
      { word: "usually", definition: "Most of the time.", entry: "a1-usually" },
      { word: "tired", definition: "Feeling that you need to rest or sleep." },
      { word: "weekend", definition: "Saturday and Sunday.", entry: "a1-weekend" },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: email.short(
          "q1",
          "How long is Kenji in London?",
          ["six months", "6 months", "for six months", "for 6 months"],
          "“I'm in London for six months.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: email.mc(
          "q2",
          "Where does Kenji usually study?",
          ["At home", "At work", "In a café"],
          2,
          "“I usually study in the morning, before work, at a café near my flat.”",
        ),
      },
      {
        focus: "inference",
        exercise: email.mc(
          "q3",
          "Why does Kenji ask about parks?",
          ["He wants to go walking at the weekend", "He works in a park", "He wants to meet the class there"],
          0,
          "He likes walking in the park at the weekend, and he is new in London, so he wants ideas.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: email.mc(
          "q4",
          "“In the evening I'm often tired.” Tired means…",
          ["happy and full of energy", "needing rest", "hungry"],
          1,
          "After work he is tired, so he relaxes and watches films instead of studying.",
        ),
      },
    ],
  },
  {
    slug: "a1-a-day-in-the-life-of-a-nurse",
    level: "A1",
    title: "A day in the life of a nurse",
    genre: "article",
    summary: "Grace works nights at a big hospital.",
    estimatedMinutes: 6,
    paragraphs: [
      "Grace is a nurse at a big hospital in Leeds. She works at night, from eight in the evening to eight in the morning.",
      "Grace gets up at five o'clock in the afternoon. She has breakfast when other people have dinner! Then she goes to work by bus.",
      "At the hospital, she checks on patients and gives them medicine. The night is usually quiet, but sometimes it is very busy.",
      "Grace finishes work at eight and goes home. She goes to bed at nine in the morning. “It's a hard job,” she says, “but I love it.”",
    ],
    glossary: [
      {
        word: "nurse",
        definition: "A person whose job is to care for people who are ill, usually in a hospital.",
        entry: "a1-nurse",
      },
      { word: "hospital", definition: "A place where ill or hurt people get treatment.", entry: "a1-hospital" },
      { word: "gets up", definition: "Leaves bed after sleeping (get up).", entry: "a1-get-up" },
      { word: "patients", definition: "People who get care from a doctor or nurse." },
      { word: "medicine", definition: "Something you take to get better when you're ill." },
      { word: "sometimes", definition: "On some occasions, but not always.", entry: "a1-sometimes" },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: nurse.mc(
          "q1",
          "When does Grace work?",
          ["In the day", "At night", "At the weekend only"],
          1,
          "“She works at night, from eight in the evening to eight in the morning.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: nurse.mc(
          "q2",
          "How does she go to work?",
          ["By car", "On foot", "By bus"],
          2,
          "“Then she goes to work by bus.”",
        ),
      },
      {
        focus: "inference",
        exercise: nurse.mc(
          "q3",
          "“She has breakfast when other people have dinner!” What does this tell us?",
          ["She eats her first meal in the evening", "She doesn't eat breakfast", "She has dinner at work"],
          0,
          "She gets up at five in the afternoon, so her first meal — her breakfast — is at dinner time for most people.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: nurse.mc(
          "q4",
          "“She checks on patients.” Patients are…",
          ["doctors", "people who are ill in the hospital", "visitors"],
          1,
          "A nurse gives patients medicine, so they are the people who are ill and need care.",
        ),
      },
    ],
  },
  {
    slug: "a1-our-street",
    level: "A1",
    title: "Our street",
    genre: "story",
    summary: "Omar describes the street where he lives.",
    estimatedMinutes: 5,
    paragraphs: [
      "I live in Green Street. It's a long street in the north of the town.",
      "There's a small supermarket on the corner, and there are two cafés next to it. Opposite the supermarket there's a pharmacy.",
      "There isn't a bank in our street, but there's a post office near the station.",
      "My favourite place is the park at the end of the street. There are big trees and a lake. I always go there on Sunday morning.",
    ],
    glossary: [
      {
        word: "supermarket",
        definition: "A big shop that sells food and things for the home.",
        entry: "a1-supermarket",
      },
      { word: "corner", definition: "The place where two streets meet." },
      { word: "pharmacy", definition: "A shop where you can buy medicine.", entry: "a1-pharmacy" },
      { word: "post office", definition: "A place where you send letters and parcels.", entry: "a1-post-office" },
      { word: "lake", definition: "A large area of water with land all around it." },
      { word: "always", definition: "Every time.", entry: "a1-always" },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: street.short(
          "q1",
          "How many cafés are there in Green Street?",
          ["two", "2", "two cafés", "2 cafés", "two cafes", "2 cafes"],
          "“there are two cafés next to it.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: street.mc(
          "q2",
          "What is opposite the supermarket?",
          ["A bank", "A pharmacy", "A post office"],
          1,
          "“Opposite the supermarket there's a pharmacy.”",
        ),
      },
      {
        focus: "inference",
        exercise: street.mc(
          "q3",
          "Omar needs to go to the bank. What must he do?",
          ["Walk to the end of Green Street", "Go to a different street", "Go to the post office"],
          1,
          "“There isn't a bank in our street,” so he needs to go somewhere else.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: street.mc(
          "q4",
          "“There's a small supermarket on the corner.” The corner is…",
          ["where two streets meet", "the middle of a park", "inside a shop"],
          0,
          "Shops are often “on the corner” — at the place where two streets meet.",
        ),
      },
    ],
  },
  {
    slug: "a1-swimming-pool-notice",
    level: "A1",
    title: "Notice: Riverside Swimming Pool",
    genre: "notice",
    summary: "Opening times and rules at a swimming pool.",
    estimatedMinutes: 4,
    paragraphs: [
      "Riverside Swimming Pool — opening times",
      "Monday to Friday: 7 am to 9 pm. Saturday and Sunday: 9 am to 6 pm.",
      "The pool is closed on the first Monday of every month for cleaning.",
      "Children under eight must swim with an adult. Please bring a towel. Lockers are free.",
      "No food or drink near the pool, please.",
    ],
    glossary: [
      { word: "closed", definition: "Not open." },
      { word: "adult", definition: "A person who is grown up, not a child." },
      { word: "towel", definition: "A piece of cloth for drying your body." },
      { word: "lockers", definition: "Small cupboards with a key where you can leave your things." },
      { word: "free", definition: "You don't pay for it." },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: pool.mc(
          "q1",
          "What time does the pool open on Saturday?",
          ["7 am", "9 am", "6 pm"],
          1,
          "“Saturday and Sunday: 9 am to 6 pm.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: pool.mc(
          "q2",
          "When is the pool closed?",
          ["Every Monday", "On the first Monday of the month", "On Sundays"],
          1,
          "“The pool is closed on the first Monday of every month for cleaning.”",
        ),
      },
      {
        focus: "inference",
        exercise: pool.mc(
          "q3",
          "Sofia is six. Can she swim alone?",
          ["Yes, she can", "No — an adult must swim with her", "Only on Saturdays"],
          1,
          "Children under eight must swim with an adult, and six is under eight.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: pool.mc(
          "q4",
          "“Lockers are free.” Here, free means…",
          ["you don't pay", "not busy", "open"],
          0,
          "In notices and shops, free usually means it costs nothing.",
        ),
      },
    ],
  },
  {
    slug: "a1-messages-between-friends",
    level: "A1",
    title: "Messages between friends",
    genre: "message",
    summary: "Mia and Jo make a plan for the evening.",
    estimatedMinutes: 4,
    paragraphs: [
      "Mia: Hi Jo! Are you busy this evening?",
      "Jo: Hi! I'm at work now, but I finish at six. Why?",
      "Mia: There's a new film at the cinema. Do you want to come? It starts at eight.",
      "Jo: Yes, great idea! Let's meet at the café opposite the cinema at seven and have something to eat first.",
      "Mia: Perfect. See you at seven! Oh — can you bring my book? It's at your flat.",
      "Jo: No problem. See you later!",
    ],
    glossary: [
      { word: "busy", definition: "Having a lot to do; not free." },
      { word: "café", definition: "A small place where you can buy drinks and simple food.", entry: "a1-cafe" },
      { word: "evening", definition: "The part of the day between the afternoon and the night.", entry: "a1-evening" },
      { word: "opposite", definition: "On the other side of the street, facing something." },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: messages.mc(
          "q1",
          "What time does the film start?",
          ["Six o'clock", "Seven o'clock", "Eight o'clock"],
          2,
          "“It starts at eight.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: messages.mc(
          "q2",
          "Where do they meet?",
          ["At Jo's flat", "At a café", "At Jo's work"],
          1,
          "“Let's meet at the café opposite the cinema at seven.”",
        ),
      },
      {
        focus: "inference",
        exercise: messages.mc(
          "q3",
          "Why do they meet at seven, not at eight?",
          ["To eat before the film", "Because Jo finishes work at seven", "Because the café closes at eight"],
          0,
          "Jo says “have something to eat first” — first means before the film.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: messages.mc(
          "q4",
          "“Are you busy this evening?” Mia wants to know if Jo…",
          ["is free to do something", "is tired", "is at the cinema"],
          0,
          "Busy means you have a lot to do. Mia asks because she wants to invite Jo.",
        ),
      },
    ],
  },
  {
    slug: "a2-review-of-a-small-hotel",
    level: "A2",
    title: "Review: The Harbour Guesthouse",
    genre: "review",
    summary: "A guest writes about a weekend at a small hotel by the sea.",
    estimatedMinutes: 6,
    paragraphs: [
      "★★★★☆ Lovely place, but book a room at the back.",
      "We stayed at the Harbour Guesthouse for two nights in June. The owners, Pat and Simon, were very welcoming, and the breakfast was excellent — fresh bread, local eggs and the best coffee in town.",
      "Our room had a beautiful view of the harbour, but it was quite noisy. Fishing boats leave at five in the morning, and the bars on the street stay open late. We didn't sleep very well.",
      "The guesthouse is in a great location: the beach is only two minutes away and there are lots of restaurants nearby. Parking is difficult, though, so come by train if you can.",
      "We'd definitely stay here again — but next time we'll ask for a quieter room.",
    ],
    glossary: [
      { word: "welcoming", definition: "Friendly to people who arrive, making them feel happy to be there." },
      { word: "view", definition: "What you can see from a place." },
      { word: "harbour", definition: "An area of water near land where boats stay safely." },
      { word: "noisy", definition: "With a lot of loud sounds." },
      { word: "nearby", definition: "Not far away." },
      { word: "definitely", definition: "Certainly; without any doubt." },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: hotel.mc(
          "q1",
          "What did the writer like most about breakfast?",
          ["It was cheap", "The food was fresh and good", "It was served late"],
          1,
          "“the breakfast was excellent — fresh bread, local eggs and the best coffee in town.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: hotel.mc(
          "q2",
          "Why didn't they sleep well?",
          ["The bed was uncomfortable", "The room was cold", "There was noise from boats and bars"],
          2,
          "“Fishing boats leave at five in the morning, and the bars on the street stay open late.”",
        ),
      },
      {
        focus: "inference",
        exercise: hotel.mc(
          "q3",
          "Why does the writer say “book a room at the back”?",
          [
            "Rooms at the back are probably quieter",
            "Rooms at the back have a better view",
            "Rooms at the back are cheaper",
          ],
          0,
          "Their front room had the harbour view but was noisy, so a room at the back is likely to be quieter. The writer wants a quieter room next time.",
        ),
      },
      {
        focus: "inference",
        exercise: hotel.mc(
          "q4",
          "Why does the writer suggest coming by train?",
          ["The train is very cheap", "It is hard to park a car there", "The station is next to the hotel"],
          1,
          "“Parking is difficult, though, so come by train if you can.”",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: hotel.mc(
          "q5",
          "“The owners were very welcoming.” This means they…",
          ["were friendly when the guests arrived", "were often away", "spoke many languages"],
          0,
          "Welcoming describes people who make visitors feel happy and comfortable.",
        ),
      },
    ],
  },
  {
    slug: "a2-the-lost-phone",
    level: "A2",
    title: "The lost phone",
    genre: "story",
    summary: "Daniel loses his phone on the way to an important meeting.",
    estimatedMinutes: 6,
    paragraphs: [
      "Last Tuesday, Daniel had an important job interview at ten o'clock. He left home early and took the bus into the city.",
      "When he got off the bus, he put his hand in his pocket. His phone wasn't there! The address of the company was on his phone, and he didn't know the way.",
      "Daniel asked a woman at a newsagent's for help. She looked at the name of the company on his letter and drew a small map for him. He arrived at the interview just in time.",
      "After the interview, Daniel called his phone from a friend's office. The bus driver answered. “I found it under a seat,” she said. “You can collect it at the bus station.”",
      "Daniel got the job — and his phone back on the same day.",
    ],
    glossary: [
      { word: "interview", definition: "A meeting where someone asks you questions to decide if you can have a job." },
      { word: "pocket", definition: "A small bag sewn into clothes, for carrying things." },
      { word: "newsagent's", definition: "A small shop that sells newspapers, magazines and sweets." },
      { word: "just in time", definition: "At the last possible moment, but not late." },
      { word: "collect", definition: "Go to a place and take something that is waiting for you." },
    ],
    questions: [
      {
        focus: "comprehension",
        exercise: phone.mc(
          "q1",
          "Why did Daniel go into the city?",
          ["To buy a phone", "To have a job interview", "To meet a friend"],
          1,
          "“Daniel had an important job interview at ten o'clock.”",
        ),
      },
      {
        focus: "comprehension",
        exercise: phone.mc(
          "q2",
          "Who helped Daniel find the company?",
          ["The bus driver", "A woman at a shop", "His friend"],
          1,
          "“Daniel asked a woman at a newsagent's for help… and she drew a small map.”",
        ),
      },
      {
        focus: "inference",
        exercise: phone.mc(
          "q3",
          "Where did Daniel probably lose his phone?",
          ["On the bus", "In the newsagent's", "At home"],
          0,
          "The bus driver found it “under a seat”, so it fell out of his pocket on the bus.",
        ),
      },
      {
        focus: "vocabulary_in_context",
        exercise: phone.mc(
          "q4",
          "“He arrived at the interview just in time.” This means he was…",
          ["very early", "late", "not late, but almost"],
          2,
          "Just in time = at the last moment, but not late.",
        ),
      },
    ],
  },
]);
