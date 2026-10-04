/** A monophonic pitch estimate. Unknown audio retains measured RMS only. */
export interface PitchEstimate {
  midi: number | null;
  note: string | null;
  octave: number | null;
  frequency: number | null;
  cents: number | null;
  confidence: number;
  rms: number;
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const GUITAR_STRINGS: {
  name: string;
  openMidi: number;
  number: number;
}[] = [
  { name: "e", openMidi: 64, number: 1 },
  { name: "B", openMidi: 59, number: 2 },
  { name: "G", openMidi: 55, number: 3 },
  { name: "D", openMidi: 50, number: 4 },
  { name: "A", openMidi: 45, number: 5 },
  { name: "E", openMidi: 40, number: 6 },
];

export function midiLabel(midi: number): string {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127)
    throw new RangeError("MIDI note must be an integer from 0 to 127");
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function getFretMidi(string: number, fret: number): number {
  const tuning = GUITAR_STRINGS.find((entry) => entry.number === string);
  if (!tuning || !Number.isInteger(fret) || fret < 0 || fret > 24)
    throw new RangeError("Use string 1–6 and fret 0–24");
  return tuning.openMidi + fret;
}

/** Audio pitch cannot identify the physical string: return every possible position. */
export function getNotePositions(
  midi: number,
  maxFret = 12,
): { string: number; fret: number }[] {
  if (
    !Number.isInteger(midi) ||
    !Number.isInteger(maxFret) ||
    maxFret < 0 ||
    maxFret > 24
  )
    return [];
  return GUITAR_STRINGS.flatMap(({ number, openMidi }) => {
    const fret = midi - openMidi;
    return fret >= 0 && fret <= maxFret ? [{ string: number, fret }] : [];
  });
}

function unknown(rms = 0): PitchEstimate {
  return {
    midi: null,
    note: null,
    octave: null,
    frequency: null,
    cents: null,
    confidence: 0,
    rms,
  };
}

/**
 * Bounded YIN difference analysis for one guitar note (roughly E2–E5).
 * A short FIR low-pass precedes decimation. At most 2048 reduced samples
 * and ~60 lag candidates are examined, independent of the input length.
 * A periodic chord or harmonic can still confuse this monophonic estimator;
 * the result is evidence of a pitch, not proof of the played string or chord.
 */
export function estimatePitch(
  samples: Float32Array,
  sampleRate: number,
): PitchEstimate {
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < 2000 ||
    sampleRate > 192000 ||
    samples.length < 128
  )
    return unknown();
  const stride = Math.max(1, Math.floor(sampleRate / 4000));
  const rate = sampleRate / stride;
  // Bound input consumption too; take the most recent analysis window.
  const count = Math.min(samples.length, stride * 2048);
  const start = samples.length - count;
  let square = 0;
  let mean = 0;
  for (let i = start; i < samples.length; i++) {
    const value = samples[i];
    if (!Number.isFinite(value)) return unknown();
    square += value * value;
    mean += value;
  }
  mean /= count;
  const rms = Math.sqrt(Math.max(0, square / count - mean * mean));
  if (rms < 0.006) return unknown(rms);

  const values = new Float64Array(Math.floor(count / stride));
  // A Hann-windowed sinc filter: cutoff below reduced Nyquist, 8 taps
  // per decimation factor. Coefficients are shared across all output samples.
  const radius = stride > 1 ? stride * 4 : 0;
  const coefficients = new Float64Array(radius * 2 + 1);
  let weight = 0;
  for (let offset = -radius; offset <= radius; offset++) {
    const x = (offset * 0.8) / stride;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const window =
      radius === 0 ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * offset) / radius);
    const value = sinc * window;
    coefficients[offset + radius] = value;
    weight += value;
  }
  for (let i = 0; i < values.length; i++) {
    const center = start + i * stride;
    let sum = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const index = Math.max(
        start,
        Math.min(samples.length - 1, center + offset),
      );
      sum += (samples[index] - mean) * coefficients[offset + radius];
    }
    values[i] = sum / weight;
  }

  const minLag = Math.max(2, Math.floor(rate / 700));
  const maxLag = Math.ceil(rate / 75);
  const windowLength = values.length - maxLag;
  if (windowLength < maxLag * 3) return unknown(rms);
  const difference = new Float64Array(maxLag + 1);
  let cumulative = 0;
  let candidate = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < windowLength; i++) {
      const delta = values[i] - values[i + lag];
      sum += delta * delta;
    }
    cumulative += sum;
    difference[lag] = cumulative === 0 ? 1 : (sum * lag) / cumulative;
  }
  // The first sufficiently periodic trough avoids interpreting subharmonics
  // as the fundamental. Strict confidence also rejects most noise/chords.
  for (let lag = minLag; lag < maxLag; lag++) {
    if (difference[lag] < 0.1) {
      while (lag + 1 <= maxLag && difference[lag + 1] < difference[lag]) lag++;
      candidate = lag;
      break;
    }
  }
  if (!candidate || candidate >= maxLag) return unknown(rms);
  const left = difference[candidate - 1];
  const center = difference[candidate];
  const right = difference[candidate + 1];
  const curvature = left - 2 * center + right;
  const correction =
    curvature === 0
      ? 0
      : Math.max(-1, Math.min(1, (left - right) / (2 * curvature)));
  const frequency = rate / (candidate + correction);
  const fractionalMidi = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(fractionalMidi);
  if (midi < 40 || midi > 76) return unknown(rms);
  return {
    midi,
    note: NAMES[midi % 12],
    octave: Math.floor(midi / 12) - 1,
    frequency,
    cents: (fractionalMidi - midi) * 100,
    confidence: Math.max(0, Math.min(1, 1 - center)),
    rms,
  };
}
