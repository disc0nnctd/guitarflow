# Research baseline

Reviewed: 2026-10-04. Sources describe advertised features and published work;
no products, libraries or recognition accuracy were tested during this review.

## Existing products

| Product | Relevant documented behavior | Implication |
| --- | --- | --- |
| [GuitarFlow: Guitar Chords](https://apps.apple.com/us/app/guitarflow-guitar-chords/id6788962234) | Current/next chord diagrams, tempo-controlled progressions; explicitly no microphone | Name overlap and an existing cue-interface reference |
| [Yousician](https://yousician.com/guitar) | Interactive guitar learning and real-time feedback | Recognition is practical; [tuning, noise and effects affect recognition](https://support.yousician.com/hc/en-us/articles/201576782-Guitar-sound-recognition-issues) |
| [Simply Guitar PLAY](https://piano-help.hellosimply.com/en/articles/14588852-what-is-play-in-simply-guitar) | Songs, chord help and example strumming patterns | Close practice experience; recorded-user-pattern matching was not established |
| [Chordify](https://chordify.net/en) | Song-synchronized chords and discovery by known chords | Reference for discovery; playback synchronization does not establish live following |
| [Moises](https://moises.ai/features/chord-finder/) | Song chord extraction, diagrams, transposition and chart correction | Reference for arrangement preparation |

The complete proposed workflow was not verified in a single product. This is
not an exhaustive market review or a claim that no competitor exists.

## Reusable resources

| Resource | Role | Limitation |
| --- | --- | --- |
| [librosa onset tools](https://librosa.org/doc/0.11.0/onset.html) and [chroma features](https://librosa.org/doc/0.11.0/generated/librosa.feature.chroma_stft.html) | Rhythm and chord-template experiments | Components rather than a live assistant |
| [Spotify Basic Pitch](https://github.com/spotify/basic-pitch) | Simultaneous note estimates for chord grouping | Apache-2.0; validate window and inference delay |
| [madmom](https://github.com/CPJKU/madmom) | Beat tracking and some online processing | Source and model licenses differ; pretrained models carry noncommercial restrictions |
| [GuitarSet](https://guitarset.weebly.com/) | Notes, chords, beats and guitar-string annotations | 360 short excerpts from 6 players; no explicit stroke-direction labels |
| [Klangio strumming dataset](https://github.com/Klangio/KLANGIO-GST-MM-T) | Synchronized guitar audio, motion and up/down labels | 10 examples, 5 minutes; direction baseline depends on motion |
| [Yousician rhythm paper](https://arxiv.org/html/2510.05756v1) and [companion examples](https://github.com/YousicianGit/rhythmic-pattern-transcription) | Strum detection and rhythmic-pattern decoding | Main 931-recording/410-song dataset is proprietary; public examples do not establish full training-data availability |
| [Browser AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) | Audio processing separate from screen updates | Device capture latency still needs measurement |

## Working conclusions

- Current/next chord display is straightforward when arrangement timing exists.
- Solo-guitar rhythmic timing is a more manageable starting point than extracting
  a guitar pattern from a complete song mix.
- Exact stroke direction, pause recovery and live song position are substantial
  research risks and should be measured separately.
- Expected-chord checking narrows candidates; ambiguous sound still needs an
  unknown result rather than forced certainty.
- A rhythm can suit many songs. Song suggestions require arrangements with
  chord durations, meter, difficulty and compatibility tags.
- New training is premature. Compare existing methods using recordings from
  the intended guitar and microphone first.
