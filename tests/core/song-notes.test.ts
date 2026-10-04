import { describe, expect, it } from "vitest";
import { ARRANGEMENTS, CHORD_FINGERINGS } from "../../src/core/arrangements";
import {
  buildSongNoteExercise,
  createNoteTracker,
  NOTE_EXERCISES,
  updateNoteTracker,
} from "../../src/core/note-practice";
import { getFretMidi, type PitchEstimate } from "../../src/core/pitch";

const songs = ARRANGEMENTS.filter((arrangement) => arrangement.song);
const pitch = (midi: number): PitchEstimate => ({
  midi,
  note: "E",
  octave: 4,
  frequency: 330,
  cents: 0,
  confidence: 0.97,
  rms: 0.1,
});

describe("song-linked fingerstyle accompaniment", () => {
  it("generates all eight song loops without replacing basic exercises", () => {
    expect(songs).toHaveLength(8);
    expect(NOTE_EXERCISES.map((exercise) => exercise.id)).toEqual([
      "open-strings",
      "first-melody",
      "repeat-notes",
    ]);
    for (const song of songs) {
      const exercise = buildSongNoteExercise(song);
      expect(exercise.id).toBe(`song-${song.id}`);
      expect(exercise.songId).toBe(song.id);
      expect(exercise.name).toBe(`${song.title} — fingerstyle`);
      expect(exercise.description).toContain(
        "Original fingerstyle accompaniment",
      );
      expect(exercise.description).toContain("not the recording’s melody");
      expect(exercise.steps).toHaveLength(song.chords.length * 8);
      expect(exercise.notes).toEqual(exercise.steps!.map((step) => step.midi));
    }
  });

  for (const song of songs) {
    it(`uses playable chord positions and the correct fingers for ${song.title}`, () => {
      const exercise = buildSongNoteExercise(song);
      song.chords.forEach(({ chord }, chordIndex) => {
        const bar = exercise.steps!.slice(chordIndex * 8, chordIndex * 8 + 8);
        const fingering = CHORD_FINGERINGS[chord];
        const lowestPlayableString =
          6 - fingering.findIndex((fret) => fret >= 0);
        expect(bar.map((step) => step.string)).toEqual([
          lowestPlayableString,
          3,
          2,
          1,
          2,
          3,
          2,
          1,
        ]);
        expect(bar.map((step) => step.finger)).toEqual([
          "thumb",
          "index",
          "middle",
          "ring",
          "middle",
          "index",
          "middle",
          "ring",
        ]);
        bar.forEach((step, noteIndex) => {
          expect(step.chord).toBe(chord);
          expect(step.fret).toBe(fingering[6 - step.string]);
          expect(step.fret).toBeGreaterThanOrEqual(0);
          expect(step.midi).toBe(getFretMidi(step.string, step.fret));
          expect(step.midi).toBeGreaterThanOrEqual(40);
          expect(step.midi).toBeLessThanOrEqual(76);
          expect(step.beat).toBe(chordIndex * 4 + noteIndex / 2);
        });
      });
    });
  }

  it("rejects wrong next notes and waits for a stable changed pitch", () => {
    const exercise = buildSongNoteExercise(songs[0]!);
    const [first, second] = exercise.notes as [number, number];
    let result = updateNoteTracker(createNoteTracker(), pitch(first), first, 0);
    result = updateNoteTracker(result.state, pitch(first), first, 200);
    expect(result.matched).toBe(true);
    result = updateNoteTracker(result.state, pitch(first), second, 500);
    expect(result.matched).toBe(false);
    result = updateNoteTracker(result.state, pitch(second), second, 600);
    expect(result.matched).toBe(false);
    result = updateNoteTracker(result.state, pitch(second), second, 800);
    expect(result.matched).toBe(true);
  });

  it("cannot consume a repeated target from a held note", () => {
    const target = buildSongNoteExercise(songs[0]!).notes[0]!;
    let result = updateNoteTracker(
      createNoteTracker(),
      pitch(target),
      target,
      0,
    );
    result = updateNoteTracker(result.state, pitch(target), target, 200);
    expect(result.matched).toBe(true);
    for (const now of [400, 800, 1200]) {
      result = updateNoteTracker(result.state, pitch(target), target, now);
      expect(result.matched).toBe(false);
    }
    result = updateNoteTracker(result.state, null, target, 1300);
    result = updateNoteTracker(result.state, null, target, 1380);
    result = updateNoteTracker(result.state, pitch(target), target, 1400);
    expect(result.matched).toBe(false);
    result = updateNoteTracker(result.state, pitch(target), target, 1600);
    expect(result.matched).toBe(true);
  });
});
