import { describe, expect, it } from "vitest";
import {
  estimatePitch,
  getFretMidi,
  getNotePositions,
  GUITAR_STRINGS,
  midiLabel,
} from "../../src/core/pitch";

const frequencyOf = (midi: number, cents = 0) =>
  440 * 2 ** ((midi - 69 + cents / 100) / 12);
function pluck(
  midi: number,
  cents = 0,
  sampleRate = 44100,
  harmonics = [1, 0.5, 0.25, 0.1],
): Float32Array {
  let random = 123;
  return Float32Array.from({ length: Math.ceil(sampleRate * 0.2) }, (_, i) => {
    random = (1664525 * random + 1013904223) >>> 0;
    const t = i / sampleRate;
    const tone = harmonics.reduce(
      (sum, amplitude, index) =>
        sum +
        amplitude *
          Math.sin(
            2 * Math.PI * frequencyOf(midi, cents) * (index + 1) * t +
              index * 0.3,
          ),
      0,
    );
    return 0.2 * Math.exp(-t * 3) * tone + (random / 2 ** 32 - 0.5) * 0.004;
  });
}

describe("monophonic guitar pitch", () => {
  it.each(GUITAR_STRINGS)(
    "recognizes the open $name string from a harmonic pluck",
    ({ openMidi }) => {
      const result = estimatePitch(pluck(openMidi), 44100);
      expect(result.midi).toBe(openMidi);
      expect(Math.abs(result.cents!)).toBeLessThan(10);
      expect(result.confidence).toBeGreaterThan(0.9);
    },
  );
  it.each([41, 47, 52, 58, 65, 69, 76])(
    "recognizes fretted MIDI %s",
    (midi) => {
      expect(estimatePitch(pluck(midi), 44100).midi).toBe(midi);
    },
  );
  it("recognizes a pure sine in the live 8192-sample window", () => {
    const signal = Float32Array.from(
      { length: 8192 },
      (_, i) => 0.15 * Math.sin((2 * Math.PI * 82.4069 * i) / 44100),
    );
    const result = estimatePitch(signal, 44100);
    expect(result.midi).toBe(40);
    expect(Math.abs(result.cents!)).toBeLessThan(3);
  });
  it.each([-25, 25])("reports signed tuning offset %s cents", (cents) => {
    const result = estimatePitch(pluck(57, cents), 44100);
    expect(result.midi).toBe(57);
    expect(result.cents).toBeCloseTo(cents, -1);
    expect(result.frequency).toBeCloseTo(frequencyOf(57, cents), 0);
  });
  it.each([8000, 16000, 48000, 96000])("works at %s Hz", (rate) => {
    expect(estimatePitch(pluck(45, 0, rate), rate).midi).toBe(45);
  });
  it("finds the fundamental when second and third harmonics dominate", () => {
    expect(
      estimatePitch(pluck(45, 0, 44100, [0, 0.7, 0.6, 0.1]), 44100).midi,
    ).toBe(45);
  });
  it.each([44100, 48000, 96000])(
    "recognizes high E and B string notes with a dominant second harmonic at %s Hz",
    (sampleRate) => {
      // A near-absent fundamental previously caused E4 to be reported as E5.
      // Fretted high-string notes also exposed reduced-lag resolution errors.
      for (let midi = 59; midi <= 76; midi++) {
        for (const cents of [-25, 0, 25]) {
          const signal = pluck(midi, cents, sampleRate, [0.02, 1, 0.1, 0.3]);
          const result = estimatePitch(signal, sampleRate);
          expect(result.midi, `MIDI ${midi}, ${cents} cents`).toBe(midi);
          expect(Math.abs(result.cents! - cents)).toBeLessThan(10);
        }
      }
    },
  );
  it.each([44100, 48000, 96000])(
    "does not mistake E5 for E4 when comparing harmonic periods at %s Hz",
    (sampleRate) => {
      for (const cents of [-35, 0, 35]) {
        for (const harmonics of [[1], [1, 0.5, 0.25, 0.1]]) {
          const result = estimatePitch(
            pluck(76, cents, sampleRate, harmonics),
            sampleRate,
          );
          expect(result.midi).toBe(76);
          expect(Math.abs(result.cents! - cents)).toBeLessThan(10);
        }
      }
    },
  );
  it("recognizes a high-E pluck in the live 16384-sample analyser window", () => {
    const sampleRate = 48000;
    const harmonics = [0.02, 1, 0.1, 0.3];
    const signal = Float32Array.from({ length: 16384 }, (_, i) => {
      const t = i / sampleRate;
      return (
        0.05 *
        Math.exp(-t * 5) *
        harmonics.reduce(
          (sum, amplitude, index) =>
            sum +
            amplitude *
              Math.sin(
                2 * Math.PI * frequencyOf(64) * (index + 1) * t + index * 0.3,
              ),
          0,
        )
      );
    });
    const result = estimatePitch(signal, sampleRate);
    expect(result.midi).toBe(64);
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(Math.abs(result.cents!)).toBeLessThan(10);
  });
  it("rejects silence, DC, broadband noise, and invalid inputs", () => {
    let seed = 22;
    const noise = Float32Array.from({ length: 8192 }, () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return (seed / 2 ** 32 - 0.5) * 0.5;
    });
    for (const samples of [
      new Float32Array(8192),
      new Float32Array(8192).fill(0.3),
      noise,
      new Float32Array(8192).fill(NaN),
      new Float32Array(20),
    ]) {
      expect(estimatePitch(samples, 44100).midi).toBeNull();
    }
    expect(estimatePitch(pluck(45), NaN).midi).toBeNull();
    expect(estimatePitch(pluck(45), 0).midi).toBeNull();
  });
  it("rejects a representative major triad instead of confirming one note", () => {
    const tones = [pluck(40), pluck(44), pluck(47)];
    const chord = Float32Array.from(
      tones[0],
      (_, i) => tones.reduce((sum, tone) => sum + tone[i], 0) / 3,
    );
    expect(estimatePitch(chord, 44100).midi).toBeNull();
  });
});

describe("standard tuning fretboard", () => {
  it("labels notes with octave and ASCII sharps", () => {
    expect(midiLabel(40)).toBe("E2");
    expect(midiLabel(61)).toBe("C#4");
  });
  it("lists all same-pitch positions rather than inferring a string", () => {
    expect(getNotePositions(64)).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 5 },
      { string: 3, fret: 9 },
    ]);
    expect(getNotePositions(64, 24)).toHaveLength(6);
    expect(getNotePositions(39)).toEqual([]);
    expect(getNotePositions(64, -1)).toEqual([]);
  });
  it("maps valid strings and frets and rejects invalid values", () => {
    expect(getFretMidi(6, 0)).toBe(40);
    expect(getFretMidi(1, 12)).toBe(76);
    expect(() => getFretMidi(0, 0)).toThrow(RangeError);
    expect(() => getFretMidi(1, 25)).toThrow(RangeError);
    expect(() => midiLabel(60.5)).toThrow(RangeError);
  });
});
