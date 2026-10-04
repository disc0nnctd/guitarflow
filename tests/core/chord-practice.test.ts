import { describe, expect, it } from "vitest";
import {
  createChordTracker,
  updateChordTracker,
} from "../../src/core/chord-practice";
import type { ChordEstimate, ChordName } from "../../src/core/types";
function chord(
  name: ChordName | null = "Em",
  overrides: Partial<ChordEstimate> = {},
): ChordEstimate {
  return {
    chord: name,
    confidence: 0.9,
    rms: 0.1,
    candidates: [],
    ...overrides,
  };
}
function accepted() {
  const start = updateChordTracker(createChordTracker(), chord(), "Em", 0);
  return updateChordTracker(start.state, chord(), "Em", 600);
}
describe("audio driven chord practice", () => {
  it("requires a correct chord held for 600 milliseconds", () => {
    const start = updateChordTracker(createChordTracker(), chord(), "Em", 0);
    const early = updateChordTracker(start.state, chord(), "Em", 599);
    expect(early.matched).toBe(false);
    expect(updateChordTracker(early.state, chord(), "Em", 600).matched).toBe(
      true,
    );
  });
  it("rejects wrong, uncertain, unknown, quiet and invalid estimates", () => {
    for (const estimate of [
      chord("E"),
      chord(null),
      chord("Em", { confidence: 0.64 }),
      chord("Em", { rms: 0.007 }),
      chord("Em", { confidence: NaN }),
      chord("Em", { rms: NaN }),
      null,
    ]) {
      let state = createChordTracker();
      for (const now of [0, 300, 700, 1500]) {
        const result = updateChordTracker(state, estimate, "Em", now);
        expect(result.matched).toBe(false);
        state = result.state;
      }
    }
  });
  it("accepts the exact confidence and level thresholds", () => {
    const estimate = chord("Em", { confidence: 0.65, rms: 0.008 });
    const start = updateChordTracker(createChordTracker(), estimate, "Em", 0);
    expect(updateChordTracker(start.state, estimate, "Em", 600).matched).toBe(
      true,
    );
  });
  it("resets a hold after a wrong chord or uncertainty", () => {
    for (const interrupt of [
      chord("G"),
      chord(null),
      chord("Em", { confidence: 0.4 }),
      null,
    ]) {
      const start = updateChordTracker(createChordTracker(), chord(), "Em", 0);
      const interrupted = updateChordTracker(start.state, interrupt, "Em", 500);
      const resumed = updateChordTracker(interrupted.state, chord(), "Em", 700);
      expect(
        updateChordTracker(resumed.state, chord(), "Em", 1000).matched,
      ).toBe(false);
      expect(
        updateChordTracker(resumed.state, chord(), "Em", 1300).matched,
      ).toBe(true);
    }
  });
  it("does not advance an identical next chord from a sustained strum", () => {
    let state = accepted().state;
    for (const now of [700, 1500, 2500]) {
      const result = updateChordTracker(state, chord(), "Em", now);
      expect(result.matched).toBe(false);
      state = result.state;
    }
  });
  it("requires at least 150 milliseconds of measured quiet for repeat release", () => {
    const quiet = chord(null, { rms: 0, confidence: 0 });
    const start = updateChordTracker(accepted().state, quiet, "Em", 700);
    const brief = updateChordTracker(start.state, quiet, "Em", 849);
    expect(brief.state.lockedChord).toBe("Em");
    const released = updateChordTracker(brief.state, quiet, "Em", 850);
    expect(released.state.lockedChord).toBeNull();
    const attack = updateChordTracker(released.state, chord(), "Em", 900);
    expect(updateChordTracker(attack.state, chord(), "Em", 1500).matched).toBe(
      true,
    );
  });
  it("interrupts a quiet release when sound resumes", () => {
    const start = updateChordTracker(
      accepted().state,
      chord(null, { rms: 0 }),
      "Em",
      700,
    );
    const noise = updateChordTracker(start.state, chord(null), "Em", 800);
    const quiet = updateChordTracker(
      noise.state,
      chord(null, { rms: 0 }),
      "Em",
      1000,
    );
    expect(
      updateChordTracker(quiet.state, chord(null, { rms: 0 }), "Em", 1100).state
        .lockedChord,
    ).toBe("Em");
  });
  it("cannot release repeated chords from loud unknown, uncertain or missing samples", () => {
    for (const uncertain of [
      chord("G", { confidence: 0.5 }),
      chord(null),
      null,
    ]) {
      const start = updateChordTracker(accepted().state, uncertain, "Em", 700);
      const later = updateChordTracker(start.state, uncertain, "Em", 1700);
      expect(updateChordTracker(later.state, chord(), "Em", 2300).matched).toBe(
        false,
      );
    }
  });
  it("accepts a reliable different chord without requiring silence", () => {
    const changed = updateChordTracker(accepted().state, chord("G"), "G", 700);
    expect(
      updateChordTracker(changed.state, chord("G"), "G", 1300).matched,
    ).toBe(true);
  });
  it("resets completion gating and hold time with a new tracker", () => {
    expect(accepted().state.lockedChord).toBe("Em");
    const fresh = updateChordTracker(createChordTracker(), chord(), "Em", 3000);
    expect(fresh.matched).toBe(false);
    expect(updateChordTracker(fresh.state, chord(), "Em", 3600).matched).toBe(
      true,
    );
  });
  it("does not mutate previous state and rejects invalid times", () => {
    const initial = createChordTracker();
    updateChordTracker(initial, chord(), "Em", 0);
    expect(initial).toEqual(createChordTracker());
    expect(updateChordTracker(initial, chord(), "Em", NaN).matched).toBe(false);
  });
});
