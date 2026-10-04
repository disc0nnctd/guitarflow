import type { Arrangement, ChordName, StrumPattern } from "./types";
export const CHORD_FINGERINGS: Record<ChordName, number[]> = {
  C: [-1, 3, 2, 0, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  D: [-1, -1, 0, 2, 3, 2],
  A: [-1, 0, 2, 2, 2, 0],
  E: [0, 2, 2, 1, 0, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  Em: [0, 2, 2, 0, 0, 0],
  Dm: [-1, -1, 0, 2, 3, 1],
};
function exercise(
  id: string,
  title: string,
  key: string,
  chords: ChordName[],
  bpm: number,
): Arrangement {
  return {
    version: 1,
    id,
    title,
    subtitle: "Original GuitarFlow practice progression",
    key,
    bpm,
    meter: [4, 4],
    tuning: "standard",
    capo: 0,
    difficulty: "Beginner",
    tags: ["4/4", "quarter", "eighth", "practice"],
    provenance:
      "Original practice arrangement created for GuitarFlow; contains no third-party recording or chart.",
    chords: chords.map((chord, i) => ({
      chord,
      beats: 4,
      section: i < 2 ? "A" : "B",
    })),
  };
}
export const ARRANGEMENTS: Arrangement[] = [
  exercise("open-road", "Open Road", "G", ["G", "C", "D", "G"], 90),
  exercise("quiet-morning", "Quiet Morning", "C", ["C", "Am", "Em", "G"], 80),
  exercise(
    "two-chord-step",
    "Two Chord Step",
    "E Dorian",
    ["Em", "Em", "A", "A"],
    85,
  ),
  exercise("sunrise", "Sunrise", "A", ["A", "D", "E", "A"], 100),
  exercise(
    "minor-drift",
    "Minor Drift",
    "A minor",
    ["Am", "Dm", "E", "Am"],
    75,
  ),
  {
    ...exercise("easy-turn", "Easy Turn", "G", ["G", "Em", "C", "D"], 90),
    chords: [
      { chord: "G", beats: 2, section: "A" },
      { chord: "Em", beats: 2, section: "A" },
      { chord: "C", beats: 4, section: "B" },
      { chord: "D", beats: 8, section: "B" },
    ],
  },
];
export function getCompatibleArrangements(
  pattern: StrumPattern,
  knownChords: ChordName[],
): Arrangement[] {
  return ARRANGEMENTS.filter(
    (a) =>
      a.meter[0] === pattern.meter[0] &&
      a.meter[1] === pattern.meter[1] &&
      a.chords.every((c) => knownChords.includes(c.chord)),
  );
}
