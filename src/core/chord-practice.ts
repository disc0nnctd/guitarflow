import type { ChordEstimate, ChordName } from "./types";

export interface ChordTracker {
  candidateChord: ChordName | null;
  candidateSince: number | null;
  lockedChord: ChordName | null;
  releaseSince: number | null;
}
export function createChordTracker(): ChordTracker {
  return {
    candidateChord: null,
    candidateSince: null,
    lockedChord: null,
    releaseSince: null,
  };
}
/** Advances from sound, with a release gate for consecutive identical chords. */
export function updateChordTracker(
  previous: ChordTracker,
  estimate: ChordEstimate | null,
  targetChord: ChordName,
  now: number,
): { state: ChordTracker; matched: boolean } {
  const state = { ...previous };
  const clearCandidate = () => {
    state.candidateChord = null;
    state.candidateSince = null;
  };
  const reliable =
    estimate !== null &&
    estimate.chord !== null &&
    Number.isFinite(estimate.confidence) &&
    estimate.confidence >= 0.65 &&
    Number.isFinite(estimate.rms) &&
    estimate.rms >= 0.008;
  if (!Number.isFinite(now)) {
    clearCandidate();
    return { state, matched: false };
  }
  if (state.lockedChord !== null) {
    if (reliable && estimate!.chord !== state.lockedChord) {
      state.lockedChord = null;
      state.releaseSince = null;
    } else if (
      estimate !== null &&
      Number.isFinite(estimate.rms) &&
      estimate.rms < 0.008
    ) {
      state.releaseSince ??= now;
      if (now - state.releaseSince >= 150) {
        state.lockedChord = null;
        state.releaseSince = null;
      }
    } else {
      state.releaseSince = null;
    }
    if (state.lockedChord !== null) {
      clearCandidate();
      return { state, matched: false };
    }
  }
  if (!reliable || estimate!.chord !== targetChord) {
    clearCandidate();
    return { state, matched: false };
  }
  if (state.candidateChord !== targetChord) {
    state.candidateChord = targetChord;
    state.candidateSince = now;
  }
  if (now - state.candidateSince! < 600) return { state, matched: false };
  state.lockedChord = targetChord;
  state.releaseSince = null;
  clearCandidate();
  return { state, matched: true };
}
