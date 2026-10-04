/** Independent PCM fixture: repeated open G strums, not app-generated data. */
export function strummedWav(bpm = 120): Buffer {
  const sampleRate = 44100;
  const beat = 60 / bpm;
  const length = Math.ceil((16 * beat + 0.5) * sampleRate);
  const samples = new Float32Array(length);
  for (let bar = 0; bar < 4; bar++) {
    for (const position of [0, 1, 1.5, 2.5, 3, 3.5]) {
      for (const [string, frequency] of [
        98, 123.4708, 146.8324, 195.9977, 246.9417, 391.9954,
      ].entries()) {
        const start = Math.round(
          (0.05 + (bar * 4 + position) * beat + string * 0.003) * sampleRate,
        );
        for (let i = 0; i < sampleRate * 0.45 && start + i < length; i++) {
          const t = i / sampleRate;
          const envelope = (1 - Math.exp(-1600 * t)) * Math.exp(-12 * t);
          samples[start + i] +=
            0.1 *
            envelope *
            (Math.sin(2 * Math.PI * frequency * t) +
              0.15 * Math.sin(4 * Math.PI * frequency * t));
        }
      }
    }
  }
  const wav = Buffer.alloc(44 + length * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(length * 2, 40);
  samples.forEach((value, index) =>
    wav.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, value)) * 32767),
      44 + index * 2,
    ),
  );
  return wav;
}
