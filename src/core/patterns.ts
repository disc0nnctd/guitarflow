import type { PatternEvent, StrumPattern } from "./types";
export function normalizePatternEvents(events: PatternEvent[]): PatternEvent[] {
  const sorted = events
    .filter((e) => Number.isFinite(e.beat) && e.beat >= 0 && e.beat < 4)
    .map((e) => ({
      beat: Math.round(e.beat * 2) / 2,
      accent: Math.max(
        0,
        Math.min(1, Number.isFinite(e.accent) ? e.accent : 0.7),
      ),
      direction: e.direction,
    }))
    .filter((e) => e.beat < 4)
    .sort((a, b) => a.beat - b.beat);
  return sorted.filter((e, i) => i === 0 || e.beat !== sorted[i - 1].beat);
}
export function validatePattern(value: unknown): value is StrumPattern {
  if (!value || typeof value !== "object") return false;
  const p = value as StrumPattern;
  return (
    p.version === 1 &&
    typeof p.id === "string" &&
    p.id.length > 0 &&
    typeof p.name === "string" &&
    p.name.length > 0 &&
    Number.isFinite(p.bpm) &&
    p.bpm >= 40 &&
    p.bpm <= 240 &&
    Array.isArray(p.meter) &&
    p.meter.length === 2 &&
    p.meter[0] === 4 &&
    p.meter[1] === 4 &&
    p.beatsPerCycle === 4 &&
    ["preset", "recording", "edited"].includes(p.source) &&
    Array.isArray(p.events) &&
    p.events.length > 0 &&
    p.events.length <= 8 &&
    p.events.every(
      (e, i) =>
        e &&
        Number.isFinite(e.beat) &&
        e.beat >= 0 &&
        e.beat < 4 &&
        Number.isInteger(e.beat * 2) &&
        (i === 0 || e.beat > p.events[i - 1].beat) &&
        Number.isFinite(e.accent) &&
        e.accent >= 0 &&
        e.accent <= 1 &&
        ["unknown", "down", "up", "mute"].includes(e.direction),
    )
  );
}
export const PRESET_PATTERNS: StrumPattern[] = [
  {
    version: 1,
    id: "quarters",
    name: "Steady quarter strums",
    bpm: 90,
    meter: [4, 4],
    beatsPerCycle: 4,
    source: "preset",
    events: [0, 1, 2, 3].map((beat) => ({
      beat,
      accent: beat === 0 ? 1 : 0.7,
      direction: "down",
    })),
  },
  {
    version: 1,
    id: "eighths",
    name: "Alternating eighths",
    bpm: 90,
    meter: [4, 4],
    beatsPerCycle: 4,
    source: "preset",
    events: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((beat, i) => ({
      beat,
      accent: i === 0 ? 1 : 0.7,
      direction: i % 2 ? "up" : "down",
    })),
  },
  {
    version: 1,
    id: "folk",
    name: "Down down-up up-down-up",
    bpm: 90,
    meter: [4, 4],
    beatsPerCycle: 4,
    source: "preset",
    events: [0, 1, 1.5, 2.5, 3, 3.5].map((beat, i) => ({
      beat,
      accent: i === 0 ? 1 : 0.7,
      direction: [0, 1, 3].includes(beat) ? "down" : "up",
    })),
  },
];
