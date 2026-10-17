import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { exportLearnerData } from "@/server/db/export";
import { completeOnboarding } from "@/server/db/learner-profile";

const testUsers = { email: { endsWith: "@export.example.test" } };

async function createLearner(name: string) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name, email: `${randomUUID()}@export.example.test`, emailVerified: true },
  });
  await completeOnboarding(user.id, {
    displayName: name,
    goals: ["travel"],
    nativeLanguage: "pt",
    selfReportedLevel: "A1",
    dailyMinutes: 20,
    explanationStyle: "concise",
    timezone: "Europe/Lisbon",
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: `hash-of-${name}-password`,
    },
  });
  await prisma.session.create({
    data: { id: randomUUID(), token: `token-of-${name}`, userId: user.id, expiresAt: new Date(Date.now() + 3600e3) },
  });
  await prisma.note.create({ data: { userId: user.id, kind: "grammar_note", body: `${name}'s note` } });
  await prisma.writingDraft.create({
    data: { userId: user.id, kind: "journal", text: `${name}'s diary entry`, wordCount: 3 },
  });
  await prisma.tutorConversation.create({
    data: {
      userId: user.id,
      mode: "explain",
      title: "Present simple",
      messages: { create: [{ role: "user", content: `${name}'s question` }] },
    },
  });
  return user;
}

let ana: { id: string; email: string };
let ben: { id: string };

beforeAll(async () => {
  ana = await createLearner("Ana");
  ben = await createLearner("Ben");
  const exercise = await prisma.exercise.findFirstOrThrow({ where: { source: "seed" } });
  await prisma.exerciseAttempt.create({
    data: {
      userId: ana.id,
      exerciseId: exercise.id,
      context: "lesson",
      response: { value: "am" },
      isCorrect: true,
      score: 1,
      independent: true,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.$disconnect();
});

describe("data export", () => {
  it("contains the learner's own records, with curriculum referenced by slug", async () => {
    const data = await exportLearnerData(ana.id);
    expect(data).toMatchObject({ format: "englishflow-learner-export", version: 1 });
    expect(data.account).toMatchObject({ name: "Ana", email: ana.email, signInMethods: ["credential"] });
    expect(data.profile).toMatchObject({ displayName: "Ana", nativeLanguage: "pt", timezone: "Europe/Lisbon" });
    expect(data.preferences).toMatchObject({ dailyMinutes: 20 });
    expect(data.notes.map((n) => n.body)).toEqual(["Ana's note"]);
    expect(data.writingDrafts.map((d) => d.text)).toEqual(["Ana's diary entry"]);
    expect(data.tutorConversations[0].messages.map((m) => m.content)).toEqual(["Ana's question"]);
    expect(data.attempts).toHaveLength(1);
    expect(data.attempts[0].exercise.slug).toMatch(/^[a-z0-9-]+$/);
    expect(data.attempts[0]).not.toHaveProperty("exerciseId");
  });

  it("never includes another learner's data", async () => {
    const json = JSON.stringify(await exportLearnerData(ana.id));
    expect(json).not.toContain("Ben");
    expect(json).not.toContain(ben.id);
  });

  it("leaves out sign-in secrets and internal owner ids", async () => {
    const json = JSON.stringify(await exportLearnerData(ana.id));
    expect(json).not.toContain("hash-of-Ana-password");
    expect(json).not.toContain("token-of-Ana");
    expect(json).not.toContain('"userId"');
    expect(json).not.toContain(ana.id);
  });

  it("is empty but well-formed for a brand-new account", async () => {
    const user = await prisma.user.create({
      data: { id: randomUUID(), name: "New", email: `${randomUUID()}@export.example.test`, emailVerified: false },
    });
    const data = await exportLearnerData(user.id);
    expect(data.profile).toBeNull();
    expect(data.attempts).toEqual([]);
    expect(data.tutorConversations).toEqual([]);
  });
});
