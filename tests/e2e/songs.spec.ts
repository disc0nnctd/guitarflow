import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("search Nirvana songs, select a loop and follow chord cues", async ({
  page,
}) => {
  await page.getByLabel("Show", { exact: true }).selectOption("songs");
  await expect(page.locator(".exercise")).toHaveCount(8);
  await page.getByLabel("Search title or artist").fill("  NIRVANA  ");
  await expect(page.locator(".exercise")).toHaveCount(2);
  await page.locator(".exercise").filter({ hasText: "About a Girl" }).click();
  await expect(
    page.getByRole("heading", { name: "About a Girl", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("current-chord")).toHaveText("Em");
  await expect(page.getByTestId("next-chord")).toHaveText("G");
  await expect(page.locator(".song-details")).toContainText("Nirvana");
  await expect(page.locator(".song-details a")).toHaveAttribute(
    "href",
    /justinguitar\.com\/songs\/nirvana-about-a-girl/,
  );
  await page.locator("#tempo").fill("180");
  await page
    .getByRole("button", { name: "Start practice", exact: true })
    .click();
  await expect(page.getByTestId("playback-state")).toHaveText("Playing");
  await expect(page.getByTestId("current-chord")).toHaveText("G");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

test("Pink Floyd search and shuffle respect visible results and chord availability", async ({
  page,
}) => {
  await page.getByLabel("Search title or artist").fill("Pink Floyd");
  await expect(page.locator(".exercise")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Shuffle compatible exercise" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Wish You Were Here", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".song-details")).toContainText(
    "Simplified acoustic practice loop",
  );
  await expect(page.locator(".song-details a")).toHaveAttribute(
    "target",
    "_blank",
  );
  await page
    .getByRole("group", { name: "Known chords" })
    .getByRole("checkbox", { name: "Am", exact: true })
    .uncheck();
  await expect(page.locator(".exercise")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Shuffle compatible exercise" }),
  ).toBeDisabled();
  await page
    .getByRole("group", { name: "Known chords" })
    .getByRole("checkbox", { name: "Am", exact: true })
    .check();
  await expect(page.locator(".exercise")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Start practice", exact: true }),
  ).toBeEnabled();
});

test("songs, originals and empty search remain usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByLabel("Show", { exact: true }).selectOption("originals");
  await expect(page.locator(".exercise")).toHaveCount(6);
  await page.getByLabel("Show", { exact: true }).selectOption("songs");
  await page.getByLabel("Search title or artist").fill("not a song title");
  await expect(page.locator(".empty")).toContainText("match this search");
  await page.getByLabel("Search title or artist").fill("Fast Car");
  await page.locator(".exercise").click();
  await expect(page.locator(".song-details")).toContainText("Tracy Chapman");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await page
    .locator("#library")
    .screenshot({ path: "artifacts/song-library-mobile.png" });
});
