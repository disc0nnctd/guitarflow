import { describe, it, expect } from "vitest";
import type { PitchEstimate } from "../../src/core/pitch";
import {
  createNoteTracker,
  NOTE_EXERCISES,
  updateNoteTracker,
} from "../../src/core/note-practice";
function pitch(
  midi: number,
  overrides: Partial<PitchEstimate> = {},
): PitchEstimate {
  return {
    midi,
    note: "E",
    octave: 4,
    frequency: 330,
    cents: 0,
    confidence: 0.97,
    rms: 0.1,
    ...overrides,
  };
}
function accept(midi = 64) {
  const initial = updateNoteTracker(createNoteTracker(), pitch(midi), midi, 0);
  return updateNoteTracker(initial.state, pitch(midi), midi, 220);
}
describe("note practice progression", () => {
  it("requires 200 milliseconds of stable correct pitch", () => {
    const first = updateNoteTracker(createNoteTracker(), pitch(64), 64, 0);
    const early = updateNoteTracker(first.state, pitch(64), 64, 199);
    expect(early.matched).toBe(false);
    expect(updateNoteTracker(early.state, pitch(64), 64, 200).matched).toBe(
      true,
    );
  });
  it("rejects wrong octaves, low confidence and out of tune notes", () => {
    for (const sample of [
      pitch(52),
      pitch(64, { confidence: 0.84 }),
      pitch(64, { cents: 36 }),
      pitch(64, { cents: -36 }),
      pitch(64, { cents: null }),
      pitch(64, { rms: 0.002 }),
    ]) {
      let state = createNoteTracker();
      for (const time of [0, 100, 300, 600]) {
        const next = updateNoteTracker(state, sample, 64, time);
        expect(next.matched).toBe(false);
        state = next.state;
      }
    }
  });
  it("resets the stable hold after a wrong note or noise", () => {
    const first = updateNoteTracker(createNoteTracker(), pitch(64), 64, 0);
    const noise = updateNoteTracker(
      first.state,
      pitch(64, { confidence: 0.4 }),
      64,
      180,
    );
    const resumed = updateNoteTracker(noise.state, pitch(64), 64, 210);
    expect(updateNoteTracker(resumed.state, pitch(64), 64, 300).matched).toBe(
      false,
    );
    expect(updateNoteTracker(resumed.state, pitch(64), 64, 420).matched).toBe(
      true,
    );
  });
  it("does not advance repeated targets while a note is sustained", () => {
    let state = accept().state;
    for (const time of [400, 800, 1200]) {
      const next = updateNoteTracker(state, pitch(64), 64, time);
      expect(next.matched).toBe(false);
      state = next.state;
    }
  });
  it("requires a sustained release before accepting the repeated note", () => {
    const accepted = accept();
    const brief = updateNoteTracker(
      accepted.state,
      pitch(64, { rms: 0 }),
      64,
      300,
    );
    const sustained = updateNoteTracker(brief.state, pitch(64), 64, 340);
    expect(sustained.matched).toBe(false);
    const releaseStart = updateNoteTracker(sustained.state, null, 64, 400);
    const releaseEnd = updateNoteTracker(releaseStart.state, null, 64, 480);
    const attack = updateNoteTracker(releaseEnd.state, pitch(64), 64, 510);
    expect(updateNoteTracker(attack.state, pitch(64), 64, 710).matched).toBe(
      true,
    );
  });
  it("cannot unlock repeated notes from uncertain noisy pitch alone", () => {
    const uncertain = updateNoteTracker(
      accept().state,
      pitch(67, { confidence: 0.4 }),
      64,
      400,
    );
    expect(updateNoteTracker(uncertain.state, pitch(64), 64, 900).matched).toBe(
      false,
    );
  });
  it("accepts a changed pitch after the previous correct note", () => {
    const changed = updateNoteTracker(accept().state, pitch(67), 67, 300);
    expect(updateNoteTracker(changed.state, pitch(67), 67, 500).matched).toBe(
      true,
    );
  });
  it("starts fresh after restart", () => {
    expect(accept().state.lockedMidi).toBe(64);
    const restarted = updateNoteTracker(
      createNoteTracker(),
      pitch(64),
      64,
      1000,
    );
    expect(restarted.matched).toBe(false);
    expect(
      updateNoteTracker(restarted.state, pitch(64), 64, 1200).matched,
    ).toBe(true);
  });
  it("contains bounded original exercises including repeated targets", () => {
    expect(
      NOTE_EXERCISES.find((entry) => entry.id === "repeat-notes")?.notes,
    ).toEqual([64, 64, 67, 67]);
    expect(
      NOTE_EXERCISES.every(
        (entry) =>
          entry.notes.length > 0 &&
          entry.notes.every((midi) => midi >= 40 && midi <= 76),
      ),
    ).toBe(true);
  });
});
