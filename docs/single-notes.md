# Single-note practice: version 0.2

The microphone can now identify one note at a time and show its note name,
octave and tuning offset. The interactive standard-tuning guitar neck displays
frets 0–12, highlighting the target and possible positions of the heard pitch.
Clicking a fret selects its pitch as a single-note target.

Open strings, an original first melody and repeated notes provide short
practice sequences. The current cue advances only after the exact expected
pitch and octave are stable for at least 200 ms, confidence is at least 0.85,
and the tuning error is within 35 cents. A sustained note cannot satisfy two
successive identical targets; mute briefly or change pitch to rearm matching.
The next cue is displayed alongside the current cue. Restart and exercise
selection clear the match tracker and ignore the previous cached estimate.

## Audio implementation

`src/core/pitch.ts` implements a bounded YIN-style periodicity detector with
filtered downsampling, silence rejection and confidence scoring. Detection
covers E2–E5. No model download, remote inference, microphone upload or new
runtime dependency is needed. `useAudio` switches between chord, note and
recording sessions, closes the previous context and releases its tracks.
Permission requests can be canceled without accepting late audio sessions.

The detector recognizes pitch, not a physical fingering. Several fret/string
positions can produce the same pitch. Chords and harmonic-heavy audio can
still produce incorrect monophonic estimates. Real guitar accuracy is not yet
measured. The existing chord exercise remains driven by the chosen tempo;
the new detection-driven follow-up applies to single-note exercises.

## Verification

The full check includes TypeScript validation, production build, 56 unit tests
and 22 Chrome browser scenarios. Pitch tests include harmonic guitar-like
plucks, open and fretted notes, tuning offsets, multiple sample rates, missing
fundamentals, silence, noise and a representative chord rejection. Tracker
tests cover octave matching, stability, tuning limits and repeated-note gates.

New browser scenarios substitute only the microphone source with a genuine
Web Audio MediaStream. The application capture and pitch detector run unchanged.
They verify wrong-octave waiting, correct-note advancement, tuning feedback,
repeated-note release, fret selection, restart, permission denial/cancellation,
switching listening modes, keyboard activation and contained mobile scrolling.
Existing chord, rhythm, upload and transport scenarios remain covered.

This validates behavior with synthetic audio. It does not establish accuracy
on a physical guitar or noisy room recordings. Those evaluations remain in
the research work tracked by Beads.
