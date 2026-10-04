export const CHORD_NAMES = ["C", "G", "D", "A", "E", "Am", "Em", "Dm"] as const;
export type ChordName = (typeof CHORD_NAMES)[number];
export type Stroke = "unknown" | "down" | "up" | "mute";
export interface PatternEvent {
  beat: number;
  accent: number;
  direction: Stroke;
}
export interface StrumPattern {
  version: 1;
  id: string;
  name: string;
  bpm: number;
  meter: [4, 4];
  beatsPerCycle: 4;
  events: PatternEvent[];
  source: "preset" | "recording" | "edited";
}
export interface Arrangement {
  version: 1;
  id: string;
  title: string;
  subtitle: string;
  key: string;
  bpm: number;
  meter: [4, 4];
  tuning: "standard";
  capo: number;
  difficulty: "Beginner";
  tags: string[];
  provenance: string;
  chords: { chord: ChordName; beats: number; section: string }[];
}
export interface RhythmAnalysis {
  pattern: StrumPattern;
  onsetTimes: number[];
  confidence: number;
  duration: number;
  warnings: string[];
}
export interface ChordEstimate {
  chord: ChordName | null;
  confidence: number;
  rms: number;
  candidates: { chord: ChordName; score: number }[];
}
export interface PlaybackPosition {
  chordIndex: number;
  current: Arrangement["chords"][number];
  next: Arrangement["chords"][number];
  beatInChord: number;
  beatInBar: number;
  beatsUntilChange: number;
  totalBeats: number;
  progress: number;
  completed: boolean;
}
