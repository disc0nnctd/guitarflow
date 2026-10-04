# Version 0.1: implementation and verification

## Scope

The first release implements local rhythm capture and fixed-tempo practice.
It is an application prototype, not completion of the research plan's
held-out real-guitar evaluation.

Audio is processed in the browser to keep microphone data local and remove
the need to run a Python service for the practice session. The phase-one
Python/librosa and Basic Pitch comparison remains separate research work.

The interface uses React and TypeScript with Vite. Signal analysis and
arrangement positioning are pure functions that can be tested independently
of microphone permissions and the browser. The practice clock comes from
Web Audio elapsed time rather than counting strums or accumulating display
timer ticks.

## Design decisions

| Decision | Reason |
| --- | --- |
| Dark charcoal, warm amber and large chord names | Keep attention on the current chord and upcoming change |
| Presets and synthesized demo | Let the first session work before microphone permission |
| Confirmed tempo and editable rhythm | Short recordings cannot reliably establish tempo and bar phase alone |
| Unknown stroke direction | Audio timing is not proof of up/down hand motion |
| Original practice progressions | Begin without importing third-party charts or recordings |
| Unknown chord outcome | Avoid presenting ambiguous notes as certainty |
| Fixed-tempo cueing independent of recognition | A missed strum or uncertain chord cannot skip the arrangement |
| No external fonts, analytics or audio service | Keep the practice session local |

## Evidence

The version-one Beads epic is `gf-0v1`; the broader phase-one research epic is
`gf-2pn`. Verification was run on 2026-10-04 with Node.js 22.22.1 and system
Google Chrome. Locked dependency versions are in `package-lock.json`.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 21 unit tests passed |
| `npm run build` | Passed; production JavaScript about 81 kB gzipped |
| `npm run test:e2e` | 17 Chromium browser scenarios passed in the final standalone run |
| Production preview smoke | HTTP 200; demo analysis, confirmation, timed G-to-C cue and pause passed; no console/page errors |
| `npm run format:check` | Passed |
| `npm audit` | No reported dependency vulnerabilities at verification time |
| Independent source review | Playback cancellation, high-rate listening windows and stale-session cleanup findings resolved |

`npm run check` executes type checking, unit tests, the production build and
browser tests in sequence. The final run passed without source changes during
browser execution.

Unit scenarios cover rhythm extraction from synthesized string attacks, all
eight synthetic triads, silence/noise/single-note rejection, exact eighth-note
validation, arrangement filtering, arbitrary beat durations, loops, repeated
chords and a computed three-minute transport timeline.

Browser scenarios cover count-in and chord advancement; pause/resume/restart;
tempo constraints; native WAV decode with no external audio requests; malformed
uploads and denied microphone access; saved-pattern reload; demo analysis;
compatible exercise selection; microphone capture through an actual Web Audio
MediaStream and AudioWorklet fed generated PCM; live chord estimation; paused
count-in; resume after a whole loop; non-loop completion; canceled decoder and
audio-start promises; and actual oscillator scheduling for quarter-note count-in
followed by selected eighth-note rhythm events.

Desktop and 375-pixel mobile screenshots were captured and visually inspected.
The browser suite checks mobile horizontal overflow. Artifacts are local and
ignored by git: `artifacts/guitarflow-desktop.png`,
`artifacts/guitarflow-mobile.png` and `artifacts/playwright-report/`.

Microphone tests used generated guitar-like audio, not a physical guitar or a
human performance. The tests do not establish the research plan's real-world
accuracy or audible drift targets.

## Remaining research

Real guitar recordings across devices and later-session evaluation are still
needed to measure onset precision/recall, timing errors, chord confusion and
decision delay. Browser/synthetic tests cannot establish those results.

Live tempo following, exact stroke direction, popular-song arrangements,
and comparison against Basic Pitch are future work tracked in Beads.
