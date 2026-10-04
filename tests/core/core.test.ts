import { describe, it, expect } from "vitest";
import {
  analyzeRhythm,
  estimateChord,
  generateDemoAudio,
} from "../../src/core/audio";
import {
  PRESET_PATTERNS,
  validatePattern,
  normalizePatternEvents,
} from "../../src/core/patterns";
import {
  ARRANGEMENTS,
  getCompatibleArrangements,
  CHORD_FINGERINGS,
} from "../../src/core/arrangements";
import {
  getPlaybackPosition,
  patternEventsBetween,
} from "../../src/core/transport";
const sampleRate = 16000;
function chord(notes: number[]) {
  const samples = new Float32Array(sampleRate);
  for (let i = 0; i < samples.length; i++)
    for (const note of notes) {
      const f = 440 * 2 ** ((note - 69) / 12);
      samples[i] += 0.1 * Math.sin((2 * Math.PI * f * i) / sampleRate);
    }
  return samples;
}
describe("audio baseline", () => {
  it("extracts a repeated folk rhythm from synthesized string attacks", () => {
    const result = analyzeRhythm(
      generateDemoAudio(sampleRate, 90),
      sampleRate,
      90,
    );
    expect(result.pattern.events.map((e) => e.beat)).toEqual([
      0, 1, 1.5, 2.5, 3, 3.5,
    ]);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.pattern.events.every((e) => e.direction === "unknown")).toBe(
      true,
    );
  });
  it("rejects silence and short captures", () => {
    expect(() =>
      analyzeRhythm(new Float32Array(sampleRate * 8), sampleRate),
    ).toThrow(/No clear/);
    expect(() =>
      analyzeRhythm(new Float32Array(sampleRate), sampleRate),
    ).toThrow(/two full bars/);
    expect(
      estimateChord(new Float32Array(sampleRate), sampleRate).chord,
    ).toBeNull();
  });
  it.each([
    ["C", [48, 52, 55]],
    ["G", [43, 47, 50]],
    ["D", [50, 54, 57]],
    ["A", [45, 49, 52]],
    ["E", [40, 44, 47]],
    ["Am", [45, 48, 52]],
    ["Em", [40, 43, 47]],
    ["Dm", [50, 53, 57]],
  ] as const)("identifies synthetic %s triads", (name, notes) => {
    expect(estimateChord(chord([...notes]), sampleRate).chord).toBe(name);
  });
  it("rejects deterministic broadband noise and ambiguous single notes", () => {
    let seed = 12345;
    const samples = new Float32Array(sampleRate);
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      samples[i] = ((seed / 4294967296) * 2 - 1) * 0.2;
    }
    expect(estimateChord(samples, sampleRate).chord).toBeNull();
    expect(estimateChord(chord([52]), sampleRate).chord).toBeNull();
  });
  it("estimates G from actual synthesized demo audio", () => {
    expect(estimateChord(generateDemoAudio(sampleRate), sampleRate).chord).toBe(
      "G",
    );
  });
});
describe("pattern and arrangement contracts", () => {
  it("rejects hidden off-grid events that the eighth-note editor cannot display", () => {
    expect(
      validatePattern({
        ...PRESET_PATTERNS[0],
        events: [{ beat: 0.25, accent: 1, direction: "unknown" }],
      }),
    ).toBe(false);
  });
  it("validates all presets and rejects malformed objects", () => {
    expect(PRESET_PATTERNS.every(validatePattern)).toBe(true);
    expect(
      validatePattern({
        ...PRESET_PATTERNS[0],
        events: [{ beat: 0, accent: NaN, direction: "down" }],
      }),
    ).toBe(false);
    expect(validatePattern(null)).toBe(false);
    expect(validatePattern({ ...PRESET_PATTERNS[0], bpm: Infinity })).toBe(
      false,
    );
    expect(
      validatePattern({
        ...PRESET_PATTERNS[0],
        events: [{ beat: 0, accent: 1, direction: "sideways" }],
      }),
    ).toBe(false);
  });
  it("normalizes and deduplicates event timing", () => {
    expect(
      normalizePatternEvents([
        { beat: 1.01, accent: 2, direction: "up" },
        { beat: 1, accent: 0.5, direction: "down" },
        { beat: -1, accent: 1, direction: "up" },
      ]),
    ).toEqual([{ beat: 1, accent: 1, direction: "up" }]);
  });
  it("filters by every required chord and keeps reusable provenance", () => {
    expect(
      getCompatibleArrangements(PRESET_PATTERNS[0], ["G", "C", "D"]).map(
        (a) => a.id,
      ),
    ).toEqual(expect.arrayContaining(["open-road"]));
    expect(
      getCompatibleArrangements(PRESET_PATTERNS[0], ["G", "C", "D"]).every(
        (a) => a.chords.every((event) => ["G", "C", "D"].includes(event.chord)),
      ),
    ).toBe(true);
    expect(ARRANGEMENTS.length).toBeGreaterThanOrEqual(5);
    expect(Object.values(CHORD_FINGERINGS).every((f) => f.length === 6)).toBe(
      true,
    );
  });
});
describe("transport", () => {
  const a = ARRANGEMENTS[0];
  it("changes at exact boundaries and handles completion and loops", () => {
    expect(getPlaybackPosition(a, 3.999, false).current.chord).toBe("G");
    expect(getPlaybackPosition(a, 4, false).current.chord).toBe("C");
    expect(getPlaybackPosition(a, 16, false).completed).toBe(true);
    expect(getPlaybackPosition(a, 16, false).beatsUntilChange).toBe(0);
    expect(getPlaybackPosition(a, 16, true).current.chord).toBe("G");
    expect(getPlaybackPosition(a, 16, true).progress).toBe(0);
  });
  it("uses elapsed audio time without accumulated frame drift over three minutes", () => {
    const bpm = 90;
    for (let second = 0; second <= 180; second += 0.017) {
      const beat = (second * bpm) / 60;
      const position = getPlaybackPosition(a, beat, true);
      expect(position.beatInChord).toBeCloseTo(beat % 4, 8);
    }
    expect(getPlaybackPosition(a, (180 * bpm) / 60, true).beatInBar).toBe(2);
  });
  it("supports two, four and eight beat chords", () => {
    const varied = ARRANGEMENTS[5];
    expect(getPlaybackPosition(varied, 2, false).current.chord).toBe("Em");
    expect(getPlaybackPosition(varied, 4, false).current.chord).toBe("C");
    expect(getPlaybackPosition(varied, 8, false).current.chord).toBe("D");
    expect(getPlaybackPosition(varied, 12, false).beatsUntilChange).toBe(4);
  });
  it("preserves repeated chord boundaries", () => {
    expect(getPlaybackPosition(ARRANGEMENTS[2], 4, false).chordIndex).toBe(1);
  });
  it("enumerates start-inclusive end-exclusive events across bars", () => {
    expect(
      patternEventsBetween(PRESET_PATTERNS[0], 3, 5).map((e) => e.beat),
    ).toEqual([3, 4]);
    expect(patternEventsBetween(PRESET_PATTERNS[0], 4, 4)).toEqual([]);
  });
});
