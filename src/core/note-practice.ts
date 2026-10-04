import type { PitchEstimate } from "./pitch";

export interface NoteExercise {
  id: string;
  name: string;
  description: string;
  notes: number[];
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
