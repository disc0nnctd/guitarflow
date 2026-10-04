# Phase one: prove rhythm capture and useful chord cues

Date: 2026-10-04

## Outcome

Prove that a short recording of solo guitar can become a repeatable rhythm
grid, and that a simple chord-cue interface helps the player complete a known
progression. Evaluate limited chord recognition as a separate experiment.

This phase deliberately separates recorded-pattern analysis from live timing.
An algorithm that succeeds after seeing a whole recording is not automatically
suitable for live use. First deliver a useful fixed-tempo cue loop, then test
whether live tracking earns inclusion in the next phase.

## Initial assumptions

| Area | Starting scope |
| --- | --- |
| Instrument | Solo acoustic guitar, standard tuning |
| Input | Laptop microphone, quiet room, headphones for app audio |
| Rhythm | 4/4 meter, straight eighth-note patterns, count-in |
| Pattern capture | 4 bars on one held chord; player may correct results |
| Chord vocabulary | C, G, D, A, E, Am, Em, Dm |
| Arrangement | One known progression initially; 3–5 checked arrangements later |
| Interface | Large current chord, next chord, beat indicator and change countdown |
| Cueing | Visual initially; optional advance spoken cue through headphones |
| Execution | Browser interface; Python experiments; local live timing |

These are implementation defaults, not confirmed details of the user's guitar
or device. Record actual equipment before collecting data. Electric guitar,
alternate tuning, swing, fingerpicking and changing meter are future scope.

## Work packages

### Experiment contract and data formats

Define a versioned pattern format with tempo, meter, bar-start offset and
events expressed in beats. Events contain timing, accent and optional
direction/muting labels. Unknown direction must remain unknown, never be
silently inferred as ground truth.

Define arrangements with title, key, tuning, capo, ordered chord events,
durations in beats, sections/repeats, difficulty, compatible patterns and
source/reuse permission. Pattern compatibility suggests playable arrangements;
a rhythm alone does not identify a song or imply its original strumming.

Define recording metadata: sample rate, microphone/device, guitar, tuning,
room, session, pattern, expected chord and any deliberate errors.

### Collect a small labelled evaluation set

Start with 5 patterns at 3 tempos, with 2 takes each: 30 clean clips. Add at
least 12 clips containing missed strums, pauses, uneven tempo or room noise.
Capture isolated examples of the supported chords, including incomplete,
muted and intentionally incorrect attempts. These are feasibility examples,
not sufficient data to train a general-purpose model.

Manually mark strum times, bar starts and chord changes. Keep entire recording
sessions together when splitting development and evaluation data. Reserve a
later session, ideally on another microphone, for evaluation. Store private
audio outside git under ignored data directories. Store reusable labels and
metadata only after checking their contents and permissions.

### Recorded-pattern analysis

Use librosa to measure changes in sound energy and locate strum starts.
Estimate tempo and map events onto the known beat grid. Compare detected
events with manual labels. A count-in or player-confirmed bar start resolves
ambiguity about where the bar begins.

Treat a single strum's successive string attacks as one strum where possible;
avoid counting each string separately. Return confidence and an editable
grid. Exact audio-only down/up classification is not required for this phase.
Replay the detected rhythm so the player can confirm it by ear.

### Cue prototype

Load a manually checked progression, start with a count-in, and advance using
chord durations in beats. Preview the next chord before the change. Provide
pause, restart and tempo controls. Schedule cues from the audio clock rather
than accumulating screen timer intervals. Keep this usable even when chord
recognition is disabled or uncertain.

A missed strum must not advance the arrangement incorrectly. Do not interpret
every strum as a chord change; chords may span several beats or bars.

### Chord-recognition comparison

Compare two baselines on the same held-out recordings:

- Pitch-class energy (chroma) matched against chord templates.
- Spotify Basic Pitch note estimates grouped into candidate chords.

Report per-chord confusion, unknown/rejected results, decision delay and
performance during transitions. Restrict candidates using the arrangement's
expected chord and nearby alternatives, while retaining an unknown result.
Also report unrestricted results so song-context assumptions do not hide
recognition weaknesses. Partial strums and shared notes can confuse similar
chords; checking the expected chord is easier than unrestricted transcription.

Basic Pitch is a comparison candidate, not a committed live dependency.
Measure its required audio window and compute delay before considering live
use. A language model does not drive beat timing or chord advancement.

### Live-following feasibility and review

After fixed-tempo cueing works, trial a causal beat follower against replayed
and live audio. Test slowdowns, missed strums, pauses and repeated chords.
Use rhythm and expected song position together; chord evidence is optional.
Document recovery policy and confidence. If following is unreliable, retain
fixed-tempo mode and record the limitation rather than presenting it as solved.

## Proposed acceptance targets

Freeze these targets before evaluating the reserved recordings. They are
project targets, not measured results or claims about existing libraries.

| Measure | Initial target |
| --- | --- |
| Clean held-out strum detection | At least 90% precision and recall within ±75 ms |
| Tempo on clean repeated patterns | Within ±5% of reference; report half/double-tempo errors |
| Fixed-tempo scheduling | No cumulative drift beyond 50 ms over a 3-minute replay |
| Cue usability | Complete 3 checked arrangements without consulting a separate chart |
| Missed-strum behavior | No extra or skipped chord changes in fixed-tempo mode |
| Chord comparison | Report accuracy, rejection rate and delay; no accuracy promise yet |
| Live-following trial | Report cue error and pause-recovery time; decide next-phase scope |

Use onset precision/recall, timing error distributions, per-chord confusion,
recording-to-result delay and cue timing measurements. Save reproducible
commands, environment versions and result artifacts with each experiment.

## Deliverables and next-phase decision

Deliver documented formats, a labelled evaluation set, a repeatable rhythm
analysis experiment, a playable cue prototype, a chord-baseline comparison
and an evidence-backed feasibility report. Track their completion in Beads.

Only after review expand song selection, live following, exact stroke
direction or model training. A broader catalogue requires checked arrangement
timing and compatible rhythm tags; source audio, charts and model weights each
need separate permission/license records.
