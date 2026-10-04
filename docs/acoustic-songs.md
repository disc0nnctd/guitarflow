# Acoustic song practice library

Reviewed and added on 2026-10-04. These selections suit an acoustic practice
session; that is a project recommendation, not a measured recognition result.
Each entry links to a checked guitar-teacher lesson. Lesson material is linked,
not copied into the app. No lyrics, tabs, recordings or signature melodies are
included.

| Song                              | Artist          | Practice focus                                                        | Lesson                                                                                                                        |
| --------------------------------- | --------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| About a Girl                      | Nirvana         | Two open-chord verse changes; a good first loop                       | [JustinGuitar](https://www.justinguitar.com/songs/nirvana-about-a-girl-chords-tabs-guitar-lesson-sg-078)                      |
| Something in the Way              | Nirvana         | Slow two-chord practice; standard-tuning transposed adaptation        | [JustinGuitar](https://www.justinguitar.com/songs/nirvana-something-in-the-way-chords-tabs-guitar-lesson-sg-181)              |
| Wish You Were Here                | Pink Floyd      | Simplified vocal-section changes; learn the acoustic intro separately | [JustinGuitar](https://www.justinguitar.com/songs/pink-floyd-wish-you-were-here-chords-tabs-guitar-lesson-st-301)             |
| Wonderwall                        | Oasis           | Plain open-chord verse adaptation; suspended shapes omitted           | [JustinGuitar](https://www.justinguitar.com/songs/oasis-wonderwall-chords-tabs-guitar-lesson-bs-805)                          |
| Zombie                            | The Cranberries | Four repeating open-chord changes                                     | [JustinGuitar](https://www.justinguitar.com/songs/the-cranberries-zombie-chords-tabs-guitar-lesson-sg-141)                    |
| Good Riddance (Time of Your Life) | Green Day       | Strummed changes using C instead of Cadd9                             | [JustinGuitar](https://www.justinguitar.com/songs/green-day-good-riddance-time-of-your-life-chords-tabs-guitar-lesson-sg-066) |
| Fast Car                          | Tracy Chapman   | Transposed strumming practice; signature fingerpicking omitted        | [JustinGuitar](https://www.justinguitar.com/songs/tracy-chapman-fast-car-chords-tabs-guitar-lesson-bs-802)                    |
| Knockin' on Heaven's Door         | Bob Dylan       | Alternating endings with Am and C                                     | [JustinGuitar](https://www.justinguitar.com/songs/bob-dylan-knockin-on-heaven-s-door-chords-tabs-guitar-lesson-sg-170)        |

## What plays in GuitarFlow

The app provides independently authored, short chord exercises related to each
song, with one four-beat practice bar per chord. They are deliberately simplified
loops rather than full-song charts. Use standard tuning and no capo for all
current entries; some are transposed or use simpler voicings than the recording.
The displayed key describes this app's adaptation. Tempo remains under the
player's control and the chosen strumming pattern supplies the rhythm guide.

Song cues retain the existing fixed-tempo behavior. Hearing a chord does not
advance a song cue; detection-driven advancement remains specific to single-note
exercises. Full song structures, signature picking patterns, capo-aware chord
recognition and synchronization to recordings are separate future features.

Search matches title or artist without case sensitivity. The library filter
switches between songs, originals and both. Known-chord filtering applies to
every required chord, and shuffle draws only from the currently visible results.
Filtering the library does not change a playing selection; removing a required
known chord stops practice and disables starting that incompatible selection.

## Verification

Catalog tests validate unique identifiers, complete metadata, supported
fingerings and known-chord filtering. Browser tests cover Nirvana selection and
actual cue advancement, Pink Floyd search/shuffle, missing-chord restrictions,
empty results, original-exercise filtering and mobile layout. The complete
suite also retains the existing rhythm, microphone and single-note scenarios.
