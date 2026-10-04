import { expect, test, type Page } from "@playwright/test";

async function microphone(page: Page) {
  await page.evaluate(async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    oscillator.connect(gain).connect(destination);
    gain.gain.value = 0;
    oscillator.start();
    await context.resume();
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => destination.stream.clone(),
    });
    (
      window as unknown as {
        playNote: (midi: number | null, cents?: number) => void;
      }
    ).playNote = (midi, cents = 0) => {
      gain.gain.value = midi === null ? 0 : 0.2;
      if (midi !== null)
        oscillator.frequency.value =
          440 * 2 ** ((midi - 69 + cents / 100) / 12);
    };
  });
}
async function play(page: Page, midi: number | null, cents = 0) {
  await page.evaluate(
    ({ midi, cents }) => {
      (
        window as unknown as {
          playNote: (midi: number | null, cents: number) => void;
        }
      ).playNote(midi, cents);
    },
    { midi, cents },
  );
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("actual microphone PCM waits for exact octave and advances correct notes", async ({
  page,
}) => {
  await microphone(page);
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  const target = page.locator(".note-cue.current strong");
  const heard = page.locator(".note-cue.heard strong");
  await play(page, 52);
  await expect(heard).toHaveText("E3");
  await page.waitForTimeout(500);
  await expect(target).toHaveText("E2");
  await play(page, 40, 22);
  await expect(page.locator(".note-cue.heard small")).toContainText(
    /cents sharp/,
  );
  await expect(target).toHaveText("A2");
  await play(page, 45);
  await expect(target).toHaveText("D3");
  await expect(page.locator(".neck-note.is-heard")).not.toHaveCount(0);
  await page
    .getByRole("button", { name: "Stop note listening", exact: true })
    .click();
  await expect(heard).toHaveText("—");
  await page.waitForTimeout(400);
  await expect(target).toHaveText("D3");
});

test("repeated notes require release and selecting a fret sets its target", async ({
  page,
}) => {
  await microphone(page);
  await page.locator("#note-exercise").selectOption("repeat-notes");
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await play(page, 64);
  await expect(page.locator(".note-cue.current small")).toHaveText(
    "Note 2 of 4",
  );
  await page.waitForTimeout(700);
  await expect(page.locator(".note-cue.current small")).toHaveText(
    "Note 2 of 4",
  );
  await play(page, null);
  await expect(page.locator(".note-cue.heard strong")).toHaveText("—");
  await page.waitForTimeout(300);
  await play(page, 64);
  await expect(page.locator(".note-cue.current strong")).toHaveText("G4");
  await page
    .getByRole("button", { name: "E4, string 1, open string", exact: true })
    .click();
  await expect(page.locator("#note-exercise")).toHaveValue("single");
  await expect(page.locator(".note-cue.current strong")).toHaveText(
    "Complete!",
  );
  await page
    .getByRole("button", { name: "Restart note exercise", exact: true })
    .click();
  await expect(page.locator(".note-cue.current strong")).toHaveText("E4");
});

test("note microphone denial recovers and pending permission can be canceled", async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        Promise.reject(
          new DOMException("Permission denied", "NotAllowedError"),
        ),
    });
  });
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Allow microphone access",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => new Promise(() => {}),
    });
  });
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel microphone request", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Listen to single notes", exact: true }),
  ).toBeEnabled();
});

test("neck fits mobile with internal scrolling and keyboard selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  const note = page.getByRole("button", {
    name: "E4, string 1, open string",
    exact: true,
  });
  await note.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".note-cue.current strong")).toHaveText("E4");
  await page
    .locator("#notes")
    .screenshot({ path: "artifacts/single-notes-mobile.png" });
});

test("switching listening modes releases the previous detector", async ({
  page,
}) => {
  await microphone(page);
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await play(page, 40);
  await expect(page.locator(".note-cue.heard strong")).toHaveText("E2");
  await page
    .getByRole("button", { name: "Listen to my chords", exact: true })
    .click();
  await expect(page.locator(".note-cue.heard strong")).toHaveText("—");
  await expect(
    page.getByRole("button", { name: "Stop listening", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Listen to single notes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Listen to my chords", exact: true }),
  ).toBeVisible();
});
