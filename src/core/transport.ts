import type {
  Arrangement,
  PlaybackPosition,
  StrumPattern,
  Stroke,
} from "./types";
export function getPlaybackPosition(
  arrangement: Arrangement,
  elapsedBeats: number,
  loop: boolean,
): PlaybackPosition {
  if (
    !arrangement.chords.length ||
    arrangement.chords.some((c) => !Number.isFinite(c.beats) || c.beats <= 0)
  )
    throw new Error("Arrangement needs chords with positive beat durations.");
  const totalBeats = arrangement.chords.reduce((s, c) => s + c.beats, 0);
  const elapsed = Number.isFinite(elapsedBeats) ? Math.max(0, elapsedBeats) : 0;
  const completed = !loop && elapsed >= totalBeats;
  const local = loop ? elapsed % totalBeats : Math.min(elapsed, totalBeats);
  let start = 0,
    index = 0;
  while (
    index < arrangement.chords.length - 1 &&
    local >= start + arrangement.chords[index].beats
  ) {
    start += arrangement.chords[index].beats;
    index++;
  }
  const current = arrangement.chords[index];
  return {
    chordIndex: index,
    current,
    next:
      arrangement.chords[index + 1] ?? (loop ? arrangement.chords[0] : current),
    beatInChord: local - start,
    beatInBar: local % 4,
    beatsUntilChange: completed ? 0 : current.beats - (local - start),
    totalBeats,
    progress: local / totalBeats,
    completed,
  };
}
export function patternEventsBetween(
  pattern: StrumPattern,
  fromBeat: number,
  toBeat: number,
): { beat: number; accent: number; direction: Stroke }[] {
  if (
    !Number.isFinite(fromBeat) ||
    !Number.isFinite(toBeat) ||
    toBeat <= fromBeat
  )
    return [];
  const out: { beat: number; accent: number; direction: Stroke }[] = [];
  for (
    let cycle = Math.floor(Math.max(0, fromBeat) / 4);
    cycle * 4 < toBeat;
    cycle++
  )
    for (const e of pattern.events) {
      const beat = cycle * 4 + e.beat;
      if (beat >= fromBeat && beat < toBeat) out.push({ ...e, beat });
    }
  return out;
}
