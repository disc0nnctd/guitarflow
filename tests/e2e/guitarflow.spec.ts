import { expect, test } from "@playwright/test";
import { strummedWav } from "./audio-fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("practice counts in, advances chords, pauses, resumes and restarts", async ({
  page,
}) => {
  const tempo = page.locator("#tempo");
  await tempo.fill("180");
  await tempo.blur();
  const current = page.getByTestId("current-chord");
  const initial = await current.innerText();
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByTestId("playback-state")).toContainText(/count/i);
  await expect(page.getByTestId("playback-state")).toContainText(
    /playing|practice/i,
  );
  await expect(current).not.toHaveText(initial);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByTestId("playback-state")).toContainText(/paused/i);
  const paused = await current.innerText();
  // A full bar passes: the transport must remain frozen.
  await page.waitForTimeout(1100);
  await expect(current).toHaveText(paused);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("playback-state")).toContainText(
    /playing|practice/i,
  );
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(current).toHaveText(initial);
});

test("tempo slider constrains its supported range", async ({ page }) => {
  const tempo = page.locator("#tempo");
  await expect(tempo).toHaveAttribute("min", "40");
  await expect(tempo).toHaveAttribute("max", "180");
  await tempo.fill("180");
  await tempo.blur();
  await expect(tempo).toHaveValue("180");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(tempo).toBeDisabled();
});

test("real WAV upload yields reviewable timing and stays local", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      externalRequests.push(request.url());
  });
  await page.locator("#tempo").fill("120");
  await page.locator("#tempo").blur();
  await page.getByLabel("Upload audio", { exact: true }).setInputFiles({
    name: "independent-g-strums.wav",
    mimeType: "audio/wav",
    buffer: strummedWav(),
  });
  await expect(page.getByText(/first detected strum/i)).toBeVisible();
  await expect(page.getByText(/up\/down directions/i)).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test("corrupt audio produces a useful error", async ({ page }) => {
  await page.getByLabel("Upload audio", { exact: true }).setInputFiles({
    name: "broken.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("this is not audio"),
  });
  await expect(page.getByRole("alert")).toContainText(
    /decode|read|audio|supported/i,
  );
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeEnabled();
});

test("microphone denial provides recovery guidance", async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        Promise.reject(
          new DOMException("Denied for browser test", "NotAllowedError"),
        ),
    });
  });
  await page
    .getByRole("button", { name: "Record pattern", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    /microphone|permission|denied/i,
  );
});

test("mobile layout fits viewport and supports practice", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await page.screenshot({
    path: "artifacts/guitarflow-mobile.png",
    fullPage: true,
  });
});

test("preset corrections save and survive reload", async ({ page }) => {
  await page.getByLabel("Pattern preset").selectOption("eighths");
  const step = page.getByTestId("pattern-step-1");
  const previous = await step.getAttribute("aria-label");
  await step.click();
  const corrected = await step.getAttribute("aria-label");
  expect(corrected).not.toBe(previous);
  await page
    .getByRole("button", { name: "Confirm pattern", exact: true })
    .click();
  await page.getByRole("button", { name: "Save pattern", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("pattern-step-1")).toHaveAttribute(
    "aria-label",
    corrected!,
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("guitarflow.pattern.v1")!).version,
    ),
  ).toBe(1);
});

test("synthesized demo goes through analysis and can be corrected", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Try demo recording", exact: true })
    .click();
  await expect(page.getByText(/first detected strum/i)).toBeVisible();
  const step = page.getByTestId("pattern-step-0");
  const before = await step.getAttribute("aria-label");
  await step.click();
  expect(await step.getAttribute("aria-label")).not.toBe(before);
  await page
    .getByRole("button", { name: "Confirm pattern", exact: true })
    .click();
  await page.getByRole("button", { name: "Save pattern", exact: true }).click();
});

test("desktop captures usable practice screen", async ({ page }) => {
  await expect(page.getByTestId("current-chord")).toBeVisible();
  await expect(page.getByTestId("next-chord")).toBeVisible();
  await page.screenshot({
    path: "artifacts/guitarflow-desktop.png",
    fullPage: true,
  });
});

test("known chord filters constrain compatible exercise selection", async ({
  page,
}) => {
  const known = page.getByRole("group", { name: "Known chords" });
  for (const chord of ["G", "C", "D", "E", "Am", "Dm"]) {
    await known.getByRole("checkbox", { name: chord, exact: true }).uncheck();
  }
  await expect(page.locator(".exercise")).toHaveCount(1);
  await expect(page.locator(".exercise")).toContainText("Two Chord Step");
  await page
    .getByRole("button", { name: "Shuffle compatible exercise" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Two Chord Step", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("current-chord")).toHaveText("Em");
  await known.getByRole("checkbox", { name: "A", exact: true }).uncheck();
  await expect(
    page.getByText("No matching exercises yet.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Shuffle compatible exercise" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeDisabled();
});

test("microphone PCM capture recognizes a chord and records rhythm", async ({
  page,
}) => {
  // Provide a real Web Audio MediaStream backed by independently generated PCM.
  // Only the microphone source is substituted; capture and both algorithms run unchanged.
  await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(bytes.buffer);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const destination = context.createMediaStreamDestination();
    source.connect(destination);
    await context.resume();
    source.start();
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => destination.stream.clone(),
    });
  }, strummedWav(180).toString("base64"));
  await page
    .getByRole("button", { name: "Listen to my chords", exact: true })
    .click();
  await expect(page.getByText(/Heard G ·/)).toBeVisible();
  await page
    .getByRole("button", { name: "Stop listening", exact: true })
    .click();
  await page.locator("#tempo").fill("180");
  await page
    .getByRole("button", { name: "Record pattern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Count in");
  await expect(page.getByRole("status")).toContainText("Recording");
  await expect(page.getByText(/first detected strum/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("button", { name: "Record pattern", exact: true }),
  ).toBeEnabled();
});

test("pausing during count-in resumes remaining count-in", async ({ page }) => {
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByTestId("playback-state")).toHaveText("Count in");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("playback-state")).toHaveText("Count in");
  await expect(page.getByTestId("playback-state")).toHaveText("Playing");
});

test("resume after a whole loop preserves the current chord", async ({
  page,
}) => {
  await page.locator("#tempo").fill("180");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByTestId("current-chord")).toHaveText("C");
  await expect(page.getByTestId("current-chord")).toHaveText("D");
  await expect(page.getByTestId("current-chord")).toHaveText("G");
  await expect(page.getByTestId("current-chord")).toHaveText("C");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByTestId("current-chord")).toHaveText("C");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("current-chord")).toHaveText("C");
  await expect(page.getByTestId("playback-state")).toHaveText("Playing");
});

test("non-looping practice completes once and can restart", async ({
  page,
}) => {
  await page.locator("#tempo").fill("180");
  await page.getByRole("checkbox", { name: "Loop", exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByTestId("playback-state")).toHaveText("Completed", {
    timeout: 10_000,
  });
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByTestId("playback-state")).toHaveText("Ready");
  await expect(page.getByTestId("current-chord")).toHaveText("G");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByTestId("playback-state")).toHaveText("Count in");
});

test("canceling a pending upload prevents stale analysis replacing a preset", async ({
  page,
}) => {
  await page.evaluate(() => {
    const decode = AudioContext.prototype.decodeAudioData;
    const scope = window as unknown as {
      releaseDecode: () => void;
      decoderReady: boolean;
    };
    const gate = new Promise<void>((resolve) => {
      scope.releaseDecode = resolve;
    });
    AudioContext.prototype.decodeAudioData = async function (
      data: ArrayBuffer,
    ) {
      const decoded = await decode.call(this, data);
      scope.decoderReady = true;
      await gate;
      return decoded;
    };
  });
  await page.locator("#tempo").fill("120");
  await page.getByLabel("Upload audio", { exact: true }).setInputFiles({
    name: "slow-decode.wav",
    mimeType: "audio/wav",
    buffer: strummedWav(),
  });
  await expect(page.getByRole("status")).toContainText("Analyzing");
  await page.waitForFunction(
    () => (window as unknown as { decoderReady: boolean }).decoderReady,
  );
  await expect(page.getByLabel("Pattern preset")).toBeDisabled();
  await page.locator(".exercise").filter({ hasText: "Quiet Morning" }).click();
  await page.getByLabel("Pattern preset").selectOption("eighths");
  await page.evaluate(async () => {
    (window as unknown as { releaseDecode: () => void }).releaseDecode();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await expect(page.getByLabel("Pattern preset")).toHaveValue("eighths");
  await expect(page.getByTestId("pattern-step-1")).toHaveAttribute(
    "aria-label",
    /up$/,
  );
  await expect(page.getByText(/first detected strum/i)).toHaveCount(0);
});

test("changing exercise while audio is starting cancels deferred transport start", async ({
  page,
}) => {
  await page.evaluate(() => {
    const resume = AudioContext.prototype.resume;
    const scope = window as unknown as {
      releaseResume: () => void;
      resumeReady: boolean;
    };
    const gate = new Promise<void>((resolve) => {
      scope.releaseResume = resolve;
    });
    AudioContext.prototype.resume = async function () {
      await resume.call(this);
      scope.resumeReady = true;
      await gate;
    };
  });
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await page.waitForFunction(
    () => (window as unknown as { resumeReady: boolean }).resumeReady,
  );
  await page.locator(".exercise").filter({ hasText: "Quiet Morning" }).click();
  await page.evaluate(async () => {
    (window as unknown as { releaseResume: () => void }).releaseResume();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await expect(page.getByTestId("playback-state")).toHaveText("Ready");
  await expect(page.getByTestId("current-chord")).toHaveText("C");
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeEnabled();
});

test("audio guide counts in quarters then follows selected eighth-note pattern", async ({
  page,
}) => {
  await page.evaluate(() => {
    const start = OscillatorNode.prototype.start;
    const scope = window as unknown as { scheduledClicks: number[] };
    scope.scheduledClicks = [];
    OscillatorNode.prototype.start = function (when = 0) {
      scope.scheduledClicks.push(when);
      start.call(this, when);
    };
  });
  await page.getByLabel("Pattern preset").selectOption("eighths");
  await page.locator("#tempo").fill("180");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      (window as unknown as { scheduledClicks: number[] }).scheduledClicks
        .length >= 8,
  );
  const clicks = await page.evaluate(() =>
    (window as unknown as { scheduledClicks: number[] }).scheduledClicks.slice(
      0,
      8,
    ),
  );
  for (let i = 1; i < 5; i++)
    expect(clicks[i] - clicks[i - 1]).toBeCloseTo(1 / 3, 3);
  for (let i = 5; i < 8; i++)
    expect(clicks[i] - clicks[i - 1]).toBeCloseTo(1 / 6, 3);
  await expect(page.locator(".pattern-grid .live-step")).toHaveCount(1);
});
