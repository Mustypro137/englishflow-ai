import { expect, type Locator, type Page, test } from "@playwright/test";
import { serveFixtureAudio, withoutDeviceSpeech } from "./audio-fixture";
import { completeOnboarding, signUp } from "./helpers";
import { LAB_URL } from "./servers";

async function newLearner(page: Page) {
  await signUp(page);
  await completeOnboarding(page);
}

/** Choose an option (by its text) in an exercise card and check it. */
async function answerChoice(card: Locator, option: string) {
  await card.getByRole("radio", { name: option, exact: true }).check();
  await card.getByRole("button", { name: "Check" }).click();
  await expect(
    card
      .locator("[aria-live=polite]")
      .getByText(/Correct|Not quite/)
      .first(),
  ).toBeVisible();
}

async function answerText(card: Locator, text: string) {
  await card.getByRole("textbox").fill(text);
  await card.getByRole("button", { name: "Check" }).click();
  await expect(
    card
      .locator("[aria-live=polite]")
      .getByText(/Correct|Not quite/)
      .first(),
  ).toBeVisible();
}

test.describe("with audio files and a mock AI provider", () => {
  test.use({ baseURL: LAB_URL });

  test("listening: listen first, answer, then check the transcript and do a dictation", async ({ page }) => {
    test.setTimeout(180_000);
    const requested = await serveFixtureAudio(page);
    await newLearner(page);
    await page.goto("/app/listening/a1-at-the-cafe");
    await expect(page.getByRole("heading", { level: 1, name: "At the café" })).toBeVisible();
    await expect(page.getByText("Audio: a computer-generated voice, recorded for this activity.")).toBeVisible();
    // The transcript stays hidden until after the questions.
    await expect(page.getByText("Good morning. What can I get you?")).toHaveCount(0);

    await page.getByRole("button", { name: "Play the recording" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(page.getByText("Played once")).toBeVisible();
    // Every line is a real file that has to load and finish playing.
    await expect(page.getByRole("button", { name: "Play again" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/couldn't be played/)).toHaveCount(0);
    expect(new Set(requested).size).toBe(10);

    await page.getByRole("button", { name: "Answer the questions" }).click();
    const questions = page.getByRole("region", { name: "2. Questions" }).locator("article");
    await expect(questions).toHaveCount(4);
    await answerChoice(questions.nth(0), "A large coffee with milk");
    await answerChoice(questions.nth(1), "A cheese sandwich");
    await answerChoice(questions.nth(2), "In the café");
    await answerText(questions.nth(3), "£6.50");

    await page.getByRole("button", { name: "Check the transcript" }).click();
    const review = page.getByRole("region", { name: "3. Transcript and useful phrases" });
    await expect(review.getByRole("list", { name: "Transcript" })).toContainText("Good morning. What can I get you?");
    await expect(review.getByText("Here you are").first()).toBeVisible();
    await expect(review.getByRole("button", { name: "Play line" }).first()).toBeVisible();

    await review.getByRole("button", { name: "Play sentence" }).first().click();
    await review.getByLabel("What you hear").first().fill("hi can I have a coffee please");
    await review.getByRole("button", { name: "Check", exact: true }).first().click();
    await expect(review.getByText("Exactly right.")).toBeVisible();
    await review.getByLabel("What you hear").nth(1).fill("Yes a cheese sandwich");
    await review.getByRole("button", { name: "Check", exact: true }).nth(1).click();
    await expect(review.getByText("4 of 5 words right.")).toBeVisible();
    await expect(review.getByText("missing:")).toHaveCount(1);

    await review.getByRole("button", { name: "Finish and save" }).click();
    await expect(review.getByText(/4 of 4 questions right first time · dictation 90% of words right/)).toBeVisible();
    await page.getByRole("link", { name: "All listening" }).click();
    await expect(page.getByText(/Done · last time 4 of 4 right first time/)).toBeVisible();
  });

  test("writing: draft, three-layer feedback from the (mock) AI, then a rewrite", async ({ page }) => {
    await newLearner(page);
    await page.goto("/app/writing");
    await page.getByRole("link", { name: /Introduce yourself/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Introduce yourself" })).toBeVisible();
    const text = "Hello everyone! My name is Ana and I'm from Spain. I has a brother and my freind is a nurse.";
    await page.getByRole("textbox", { name: "Your writing" }).fill(text);
    await expect(page.getByText(/20 words \(task: 25–80\) · Aim for at least 25 words\./)).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/app\/writing\/[a-z0-9]+$/);
    await expect(page.getByTestId("draft-text")).toHaveText(text);
    await expect(page.getByText("First draft", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Get feedback" }).click();
    const feedback = page.getByTestId("writing-feedback");
    await expect(feedback.getByText("Test provider: found 2 errors to fix.")).toBeVisible();
    await expect(feedback.getByText("I has", { exact: true })).toBeVisible();
    await expect(feedback.getByText("I have", { exact: true })).toBeVisible();
    await expect(feedback.getByText("freind", { exact: true })).toBeVisible();
    await expect(feedback.getByText("You didn't ask for style suggestions.")).toBeVisible();
    await feedback.getByRole("button", { name: "Show the corrected version" }).click();
    await expect(feedback.getByText(/I have a brother and my friend is a nurse/)).toBeVisible();
    await feedback.getByRole("button", { name: "Add style suggestions" }).click();
    await expect(feedback.getByText("Test style note.")).toBeVisible();

    await page.getByRole("button", { name: "Show a model answer" }).click();
    await expect(page.getByText(/My name is Ana and I'm from Valencia/)).toBeVisible();

    await page
      .getByRole("textbox", { name: "Your rewrite" })
      .fill(text.replace("I has", "I have").replace("freind", "friend"));
    await page.getByRole("button", { name: "Save rewrite" }).click();
    await expect(page.getByText("Version 2")).toBeVisible();
    const changes = page.getByRole("region", { name: "Changes since your previous version" });
    await expect(changes.getByText("before:").first()).toBeAttached();
    await page.getByRole("button", { name: "Get feedback" }).click();
    await expect(page.getByTestId("writing-feedback").getByText("Test provider: no errors found.")).toBeVisible();
  });

  test("conversation: a role-play with the (mock) AI playing the other person", async ({ page }) => {
    await newLearner(page);
    await page.goto("/app/conversation/a1-ordering-at-a-cafe");
    await expect(page.getByRole("heading", { level: 1, name: "Ordering at a café" })).toBeVisible();
    const chat = page.getByRole("list", { name: "Conversation" });
    await expect(chat).toContainText("Good morning! What can I get you?");
    await page.getByLabel("Your message").fill("Hi. Can I have a tea, please?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(chat).toContainText("(Test provider, playing the person working at the café counter, called Sam)");
    await expect(page).toHaveURL(/\/app\/tutor\/[a-z0-9]+$/);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Role-play: Ordering at a café" })).toBeVisible();
    await expect(page.getByText(/Role-play with Sam/)).toBeVisible();
  });
});

test.describe("without AI or audio", () => {
  test.beforeEach(async ({ page }) => {
    await withoutDeviceSpeech(page);
    await newLearner(page);
  });

  test("listening falls back to the transcript and says so", async ({ page }) => {
    await page.goto("/app/listening");
    await expect(page.getByText("Your device can't play the audio here")).toBeVisible();
    await page.getByRole("link", { name: /At the café/ }).click();
    await expect(
      page.getByText("Audio isn't available on this device, so the text version is shown instead."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Play/ })).toHaveCount(0);
    await expect(page.getByText("Good morning. What can I get you?")).toBeVisible();
    await page.getByRole("button", { name: "Answer the questions" }).click();
    const questions = page.getByRole("region", { name: "2. Questions" }).locator("article");
    await answerChoice(questions.nth(0), "A large coffee with milk");
    await answerChoice(questions.nth(1), "A cheese sandwich");
    await answerChoice(questions.nth(2), "In the café");
    await answerText(questions.nth(3), "six pounds fifty");
    await page.getByRole("button", { name: "Check the transcript" }).click();
    await expect(page.getByText("4. Dictation")).toHaveCount(0); // dictation needs audio
    await page.getByRole("button", { name: "Finish and save" }).click();
    await expect(page.getByText(/4 of 4 questions right first time\./)).toBeVisible();
  });

  test("reading: save words with their sentence and answer the questions", async ({ page }) => {
    await page.goto("/app/reading");
    await page.getByRole("link", { name: /Lena and her family/ }).click();
    await page.getByRole("article").getByRole("link", { name: "cousin" }).click();
    await expect(page).toHaveURL(/#word-cousin$/);
    await page.getByRole("button", { name: "Save “cousin” with its sentence" }).click();
    await expect(page.getByText("Saved to your words")).toBeVisible();
    await page.getByRole("button", { name: "Save “friendly” with its sentence" }).click();
    await expect(page.getByText("Saved as a flashcard")).toBeVisible();

    const questions = page.getByRole("region", { name: "Questions" }).locator("article");
    await answerChoice(questions.nth(0), "Her cousin");
    await answerText(questions.nth(1), "They are teachers");
    await answerChoice(questions.nth(2), "She works in the restaurant then");
    await answerChoice(questions.nth(3), "kind and nice to people");
    await page.getByRole("button", { name: "Finish and save" }).click();
    await expect(page.getByText("4 of 4 right first time.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "“cousin” is saved" })).toBeDisabled();
    await page.goto("/app/vocabulary");
    await expect(page.getByText("From “Lena and her family”:")).toBeVisible();
    await expect(page.getByText("I live in a small flat in Lisbon with my cousin, Inês.").first()).toBeVisible();
    await page.goto("/app/notebook");
    await expect(page.getByText("From “Lena and her family”: He is very friendly.")).toBeVisible();
  });

  test("writing works without AI: honest notice, self-check, model answer, journal and rewrite", async ({ page }) => {
    await page.goto("/app/writing");
    await expect(page.getByText("AI writing feedback isn't set up on this site yet")).toBeVisible();
    await page.getByRole("link", { name: "Open your journal" }).click();
    await page.getByLabel("Title (optional)").fill("My Saturday");
    await page.getByRole("textbox", { name: "Entry" }).fill("Today I go to the market with my sister.");
    await page.getByRole("button", { name: "Save entry" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "My Saturday" })).toBeVisible();
    await expect(
      page.getByText("AI writing feedback isn't set up on this site yet").filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Get feedback" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Change something to save a rewrite" })).toBeDisabled();
    await page.getByRole("textbox", { name: "Your rewrite" }).fill("Today I went to the market with my sister.");
    await page.getByRole("button", { name: "Save rewrite" }).click();
    await expect(page.getByText("Version 2")).toBeVisible();
    await page.goto("/app/writing/journal");
    await expect(page.getByRole("link", { name: /My Saturday/ })).toBeVisible();
  });

  test("every speaking task has a text alternative, and nothing offers audio it can't play", async ({ page }) => {
    for (const slug of [
      "short-i-long-ee",
      "cat-or-cut",
      "think-or-sink",
      "very-or-berry",
      "light-or-right",
      "two-syllable-stress",
      "three-syllable-stress",
      "question-intonation",
    ]) {
      await page.goto(`/app/pronunciation/${slug}`);
      await expect(page.locator("main h1")).toBeVisible();
      const tasks = page.locator("[data-speaking-task]");
      const count = await tasks.count();
      expect(count, slug).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(tasks.nth(i).locator("[data-text-alternative]"), `${slug} task ${i + 1}`).toBeVisible();
      }
      await expect(page.getByRole("button", { name: /Listen/ }), slug).toHaveCount(0);
    }

    // The text alternative works on its own.
    await page.goto("/app/pronunciation/short-i-long-ee");
    const alt = page.locator("[data-speaking-task]").first().locator("[data-text-alternative]");
    await alt.getByRole("radio", { name: "seat" }).check();
    await alt.getByRole("button", { name: "Check" }).click();
    await expect(alt.getByText("Correct")).toBeVisible();
    // So does the no-audio sound-and-spelling quiz.
    await expect(page.getByRole("heading", { name: "Which word do you hear?" })).toHaveCount(0);
    await page
      .getByRole("region", { name: "Sound and spelling (no audio needed)" })
      .getByRole("button", { name: "Start" })
      .click();
    await expect(page.getByText("Question 1 of 7")).toBeVisible();
  });

  test("conversation without AI: setup notice and the example conversation to practise with", async ({ page }) => {
    await page.goto("/app/conversation");
    await expect(page.getByText("AI role-play isn't set up on this site yet")).toBeVisible();
    await page.getByRole("link", { name: /Ordering at a café/ }).click();
    await expect(page.getByRole("textbox", { name: "Your message" })).toHaveCount(0);
    const example = page.getByRole("region", { name: "Example conversation" });
    await expect(example).toContainText("Hi. Can I have a tea, please?");
    await example.getByRole("button", { name: "Cover my lines" }).click();
    await expect(example.getByText("Hi. Can I have a tea, please?")).toHaveCount(0);
    await example.getByRole("button", { name: "Reveal your line 1" }).click();
    await expect(example.getByText("Hi. Can I have a tea, please?")).toBeVisible();
  });

  test("sentence studio: expand a sentence step by step and write your own", async ({ page }) => {
    await page.goto("/app/sentences");
    await expect(page.getByText(/Start a lesson first/)).toBeVisible();
    const expand = page.getByRole("region", { name: "2. Expand a sentence" });
    await expand.getByLabel("Your longer sentence").fill("I drink tea every morning.");
    await expand.getByRole("button", { name: "Check" }).click();
    await expect(expand.getByText(/Missing: coffee\./)).toBeVisible();
    await expand.getByLabel("Your longer sentence").fill("I drink coffee every morning.");
    await expand.getByRole("button", { name: "Check" }).click();
    await expect(expand.getByText("It keeps your sentence and adds 2 words.")).toBeVisible();
    await expand.getByRole("button", { name: "Next step" }).click();
    await expect(expand.getByText("Step 2 of 3")).toBeVisible();

    const own = page.getByRole("region", { name: "3. Your own sentences" });
    const form = own.locator("form").filter({ hasText: "there is / there are" });
    await form.getByRole("textbox").fill("My street is very quiet.");
    await form.getByRole("button", { name: "Save and get feedback" }).click();
    await expect(form.getByText(/Use the pattern/)).toBeVisible();
    await form.getByRole("textbox").fill("There is a small park near my flat.");
    await form.getByRole("button", { name: "Save and get feedback" }).click();
    await expect(page).toHaveURL(/\/app\/writing\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { level: 1, name: "there is / there are" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Sentence studio" }),
    ).toBeVisible();
  });
});
