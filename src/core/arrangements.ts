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
function songLoop(
  id: string,
  title: string,
  artist: string,
  key: string,
  chords: ChordName[],
  bpm: number,
  lessonSlug: string,
  practiceNotes: string,
): Arrangement {
  return {
    ...exercise(id, title, key, chords, bpm),
    subtitle: `${artist} · Simplified acoustic practice loop`,
    tags: ["4/4", "quarter", "eighth", "acoustic", "song"],
    provenance:
      "GuitarFlow-authored short chord exercise. Practice timing and simplifications are independent of the recording; external lesson linked for learning the song.",
    song: {
      artist,
      lessonUrl: `https://www.justinguitar.com/songs/${lessonSlug}`,
      practiceNotes,
    },
    chords: chords.map((chord) => ({
      chord,
      beats: 4,
      section: "Practice loop",
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
  songLoop(
    "nirvana-about-a-girl",
    "About a Girl",
    "Nirvana",
    "E minor",
    ["Em", "G"],
    90,
    "nirvana-about-a-girl-chords-tabs-guitar-lesson-sg-078",
    "Practice the Em–G verse changes with one bar per chord. The chorus and solo are not included; this loop does not follow the recording's timing.",
  ),
  songLoop(
    "nirvana-something-in-the-way",
    "Something in the Way",
    "Nirvana",
    "E minor",
    ["Em", "C"],
    70,
    "nirvana-something-in-the-way-chords-tabs-guitar-lesson-sg-181",
    "Standard-tuning, no-capo Em–C adaptation using full open chords. Recordings use different tuning and power-chord voicings; this is a transposed practice loop.",
  ),
  songLoop(
    "pink-floyd-wish-you-were-here",
    "Wish You Were Here",
    "Pink Floyd",
    "G",
    ["C", "D", "Am", "G"],
    80,
    "pink-floyd-wish-you-were-here-chords-tabs-guitar-lesson-st-301",
    "Simplified vocal-section chord changes, one bar each. The distinctive intro riff and full song structure are not included.",
  ),
  songLoop(
    "oasis-wonderwall",
    "Wonderwall",
    "Oasis",
    "E minor",
    ["Em", "G", "D", "A"],
    85,
    "oasis-wonderwall-chords-tabs-guitar-lesson-bs-805",
    "No-capo, transposed verse exercise with plain Em, G, D and A in place of the song's suspended/extended shapes. The familiar capo-2 version is higher; use no capo for these cues and chord detection.",
  ),
  songLoop(
    "cranberries-zombie",
    "Zombie",
    "The Cranberries",
    "E minor",
    ["Em", "C", "G", "D"],
    85,
    "the-cranberries-zombie-chords-tabs-guitar-lesson-sg-141",
    "Open-chord acoustic exercise with one bar each of Em, C, G and D. Use your own strumming pattern; this loop is not synchronized to a recording.",
  ),
  songLoop(
    "green-day-good-riddance",
    "Good Riddance (Time of Your Life)",
    "Green Day",
    "G",
    ["G", "C", "D", "G"],
    90,
    "green-day-good-riddance-time-of-your-life-chords-tabs-guitar-lesson-sg-066",
    "Short strummed G–C–D–G exercise using C instead of Cadd9. The picking intro, other sections and recording timing are not included.",
  ),
  songLoop(
    "tracy-chapman-fast-car",
    "Fast Car",
    "Tracy Chapman",
    "G",
    ["C", "G", "Em", "D"],
    85,
    "tracy-chapman-fast-car-chords-tabs-guitar-lesson-bs-802",
    "No-capo, transposed strumming exercise with one bar per open chord. This does not reproduce the signature fingerpicked figure, original voicings or full song structure.",
  ),
  songLoop(
    "bob-dylan-knockin-on-heavens-door",
    "Knockin' on Heaven's Door",
    "Bob Dylan",
    "G",
    ["G", "D", "Am", "G", "D", "C"],
    80,
    "bob-dylan-knockin-on-heaven-s-door-chords-tabs-guitar-lesson-sg-170",
    "Practice the alternating Am and C endings with one bar per chord. These equal-length practice cues simplify the song's phrasing and do not follow a recording.",
  ),
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
