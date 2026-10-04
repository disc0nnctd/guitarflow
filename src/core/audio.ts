import { CHORD_NAMES } from "./types";
import type { ChordEstimate, RhythmAnalysis, PatternEvent } from "./types";
const NOTES: Record<string, number[]> = {
  C: [0, 4, 7],
  G: [7, 11, 2],
  D: [2, 6, 9],
  A: [9, 1, 4],
  E: [4, 8, 11],
  Am: [9, 0, 4],
  Em: [4, 7, 11],
  Dm: [2, 5, 9],
};
function checkAudio(samples: Float32Array, sampleRate: number) {
  if (!Number.isFinite(sampleRate) || sampleRate < 4000 || sampleRate > 192000)
    throw new Error("Use audio sampled between 4 kHz and 192 kHz.");
  if (samples.some((x) => !Number.isFinite(x)))
    throw new Error("Audio contains invalid samples.");
}
function rmsOf(samples: Float32Array) {
  let sum = 0;
  for (const x of samples) sum += x * x;
  return Math.sqrt(sum / Math.max(1, samples.length));
}
export function analyzeRhythm(
  samples: Float32Array,
  sampleRate: number,
  bpmHint = 90,
): RhythmAnalysis {
  checkAudio(samples, sampleRate);
  if (!Number.isFinite(bpmHint) || bpmHint < 40 || bpmHint > 240)
    throw new Error("Confirm a tempo between 40 and 240 BPM.");
  const duration = samples.length / sampleRate,
    beatSec = 60 / bpmHint;
  if (duration < beatSec * 8)
    throw new Error("Record at least two full bars at the confirmed tempo.");
  if (rmsOf(samples) < 0.003)
    throw new Error(
      "No clear guitar sound detected. Move closer to the microphone and try again.",
    );
  const hop = Math.max(1, Math.round(sampleRate * 0.01)),
    envelope: number[] = [];
  for (let start = 0; start < samples.length; start += hop) {
    let energy = 0;
    const end = Math.min(start + hop, samples.length);
    for (let i = start; i < end; i++) energy += samples[i] * samples[i];
    envelope.push(Math.sqrt(energy / (end - start)));
  }
  const novelty = envelope.map((v, i) =>
    Math.max(0, v - (i ? envelope[i - 1] : 0)),
  );
  const peak = Math.max(...novelty),
    baseline = novelty.reduce((a, b) => a + b, 0) / novelty.length;
  const threshold = Math.max(0.002, peak * 0.14, baseline * 3);
  const onsetTimes: number[] = [];
  const strengths: number[] = [];
  const mergeTime = Math.min(0.12, beatSec * 0.22);
  for (let i = 0; i < novelty.length; i++)
    if (
      novelty[i] > threshold &&
      novelty[i] >= (novelty[i - 1] ?? 0) &&
      novelty[i] >= (novelty[i + 1] ?? 0)
    ) {
      const time = (i * hop) / sampleRate;
      if (
        onsetTimes.length &&
        time - onsetTimes[onsetTimes.length - 1] < mergeTime
      ) {
        if (novelty[i] > strengths[strengths.length - 1])
          strengths[strengths.length - 1] = novelty[i];
      } else {
        onsetTimes.push(time);
        strengths.push(novelty[i]);
      }
    }
  if (onsetTimes.length < 4)
    throw new Error(
      "Too few clear strums. Play the same pattern for at least two bars.",
    );
  const first = onsetTimes[0],
    bars = new Map<number, Map<number, number>>();
  let error = 0;
  onsetTimes.forEach((time, i) => {
    const beat = (time - first) / beatSec,
      quant = Math.round(beat * 2) / 2;
    error += Math.abs(beat - quant);
    const bar = Math.floor(quant / 4),
      position = quant % 4;
    if (!bars.has(bar)) bars.set(bar, new Map());
    bars
      .get(bar)!
      .set(
        position,
        Math.max(bars.get(bar)!.get(position) ?? 0, strengths[i] / peak),
      );
  });
  const fullBars = [...bars]
    .filter(([bar]) => first + (bar + 1) * 4 * beatSec <= duration + 0.05)
    .map(([, events]) => events);
  if (fullBars.length < 2)
    throw new Error("Record two complete repeated bars after the first strum.");
  const signatures = new Map<
    string,
    { count: number; events: Map<number, number> }
  >();
  for (const events of fullBars) {
    const key = [...events.keys()].sort((a, b) => a - b).join(",");
    const entry = signatures.get(key);
    if (entry) entry.count++;
    else signatures.set(key, { count: 1, events });
  }
  const best = [...signatures.values()].sort((a, b) => b.count - a.count)[0];
  const consistency = best.count / fullBars.length,
    timing = Math.max(0, 1 - error / onsetTimes.length / 0.2);
  const confidence = Math.min(1, consistency * timing);
  const events: PatternEvent[] = [...best.events]
    .sort((a, b) => a[0] - b[0])
    .map(([beat, accent]) => ({
      beat,
      accent: Math.max(0.2, Math.min(1, accent)),
      direction: "unknown",
    }));
  const warnings = [
    "The first detected strum is treated as beat 1. Confirm the bar start and tempo.",
    "Audio estimates timing only; up/down directions need your confirmation.",
  ];
  if (confidence < 0.65)
    warnings.push(
      "The rhythm is inconsistent or noisy. Review the grid before using it.",
    );
  return {
    pattern: {
      version: 1,
      id: "recorded-pattern",
      name: "Your recorded pattern",
      bpm: bpmHint,
      meter: [4, 4],
      beatsPerCycle: 4,
      source: "recording",
      events,
    },
    onsetTimes,
    confidence,
    duration,
    warnings,
  };
}
// Radix-2 FFT; bounded frames preserve low-string pitch resolution without whole-file transforms.
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const angle = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size)
      for (let j = 0; j < size / 2; j++) {
        const c = Math.cos(angle * j),
          s = Math.sin(angle * j),
          k = start + j,
          l = k + size / 2,
          tr = re[l] * c - im[l] * s,
          ti = re[l] * s + im[l] * c;
        re[l] = re[k] - tr;
        im[l] = im[k] - ti;
        re[k] += tr;
        im[k] += ti;
      }
  }
}
export function estimateChord(
  samples: Float32Array,
  sampleRate: number,
): ChordEstimate {
  checkAudio(samples, sampleRate);
  const rms = rmsOf(samples);
  const unknown: ChordEstimate = {
    chord: null,
    confidence: 0,
    rms,
    candidates: [],
  };
  if (rms < 0.003 || samples.length / sampleRate < 0.15) return unknown;
  // Resample to 8 kHz; 4096-point frames have enough resolution for standard guitar notes.
  const rate = 8000,
    n = 4096,
    len = Math.min(Math.floor((samples.length / sampleRate) * rate), rate * 3),
    signal = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const p = (i * sampleRate) / rate,
      a = Math.floor(p),
      f = p - a;
    signal[i] =
      samples[a] * (1 - f) +
      (samples[Math.min(a + 1, samples.length - 1)] ?? 0) * f;
  }
  const chroma = new Float64Array(12);
  let totalEnergy = 0,
    tonalEnergy = 0;
  for (let start = 0; start < len; start += n / 2) {
    if (len - start < rate * 0.15) break;
    const re = new Float64Array(n),
      im = new Float64Array(n);
    for (let i = 0; i < n && start + i < len; i++)
      re[i] =
        signal[start + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    fft(re, im);
    for (
      let k = Math.ceil((70 * n) / rate);
      k < Math.floor((1400 * n) / rate);
      k++
    ) {
      const energy = re[k] * re[k] + im[k] * im[k],
        midi = 69 + 12 * Math.log2((k * rate) / n / 440),
        nearest = Math.round(midi),
        distance = Math.abs(midi - nearest);
      totalEnergy += energy;
      if (distance < 0.22) {
        const weight = 1 - distance / 0.22;
        chroma[((nearest % 12) + 12) % 12] += energy * weight;
        tonalEnergy += energy * weight;
      }
    }
  }
  const sum = chroma.reduce((a, b) => a + b, 0);
  if (sum <= 0 || tonalEnergy / Math.max(totalEnergy, 1e-12) < 0.25)
    return unknown;
  const candidates = CHORD_NAMES.map((chord) => {
    const notes = NOTES[chord],
      inside = notes.reduce((s, p) => s + chroma[p], 0) / sum;
    const coverage =
      notes.reduce((s, p) => s + Math.min(1, chroma[p] / sum / 0.12), 0) / 3;
    return { chord, score: inside * 0.75 + coverage * 0.25 };
  }).sort((a, b) => b.score - a.score);
  const best = candidates[0],
    margin = best.score - candidates[1].score;
  const confidence = Math.max(
    0,
    Math.min(1, (best.score - 0.5) * 1.5 + margin),
  );
  return {
    chord: best.score >= 0.78 && margin >= 0.07 ? best.chord : null,
    confidence,
    rms,
    candidates,
  };
}
export function generateDemoAudio(sampleRate = 44100, bpm = 90): Float32Array {
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < 4000 ||
    sampleRate > 192000 ||
    !Number.isFinite(bpm) ||
    bpm < 40 ||
    bpm > 240
  )
    throw new Error("Invalid demo sample rate or tempo.");
  const beat = 60 / bpm,
    duration = beat * 16 + 0.35,
    out = new Float32Array(Math.ceil(sampleRate * duration));
  // Standard open G voicing: G2 B2 D3 G3 B3 G4. Each string arrives separately.
  const frequencies = [98, 123.4708, 146.8324, 195.9977, 246.9417, 391.9954];
  for (let bar = 0; bar < 4; bar++)
    for (const position of [0, 1, 1.5, 2.5, 3, 3.5])
      frequencies.forEach((f, string) => {
        const start = Math.round(
          (0.06 + (bar * 4 + position) * beat + string * 0.003) * sampleRate,
        );
        for (let j = 0; j < sampleRate * 0.5 && start + j < out.length; j++) {
          const t = j / sampleRate,
            envelope = (1 - Math.exp(-t * 1500)) * Math.exp(-t * 10);
          out[start + j] +=
            0.09 *
            envelope *
            (Math.sin(2 * Math.PI * f * t) +
              0.18 * Math.sin(4 * Math.PI * f * t) +
              0.07 * Math.sin(6 * Math.PI * f * t));
        }
      });
  return out;
}
