import { planned } from "../../kit";
import { defineLevel } from "../../schemas";
import { lessonAAn, lessonBe, lessonBeNegatives, lessonPlurals } from "./unit-1";
import { lessonDoDoes, lessonPrepositions, lessonPresentSimple, lessonThereIs } from "./unit-2";

export const a1 = defineLevel({
  code: "A1",
  title: "Beginner",
  description:
    "Understand and use familiar everyday expressions and very basic phrases. Introduce yourself and others and ask simple questions.",
  concepts: [
    {
      slug: "subject-pronouns",
      name: "Subject pronouns",
      description: "I, you, he, she, it, we, they as sentence subjects.",
      skill: "grammar",
    },
    {
      slug: "be-present-positive",
      name: "Be: am, is, are",
      description: "Present forms of be with each subject, including short forms.",
      skill: "grammar",
      prerequisites: ["subject-pronouns"],
    },
    {
      slug: "be-negatives-questions",
      name: "Be: negatives, questions and short answers",
      description: "Not after be, be before the subject in questions, and short answers.",
      skill: "grammar",
      prerequisites: ["be-present-positive"],
    },
    {
      slug: "articles-a-an",
      name: "A and an",
      description: "Using a/an with singular nouns, chosen by the first sound.",
      skill: "grammar",
    },
    {
      slug: "plural-nouns",
      name: "Plural nouns",
      description: "Regular plural spelling and common irregular plurals.",
      skill: "grammar",
      prerequisites: ["articles-a-an"],
    },
    {
      slug: "present-simple-third-person",
      name: "Present simple: positive",
      description: "Present simple for routines and facts; -s after he, she and it.",
      skill: "grammar",
      prerequisites: ["subject-pronouns"],
    },
    {
      slug: "present-simple-do-does",
      name: "Present simple: do and does",
      description: "Negatives and questions with do/does, don't/doesn't.",
      skill: "grammar",
      prerequisites: ["present-simple-third-person", "be-negatives-questions"],
    },
    {
      slug: "there-is-there-are",
      name: "There is / there are",
      description: "Saying what exists in a place, with any in negatives and questions.",
      skill: "grammar",
      prerequisites: ["be-negatives-questions", "plural-nouns"],
    },
    {
      slug: "prepositions-of-place",
      name: "Prepositions of place",
      description: "In, on, under, next to, between, in front of, behind.",
      skill: "grammar",
      prerequisites: ["be-present-positive"],
    },
    {
      slug: "possessive-adjectives",
      name: "Possessive adjectives",
      description: "My, your, his, her, its, our, their.",
      skill: "grammar",
      prerequisites: ["subject-pronouns"],
    },
    {
      slug: "can-ability",
      name: "Can for ability",
      description: "Can and can't + base verb.",
      skill: "grammar",
      prerequisites: ["subject-pronouns"],
    },
    {
      slug: "present-continuous",
      name: "Present continuous",
      description: "Am/is/are + -ing for actions happening now.",
      skill: "grammar",
      prerequisites: ["be-negatives-questions", "present-simple-do-does"],
    },
    {
      slug: "past-of-be",
      name: "Past of be: was and were",
      description: "Was/were in positive, negative and question forms.",
      skill: "grammar",
      prerequisites: ["be-negatives-questions"],
    },
  ],
  modules: [
    {
      slug: "a1-getting-started",
      title: "Getting started",
      description: "The building blocks for talking about people, things, routines and places.",
      units: [
        {
          slug: "a1-people-and-things",
          title: "People and things",
          lessons: [lessonBe, lessonBeNegatives, lessonAAn, lessonPlurals],
        },
        {
          slug: "a1-daily-life-and-places",
          title: "Daily life and places",
          lessons: [lessonPresentSimple, lessonDoDoes, lessonThereIs, lessonPrepositions],
        },
        {
          slug: "a1-everyday-communication",
          title: "Everyday communication",
          lessons: [
            planned(
              "a1-possessive-adjectives",
              "My, your, his, her: possessive adjectives",
              "Say who things belong to.",
              ["possessive-adjectives"],
            ),
            planned("a1-can-ability", "I can swim: can for ability", "Talk about what you can and can't do.", [
              "can-ability",
            ]),
            planned(
              "a1-present-continuous",
              "What are you doing? The present continuous",
              "Describe actions happening now.",
              ["present-continuous"],
            ),
            planned("a1-was-were", "Was and were: the past of be", "Talk about where people and things were.", [
              "past-of-be",
            ]),
          ],
        },
      ],
    },
  ],
});
