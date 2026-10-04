import { expect, test, type Page } from "@playwright/test";

async function input(page: Page) {
  await page.evaluate(async () => {
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    let active: OscillatorNode[] = [];
    await context.resume();
    (
      window as unknown as { playPitches: (notes: number[]) => void }
    ).playPitches = (notes) => {
      active.forEach((node) => {
        node.stop();
        node.disconnect();
      });
      active = notes.map((midi) => {
        const source = context.createOscillator();
        const gain = context.createGain();
        source.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.value = 0.08;
        source.connect(gain).connect(destination);
        source.start();
        return source;
      });
    };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => destination.stream.clone(),
    });
  });
}
async function play(page: Page, notes: number[]) {
  await page.evaluate(
    (notes) =>
      (
        window as unknown as { playPitches: (notes: number[]) => void }
      ).playPitches(notes),
    notes,
  );
}
async function selectSong(page: Page, title = "About a Girl") {
  await page.getByLabel("Search title or artist").fill(title);
  await page.locator(".exercise").click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("song fingerstyle displays fingering and follows actual microphone notes", async ({
  page,
}) => {
  await input(page);
  await selectSong(page);
  await page
    .getByRole("button", { name: "Learn fingerstyle", exact: true })
    .click();
  await expect(page.locator("#note-exercise")).toHaveValue(
    "song-nirvana-about-a-girl",
  );
  await expect(page.locator(".note-cue.current strong")).toHaveText("E2");
  await expect(page.locator(".note-fingering")).toContainText("String 6");
  await expect(page.locator(".note-fingering")).toContainText("thumb");
  await expect(page.locator(".neck-note.is-suggested")).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Note sequence", exact: true })
      .getByRole("button"),
  ).toHaveCount(16);
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await play(page, [52]);
  await expect(page.locator(".note-cue.heard strong")).toHaveText("E3");
  await page.waitForTimeout(500);
  await expect(page.locator(".note-cue.current strong")).toHaveText("E2");
  await play(page, [40]);
  await expect(page.locator(".note-cue.current strong")).toHaveText("G3");
  await expect(page.locator(".note-fingering")).toContainText("String 3");
  await play(page, [55]);
  await expect(page.locator(".note-cue.current strong")).toHaveText("B3");
  await play(page, []);
  await page
    .getByRole("button", { name: "Restart note exercise", exact: true })
    .click();
  await expect(page.locator(".note-cue.current strong")).toHaveText("E2");
  await page
    .getByRole("button", { name: "Stop note listening", exact: true })
    .click();
});

test("switching songs refreshes the selected sequence and timeline is keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await selectSong(page);
  await page
    .getByRole("button", { name: "Learn fingerstyle", exact: true })
    .click();
  const sequence = page.getByRole("region", {
    name: "Note sequence",
    exact: true,
  });
  await sequence.getByRole("button").nth(3).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".note-cue.current strong")).toHaveText("E4");
  await expect(page.locator(".note-fingering")).toContainText("ring");
  await selectSong(page, "Wish You Were Here");
  await expect(page.locator("#note-exercise")).toHaveValue(
    "song-pink-floyd-wish-you-were-here",
  );
  await expect(page.locator(".note-cue.current strong")).toHaveText("C3");
  await expect(sequence.getByRole("button")).toHaveCount(32);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await page
    .locator("#notes")
    .screenshot({ path: "artifacts/fingerstyle-mobile.png" });
  await page
    .getByRole("button", { name: "E4, string 1, open string", exact: true })
    .click();
  await selectSong(page, "Fast Car");
  await expect(page.locator("#note-exercise")).toHaveValue("single");
  await expect(page.locator(".note-cue.current strong")).toHaveText("E4");
});

test("chord lesson waits for matching sound and completes the song loop", async ({
  page,
}) => {
  await input(page);
  await selectSong(page);
  await page
    .getByRole("button", { name: "Learn song chords", exact: true })
    .click();
  const current = page.locator(".chord-lesson-cue.current strong");
  await page
    .getByRole("button", { name: "Listen for chord changes", exact: true })
    .click();
  await play(page, [48, 52, 55]);
  await expect(page.locator(".chord-lesson-cue.heard strong")).toHaveText("C");
  await page.waitForTimeout(900);
  await expect(current).toHaveText("Em");
  await play(page, [40, 43, 47]);
  await expect(current).toHaveText("G");
  await play(page, [43, 47, 50]);
  await expect(current).toHaveText("Complete!");
  await play(page, []);
  await page
    .getByRole("button", { name: "Stop chord lesson", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart chord lesson", exact: true })
    .click();
  await expect(current).toHaveText("Em");
});

test("repeated chords need a release; stopping freezes learning", async ({
  page,
}) => {
  await input(page);
  await page.locator(".exercise").filter({ hasText: "Two Chord Step" }).click();
  await page
    .getByRole("button", { name: "Listen for chord changes", exact: true })
    .click();
  await play(page, [40, 43, 47]);
  const count = page.locator(".chord-lesson-cue.current small");
  await expect(count).toHaveText("Chord 2 of 4");
  await page.waitForTimeout(1000);
  await expect(count).toHaveText("Chord 2 of 4");
  await play(page, []);
  await expect(page.locator(".chord-lesson-cue.heard strong")).toHaveText("—");
  // An unclear transition is not measured silence. Allow the full analyser
  // window to clear and two quiet detector updates to release the gate.
  await page.waitForTimeout(1000);
  await play(page, [40, 43, 47]);
  await expect(page.locator(".chord-lesson-cue.current strong")).toHaveText(
    "A",
  );
  await page
    .getByRole("button", { name: "Stop chord lesson", exact: true })
    .click();
  await play(page, [45, 49, 52]);
  await page.waitForTimeout(900);
  await expect(page.locator(".chord-lesson-cue.current strong")).toHaveText(
    "A",
  );
  await expect(page.locator(".chord-lesson-cue.heard strong")).toHaveText("—");
});

test("chord microphone denial is scoped and switching to notes stops chord matching", async ({
  page,
}) => {
  await page.evaluate(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError")),
    }),
  );
  await page
    .getByRole("button", { name: "Listen for chord changes", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.locator("#learn-chords [role=alert]")).toContainText(
    "Allow microphone access",
  );
  await input(page);
  await page
    .getByRole("button", { name: "Listen for chord changes", exact: true })
    .click();
  await play(page, [43, 47, 50]);
  await expect(page.locator(".chord-lesson-cue.heard strong")).toHaveText("G");
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Listen for chord changes", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".chord-lesson-cue.heard strong")).toHaveText("—");
});
