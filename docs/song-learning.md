# Self-paced song learning

Each popular-song loop has two learning actions beside its lesson link.
Learn fingerstyle activates a note exercise for the selected song; Learn song
chords opens the chord lesson. Original chord exercises also support chord
lessons. Fixed-tempo practice remains available separately.

## Fingerstyle accompaniment

The sequence builder uses the standard chord fingering to choose the lowest
playable bass string and then strings 3, 2, 1, 2, 3, 2, 1. Each chord receives
eight eighth-note teaching positions. These are original accompaniment
patterns over the simplified song loops, rather than transcriptions of the
recordings. Current catalog bars are all four beats long.

Every step specifies pitch/octave, chord, string, fret and picking finger.
Thumb plays the bass; index, middle and ring fingers play strings 3, 2 and 1.
The neck highlights a suggested fingering while retaining other positions for
the same pitch. The microphone cannot determine the string actually played.
An accessible sequence lets the learner restart from any step. On small
screens it scrolls horizontally and follows the active step.

The note exercise checks one string at a time. Mute other strings while using
microphone validation; overlapping ringing notes can confuse the monophonic
detector. Timing is self-paced, and position advances only after a confident
expected pitch/octave is stable within the existing tuning tolerance.

## Chord lesson

The chord lesson shows the current/next chord diagrams and detected chord.
It requires the exact expected chord, a matching score of at least 0.65 and
RMS audio level of at least 0.008, sustained across updates for 600 ms.
The detector's score is not a measured probability of correct playing.
Wrong, unclear or quiet input cannot advance the sequence.

A sustained chord cannot satisfy successive identical targets. Measured
quiet for at least 150 ms or a reliable different chord rearms matching.
Missing input does not count as quiet. Effective mute time is longer than
150 ms because the analyser window must clear and capture updates are spaced
300 ms apart. Restart, stop and song changes clear the gate and cached samples.
Chord recognition retains the existing limited open-chord vocabulary and
experimental accuracy limits.

## Verification

Generation tests check each catalog song, exact fingering-to-pitch mapping,
muted bass skipping, picking-finger labels, valid pitch ranges and sequence
progression. Chord gate tests check stability, uncertainty, wrong chords,
consecutive identical targets and measured release.

Browser checks substitute only the microphone source with real Web Audio
MediaStreams. They cover song activation, note progression, string/fret cues,
keyboard step selection, changing songs, mobile overflow, wrong-chord waiting,
correct-chord advancement, completion, repeated-chord release, stop/restart,
permission denial and switching learning modes. Live HTTPS smoke testing checks
the same interfaces through the Tailscale deployment.

The completed check passes 89 unit tests and 30 Chrome browser scenarios,
alongside TypeScript validation and the production build. Live HTTPS phone-size
screenshots confirm the note sequence, suggested neck position and chord lesson.
