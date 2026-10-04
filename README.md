# GuitarFlow

A personal guitar assistant: record a strumming pattern, choose a compatible
song arrangement, and receive current/next chord cues while playing.

Version 0.2 is a browser practice app. Record or upload a short strumming
pattern, correct its timing grid, and practice original progressions with
current/next chord cues. Audio processing runs on your device.
Single-note practice listens for the expected pitch and octave before advancing
to the next note. An interactive guitar neck shows target and heard positions.

## Run locally

Use Node.js 22.12 or newer and npm:

```bash
npm ci
npm run dev
```

Open **http://localhost:5180**. Microphone access requires localhost or HTTPS.
Grant microphone permission when recording or enabling experimental chord
listening. Use headphones so clicks do not enter your recording.
For single notes, choose **Listen to single notes**, then pluck one string at
a time. Try open strings, an original melody, repeated notes, or click a fret
to select a target. Mute briefly between repeated notes.

```bash
npm run build
npm run preview
```

The production preview opens at **http://localhost:4180**.

## First practice session

1. Try a preset or the demo recording to explore without microphone access.
2. Set the tempo you will play. Record a repeated pattern on one held chord,
   or upload a short audio recording.
3. Review the detected eighth-note grid. Confirm or correct strum direction;
   the audio detector estimates timing, not up/down hand motion.
4. Select the chords you know and choose a compatible practice progression.
5. Start practice, follow the current/next chord displays, and use pause,
   restart and tempo controls as needed.

Saved patterns stay in this browser's local storage. Raw microphone/upload
audio is used in memory and is not sent to a server. Clearing browser storage
removes saved patterns.

## What this version can and cannot do

- Single-note listening estimates pitch, octave and tuning from microphone
  audio using a local monophonic detector. It waits for a confident correct
  note held briefly within 35 cents of the target. Repeated notes require a
  release or different pitch before another match. Supported detection range:
  E2–E5 in standard tuning.
- The neck shows frets 0–12 and all possible positions for a pitch. Audio does
  not identify which physical string or fret was used. Use one string at a
  time; chords, noise and strong harmonics can confuse single-note detection.
- Chord cues follow the chosen tempo and arrangement durations. Missing a strum
  does not skip a chord. The rhythm guide clicks follow the selected pattern
  after the count-in. Switching away from the tab pauses practice. The app does
  not yet follow your changing live tempo.
- Rhythm analysis uses your confirmed tempo and the first detected attack as
  the bar start. Review the grid if your pattern starts with a rest or pickup.
- Chord listening is experimental note-energy matching for a small open-chord
  vocabulary. It can return unknown, especially for noise and partial chords;
  it does not determine when the arrangement advances.
- The library contains original practice progressions, not a licensed popular
  song catalogue. Random selection is limited to compatible exercises.
- Synthetic test audio validates mechanics. Accuracy on real guitar recordings
  and the planned Basic Pitch comparison remain unverified.

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use `/usr/bin/google-chrome` when available. Else install the
Playwright browser with `npx playwright install chromium`, or set `CHROME_PATH`
to an installed Chrome executable. Screenshots and test traces are written to
ignored `artifacts/` directories. See [release evidence](docs/version-1.md)
for the scenarios checked and limitations.
See [single-note release evidence](docs/single-notes.md) for the new detector,
practice follow-up and neck checks.

## Project documents

- [Phase-one plan](docs/phase-1-plan.md): scope, experiments, data and completion criteria.
- [Research baseline](docs/research-baseline.md): products, open source resources and limitations.
- [Progress tracking](docs/tracking.md): Beads workflow and recovery.

## Find the next task

Install the Beads CLI (`bd`), then run from this directory:

```bash
bd prime
bd ready
bd show <issue-id>
bd update <issue-id> --claim
```

Beads is the source of truth for progress. The plan describes intent; it is not
a second task-status list. The working name overlaps with an existing guitar
app; naming will be revisited before a public release.
