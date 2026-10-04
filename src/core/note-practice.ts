import type { PitchEstimate } from "./pitch";
import { getFretMidi } from "./pitch";
import { CHORD_FINGERINGS } from "./arrangements";
import type { Arrangement, ChordName } from "./types";

export interface NoteStep {
  midi: number;
  string: number;
  fret: number;
  chord: ChordName;
  finger: "thumb" | "index" | "middle" | "ring";
  beat: number;
}

export interface NoteExercise {
  id: string;
  name: string;
  description: string;
  notes: number[];
  steps?: NoteStep[];
  songId?: string;
}

/** An original eight-note accompaniment, not a transcription of a recording. */
export function buildSongNoteExercise(arrangement: Arrangement): NoteExercise {
  const steps: NoteStep[] = [];
  arrangement.chords.forEach(({ chord }, chordIndex) => {
    const fingering = CHORD_FINGERINGS[chord];
    const bassString = 6 - fingering.findIndex((fret) => fret >= 0);
    const strings = [bassString, 3, 2, 1, 2, 3, 2, 1];
    strings.forEach((string, index) => {
      const fret = fingering[6 - string]!;
      steps.push({
        midi: getFretMidi(string, fret),
        string,
        fret,
        chord,
        finger:
          index === 0
            ? "thumb"
            : string === 3
              ? "index"
              : string === 2
                ? "middle"
                : "ring",
        beat: chordIndex * 4 + index / 2,
      });
    });
  });
  return {
    id: `song-${arrangement.id}`,
    songId: arrangement.id,
    name: `${arrangement.title} — fingerstyle`,
    description:
      "Original fingerstyle accompaniment over this simplified song loop; not the recording’s melody or picking pattern. Learn one note at a time and mute other strings for microphone checking.",
    notes: steps.map((step) => step.midi),
    steps,
  };
}
export const NOTE_EXERCISES: NoteExercise[] = [
  {
    id: "open-strings",
    name: "Open strings",
    description: "Play each open string from low E to high E.",
    notes: [40, 45, 50, 55, 59, 64],
  },
  {
    id: "first-melody",
    name: "First melody",
    description:
      "An original melody using open strings and the first three frets.",
    notes: [64, 65, 67, 65, 64, 62, 60, 59],
  },
  {
    id: "repeat-notes",
    name: "Repeated notes",
    description:
      "Play E twice, then G twice. Mute briefly between repeated notes.",
    notes: [64, 64, 67, 67],
  },
];
export interface NoteTracker {
  candidateMidi: number | null;
  candidateSince: number | null;
  lockedMidi: number | null;
  releaseSince: number | null;
}
export function createNoteTracker(): NoteTracker {
  return {
    candidateMidi: null,
    candidateSince: null,
    lockedMidi: null,
    releaseSince: null,
  };
}
export function updateNoteTracker(
  previous: NoteTracker,
  estimate: PitchEstimate | null,
  targetMidi: number,
  now: number,
): { state: NoteTracker; matched: boolean } {
  const state = { ...previous };
  const clearCandidate = () => {
    state.candidateMidi = null;
    state.candidateSince = null;
  };
  const reliable =
    estimate !== null &&
    estimate.midi !== null &&
    estimate.confidence >= 0.85 &&
    estimate.rms >= 0.008;
  if (state.lockedMidi !== null) {
    if (reliable && estimate!.midi !== state.lockedMidi) {
      state.lockedMidi = null;
      state.releaseSince = null;
    } else if (estimate === null || estimate.rms < 0.008) {
      state.releaseSince ??= now;
      if (now - state.releaseSince >= 80) {
        state.lockedMidi = null;
        state.releaseSince = null;
      }
    } else {
      state.releaseSince = null;
    }
    if (state.lockedMidi !== null) {
      clearCandidate();
      return { state, matched: false };
    }
  }
  const correct =
    reliable &&
    estimate!.midi === targetMidi &&
    estimate!.cents !== null &&
    Math.abs(estimate!.cents!) <= 35;
  if (!correct) {
    clearCandidate();
    return { state, matched: false };
  }
  if (state.candidateMidi !== targetMidi) {
    state.candidateMidi = targetMidi;
    state.candidateSince = now;
  }
  if (now - state.candidateSince! < 200) return { state, matched: false };
  state.lockedMidi = targetMidi;
  clearCandidate();
  return { state, matched: true };
}
