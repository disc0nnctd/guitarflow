import { describe, expect, it } from "vitest";
import {
  ARRANGEMENTS,
  CHORD_FINGERINGS,
  getCompatibleArrangements,
} from "../../src/core/arrangements";
import { PRESET_PATTERNS } from "../../src/core/patterns";
import { CHORD_NAMES } from "../../src/core/types";

describe("acoustic song practice catalog", () => {
  const songs = ARRANGEMENTS.filter((arrangement) => arrangement.song);

  it("keeps original exercises and adds the requested artists without duplicate ids", () => {
    expect(
      ARRANGEMENTS.slice(0, 6).every((arrangement) => !arrangement.song),
    ).toBe(true);
    expect(songs).toHaveLength(8);
    expect(
      new Set(ARRANGEMENTS.map((arrangement) => arrangement.id)).size,
    ).toBe(ARRANGEMENTS.length);
    expect(
      songs.filter((arrangement) => arrangement.song?.artist === "Nirvana"),
    ).toHaveLength(2);
    expect(
      songs.some((arrangement) => arrangement.song?.artist === "Pink Floyd"),
    ).toBe(true);
  });

  it("provides usable standard-tuning open chords and linked lessons for every song", () => {
    for (const arrangement of songs) {
      expect(arrangement.capo).toBe(0);
      expect(arrangement.tuning).toBe("standard");
      expect(arrangement.meter).toEqual([4, 4]);
      expect(arrangement.bpm).toBeGreaterThanOrEqual(40);
      expect(arrangement.bpm).toBeLessThanOrEqual(240);
      expect(arrangement.song?.practiceNotes.length).toBeGreaterThan(40);
      expect(new URL(arrangement.song!.lessonUrl).hostname).toBe(
        "www.justinguitar.com",
      );
      expect(arrangement.chords.length).toBeGreaterThan(1);
      for (const change of arrangement.chords) {
        expect(CHORD_NAMES).toContain(change.chord);
        expect(CHORD_FINGERINGS[change.chord]).toHaveLength(6);
        expect(change.beats).toBe(4);
      }
    }
  });

  it("only offers song loops when every required chord is known", () => {
    expect(
      getCompatibleArrangements(PRESET_PATTERNS[0], [...CHORD_NAMES]),
    ).toEqual(ARRANGEMENTS);
    const twoChordSongs = getCompatibleArrangements(PRESET_PATTERNS[0], [
      "Em",
      "G",
    ]).filter((arrangement) => arrangement.song);
    expect(twoChordSongs.map((arrangement) => arrangement.id)).toEqual([
      "nirvana-about-a-girl",
    ]);
    expect(
      getCompatibleArrangements(PRESET_PATTERNS[0], ["G", "D", "Am"]).some(
        (arrangement) => arrangement.id === "bob-dylan-knockin-on-heavens-door",
      ),
    ).toBe(false);
  });

  it("labels tuning, voicing and picking adaptations explicitly", () => {
    const byId = (id: string) =>
      songs.find((arrangement) => arrangement.id === id)!.song!.practiceNotes;
    expect(byId("nirvana-something-in-the-way")).toMatch(/different tuning/);
    expect(byId("oasis-wonderwall")).toMatch(/capo-2/);
    expect(byId("green-day-good-riddance")).toMatch(/Cadd9/);
    expect(byId("tracy-chapman-fast-car")).toMatch(/fingerpicked/);
    expect(byId("pink-floyd-wish-you-were-here")).toMatch(/intro riff/);
  });
});
