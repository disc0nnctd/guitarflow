# Version 1 experiment contract

All processing in the first release runs locally in the browser. Audio is not
sent to a server. Microphone and uploaded recordings live in memory only.
Saving a pattern stores its timing and stroke metadata in local storage, not audio.

## Patterns

`StrumPattern` in `src/core/types.ts` is the versioned interchange format:

```json
{
  "version": 1,
  "id": "my-pattern",
  "name": "My pattern",
  "bpm": 90,
  "meter": [4, 4],
  "beatsPerCycle": 4,
  "source": "recording",
  "events": [
    { "beat": 0, "accent": 1, "direction": "unknown" },
    { "beat": 1.5, "accent": 0.7, "direction": "unknown" }
  ]
}
```

Events are unique, sorted, on half-beat boundaries in [0, 4), with accents in [0, 1], and direction
`unknown`, `down`, `up`, or `mute`. Capture quantizes to straight eighth notes.
The editor normalizer also rounds to eighth notes. BPM is player-confirmed,
between 40 and 240. Captured events are relative to the first detected attack,
which is provisionally beat one: the player must confirm or correct bar phase.
There is no stored absolute recording offset in this version. Presets carry
hand-authored directions; recording analysis never guesses direction.

## Arrangements

`Arrangement` version 1 carries identity, title/subtitle, key, BPM, meter,
standard tuning, capo, beginner difficulty, descriptive tags, provenance and an
ordered list of `{ chord, beats, section }`. Vocabulary is C, G, D, A, E, Am, Em,
Dm. Repeats are expanded explicitly, retaining repeated identical chords as
separate events. Each positive duration is in quarter-note beats. One exercise
has 2, 2, 4 and 8-beat durations. Fingerings use six numbers, low E through high
E; -1 is muted, 0 open. The bundled library consists of original practice
progressions and includes no third-party audio or chart. Meter and available
chords determine compatibility; rhythm does not identify a song.

## Algorithms and uncertainty

Rhythm capture uses 10 ms RMS windows, positive energy changes, local maxima,
and attack merging within up to 120 ms. It requires at least two complete bars,
quantizes at confirmed tempo, and selects the most frequent complete-bar event
signature. Confidence combines signature consistency and grid timing error.
Warnings always expose first-attack phase and unknown direction; inconsistent
captures also receive a low-confidence warning. Silence and too few usable
strums produce actionable errors. This baseline is for steady solo strumming;
it does not estimate tempo or follow live pauses.

Chord capture resamples a bounded three-second segment to 8 kHz and analyzes
4096-sample Hann-window FFT frames. Energy near equal-tempered notes from 70 to
1400 Hz becomes a 12-class pitch vector. Templates reward chord-note energy
and coverage; weak or closely matched candidates remain unknown. Confidence is
a heuristic score, not a calibrated probability. Silence, single-note ambiguity
and tested broadband noise remain unknown. Harmonic contamination, partial
strums, detuning, microphone response and transitions remain real limitations.

Playback position is calculated directly from elapsed audio-clock beats,
without adding visual frame intervals. Event scheduling uses start-inclusive,
end-exclusive beat intervals. Completion retains the final chord; looping
returns to the first event at the exact total-duration boundary. Missing strums
do not affect progression in fixed-tempo mode.

## Recording metadata and evaluation

Future recordings should retain sample rate, guitar, tuning, microphone,
room/session, confirmed BPM/bar start, expected chord/pattern, manual onset
labels and deliberate error descriptions. Private audio belongs outside git.
Reserve entire later sessions for evaluation to avoid testing on development
examples.

No real guitar recordings have been collected or evaluated in this release.
Automated tests exercise deterministic synthetic triads for all eight chords,
harmonic guitar-like G strums, silence, deterministic noise, ambiguous single
notes, rhythm extraction, validation, arbitrary chord durations, exact transport
boundaries and a three-minute computed timeline. They do not demonstrate real
microphone recognition accuracy, audio scheduling latency, user usability, or
live following. Synthetic demo audio is generated, then passed through the same
analysis functions as recordings.

Phase-one targets remain unmeasured: clean held-out onset precision/recall at
least 90% within ±75 ms; tempo within ±5% (tempo estimation is not implemented);
three-minute audible scheduling drift below 50 ms; completion of three checked
arrangements without a separate chart; no incorrect changes on missed strums.
Chord evaluation must report confusion, rejection and delay without an accuracy
promise. Basic Pitch comparison and live-following feasibility are deferred.
