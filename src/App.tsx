import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  Check,
  ChevronRight,
  CircleStop,
  Guitar,
  Headphones,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ARRANGEMENTS, getCompatibleArrangements } from "./core/arrangements";
import { PRESET_PATTERNS, validatePattern } from "./core/patterns";
import { generateDemoAudio, analyzeRhythm } from "./core/audio";
import { getPlaybackPosition } from "./core/transport";
import { closeAudioContext } from "./core/audio-context";
import {
  CHORD_NAMES,
  type StrumPattern,
  type Stroke,
  type ChordName,
} from "./core/types";
import { ChordDiagram } from "./components/ChordDiagram";
import { useAudio } from "./hooks/useAudio";
import { useTransport } from "./hooks/useTransport";
import { NotePractice } from "./components/NotePractice";
const STORAGE_KEY = "guitarflow.pattern.v1";
function restore(): StrumPattern {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const candidate: unknown = JSON.parse(raw);
      if (validatePattern(candidate))
        return {
          ...candidate,
          bpm: Math.min(180, candidate.bpm),
        } as StrumPattern;
    }
  } catch {
    /* storage unavailable or malformed */
  }
  return PRESET_PATTERNS[0];
}
const strokes: (Stroke | null)[] = [null, "unknown", "down", "up", "mute"];
const labels = ["1", "&", "2", "&", "3", "&", "4", "&"];
export default function App() {
  const [pattern, setPattern] = useState<StrumPattern>(restore);
  const [bpm, setBpm] = useState(pattern.bpm);
  const [confirmed, setConfirmed] = useState(true);
  const [saved, setSaved] = useState("");
  const [known, setKnown] = useState<ChordName[]>([...CHORD_NAMES]);
  const [selectedId, setSelectedId] = useState(ARRANGEMENTS[0].id);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryKind, setLibraryKind] = useState("all");
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(false);
  const audio = useAudio();
  const selected =
    ARRANGEMENTS.find((a) => a.id === selectedId) ?? ARRANGEMENTS[0];
  const compatible = getCompatibleArrangements(pattern, known);
  const visibleArrangements = compatible.filter((arrangement) => {
    const matchesKind =
      libraryKind === "all" ||
      (libraryKind === "songs" ? !!arrangement.song : !arrangement.song);
    const searchText = `${arrangement.title} ${arrangement.song?.artist ?? ""}`;
    return (
      matchesKind &&
      searchText.toLowerCase().includes(libraryQuery.trim().toLowerCase())
    );
  });
  const length = selected.chords.reduce((n, c) => n + c.beats, 0);
  const transport = useTransport(bpm, loop, length, muted, pattern);
  const position = getPlaybackPosition(
    selected,
    Math.max(0, transport.beat),
    loop,
  );
  const hasCompatibleSelection = compatible.some((a) => a.id === selectedId);
  const previewContext = useRef<AudioContext | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopPreview = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    closeAudioContext(previewContext.current);
    previewContext.current = null;
    setPreviewing(false);
  };
  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      closeAudioContext(previewContext.current);
    },
    [],
  );
  useEffect(() => {
    if (audio.result) {
      setPattern(audio.result.pattern);
      setBpm(audio.result.pattern.bpm);
      setConfirmed(false);
      setSaved("");
    }
  }, [audio.result]);
  const editStep = (index: number) => {
    setSaved("");
    setConfirmed(false);
    const existing = pattern.events.find((e) => e.beat === index / 2);
    const next =
      strokes[
        (strokes.indexOf(existing?.direction ?? null) + 1) % strokes.length
      ];
    setPattern({
      ...pattern,
      source: "edited",
      events: [
        ...pattern.events.filter((e) => e.beat !== index / 2),
        ...(next
          ? [{ beat: index / 2, accent: index % 2 ? 0.7 : 1, direction: next }]
          : []),
      ].sort((a, b) => a.beat - b.beat),
    });
  };
  const replay = async () => {
    audio.stop();
    stopPreview();
    try {
      const ctx = new AudioContext();
      previewContext.current = ctx;
      await ctx.resume();
      if (previewContext.current !== ctx) return;
      setPreviewing(true);
      for (let bar = 0; bar < 2; bar++)
        for (const event of pattern.events) {
          const at =
            ctx.currentTime + 0.1 + ((bar * 4 + event.beat) * 60) / bpm;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = event.direction === "mute" ? 180 : 800;
          g.gain.setValueAtTime(0.12 * event.accent, at);
          g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(at);
          o.stop(at + 0.055);
        }
      previewTimer.current = setTimeout(stopPreview, 480000 / bpm + 300);
    } catch {
      setSaved("Pattern audio unavailable in this browser.");
    }
  };
  const choose = (id: string) => {
    transport.reset();
    audio.stop();
    stopPreview();
    setSelectedId(id);
  };
  const start = () => {
    if (!hasCompatibleSelection) return;
    audio.stop();
    stopPreview();
    void transport.start();
  };
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pattern, bpm }));
      setSaved("Pattern saved on this device.");
    } catch {
      setSaved(
        "Storage is unavailable. You can still practice with this pattern.",
      );
    }
  };
  return (
    <div className="app-shell">
      <header className="header">
        <a href="#" className="brand">
          <span className="brand-icon">
            <Guitar size={23} />
          </span>
          Guitar<span>Flow</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#practice">Practice</a>
          <a href="#notes">Single notes</a>
          <a href="#rhythm">Your rhythm</a>
          <a href="#library">Library</a>
        </nav>
        <span className="local-tag">
          <span />
          Local & private
        </span>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">YOUR PERSONAL PRACTICE STUDIO</div>
            <h1>
              Find your rhythm.
              <br />
              <span>Let the chords flow.</span>
            </h1>
            <p>Capture a strum, pick a progression, and stay in the moment.</p>
          </div>
          <div className="intro-note">
            <Headphones size={22} />
            <div>
              Plug in your headphones
              <span>Keep the click out of your microphone.</span>
            </div>
          </div>
        </div>
        <NotePractice
          estimate={audio.noteEstimate}
          listening={audio.listening && audio.listeningMode === "notes"}
          pending={audio.requesting && audio.listeningMode === "notes"}
          busy={
            audio.recording ||
            audio.analyzing ||
            previewing ||
            (audio.requesting && audio.listeningMode !== "notes")
          }
          error={audio.errorMode === "notes" ? audio.error : ""}
          onListen={() => {
            transport.reset();
            stopPreview();
            void audio.mic(bpm, "notes");
          }}
          onStop={audio.stop}
        />
        <section
          id="practice"
          className="practice panel"
          aria-labelledby="practice-heading"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 / PLAY</div>
              <h2 id="practice-heading">{selected.title}</h2>
              <p>
                {selected.subtitle} · Key of {selected.key} · Standard tuning ·{" "}
                {selected.capo ? `Capo ${selected.capo}` : "No capo"}
              </p>
            </div>
            <span className="badge">{selected.difficulty}</span>
          </div>
          <div className="practice-layout">
            <div className="current-card">
              <div className="chord-label">
                PLAY NOW{" "}
                <span data-testid="playback-state" aria-live="polite">
                  {transport.playing
                    ? transport.beat < 0
                      ? "Count in"
                      : "Playing"
                    : transport.completed
                      ? "Completed"
                      : transport.paused
                        ? "Paused"
                        : "Ready"}
                </span>
              </div>
              <div className="chord-content">
                <div>
                  <div
                    className="current-chord"
                    data-testid="current-chord"
                    aria-live="polite"
                  >
                    {position.current.chord}
                  </div>
                  <p>
                    {transport.beat < 0
                      ? `Start in ${Math.ceil(-transport.beat)} beats`
                      : `${Math.max(0, Math.ceil(position.beatsUntilChange))} beats until change`}
                  </p>
                </div>
                <ChordDiagram chord={position.current.chord} />
              </div>
              <div
                className="beat-lights"
                aria-label={`Beat ${Math.floor(position.beatInBar) + 1} of 4`}
              >
                {[0, 1, 2, 3].map((b) => (
                  <span
                    key={b}
                    className={
                      transport.playing &&
                      transport.beat >= 0 &&
                      Math.floor(position.beatInBar) === b
                        ? "active"
                        : ""
                    }
                  >
                    {b + 1}
                  </span>
                ))}
              </div>
            </div>
            <div className="next-card">
              <div className="chord-label">
                UP NEXT <ChevronRight size={16} />
              </div>
              <div className="next-chord" data-testid="next-chord">
                {position.next.chord}
              </div>
              <ChordDiagram chord={position.next.chord} />
            </div>
          </div>
          {selected.song && (
            <div className="song-details">
              <p>
                <strong>
                  {selected.song.artist} · Simplified acoustic practice loop
                </strong>
              </p>
              <p>{selected.song.practiceNotes}</p>
              <a
                href={selected.song.lessonUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open song lesson (new tab)
              </a>
            </div>
          )}
          <div className="progression" aria-label="Chord progression">
            {selected.chords.map((c, i) => (
              <span
                key={i}
                className={position.chordIndex === i ? "active" : ""}
              >
                {c.chord}
                <small>{c.beats} beats</small>
              </span>
            ))}
          </div>
          <div className="transport">
            <button
              className="primary"
              disabled={
                transport.starting ||
                !confirmed ||
                !pattern.events.length ||
                audio.recording ||
                audio.analyzing ||
                !hasCompatibleSelection
              }
              onClick={transport.playing ? transport.pause : start}
            >
              {transport.playing ? <Pause size={17} /> : <Play size={17} />}
              {transport.playing
                ? "Pause"
                : transport.paused
                  ? "Resume"
                  : "Start practice"}
            </button>
            <button
              className="icon-button"
              aria-label="Restart"
              onClick={transport.restart}
            >
              <RotateCcw size={18} />
            </button>
            <div className="tempo-control">
              <label htmlFor="tempo">
                Tempo{" "}
                <strong>
                  {bpm} <small>BPM</small>
                </strong>
              </label>
              <input
                id="tempo"
                type="range"
                min="40"
                max="180"
                value={bpm}
                disabled={
                  transport.playing ||
                  transport.starting ||
                  audio.recording ||
                  previewing ||
                  audio.analyzing
                }
                onChange={(e) => {
                  setBpm(Number(e.target.value));
                  transport.reset();
                }}
              />
            </div>
            <label className="check-control">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
              />
              Loop
            </label>
            <button
              className="icon-button"
              aria-label={muted ? "Unmute metronome" : "Mute metronome"}
              aria-pressed={muted}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
          </div>
          {!hasCompatibleSelection && (
            <p className="hint">
              Choose a compatible exercise from the library before starting
              practice.
            </p>
          )}
          <p className="hint">
            Rhythm guide clicks follow your selected pattern after a 4-beat
            count-in. Practice stays at a fixed tempo. Pause to change tempo.
            Switching away from this tab pauses practice. Live tempo following
            is a future feature.
          </p>
          <div className="listen-row">
            <button
              className="quiet-button"
              disabled={audio.recording || audio.analyzing || audio.requesting}
              onClick={() => {
                if (audio.listening && audio.listeningMode === "chords")
                  audio.stop();
                else void audio.mic(bpm, "listen");
              }}
            >
              <Mic size={15} />
              {audio.listening && audio.listeningMode === "chords"
                ? "Stop listening"
                : "Listen to my chords"}
            </button>
            <span>
              {audio.listening && audio.listeningMode === "chords"
                ? audio.estimate?.chord
                  ? `Heard ${audio.estimate.chord} · ${Math.round(audio.estimate.confidence * 100)}% confidence${audio.estimate.chord === position.current.chord ? " · Matches current chord" : ""}`
                  : "Listening · chord unclear"
                : "Experimental note-energy matching. Chord cues stay on the clock."}
            </span>
          </div>
          {transport.error && (
            <p role="alert" className="error">
              {transport.error}
            </p>
          )}
        </section>
        <div className="lower-grid">
          <section
            id="rhythm"
            className="panel rhythm"
            aria-labelledby="rhythm-heading"
          >
            <div className="section-heading">
              <div>
                <div className="eyebrow">02 / CAPTURE</div>
                <h2 id="rhythm-heading">Your rhythm</h2>
              </div>
              <AudioLines className="muted-icon" size={25} />
            </div>
            <p>
              Record four bars on one chord. We detect timing; you choose the
              stroke directions.
            </p>
            <div className="capture-buttons">
              <button
                disabled={
                  transport.playing ||
                  transport.starting ||
                  previewing ||
                  audio.analyzing
                }
                onClick={() =>
                  audio.recording ? audio.stop() : void audio.mic(bpm, "record")
                }
              >
                {audio.recording ? <CircleStop size={16} /> : <Mic size={16} />}
                {audio.recording ? "Cancel recording" : "Record pattern"}
              </button>
              <label
                className={`upload-button ${transport.playing || transport.starting || audio.recording || previewing || audio.analyzing ? "disabled" : ""}`}
              >
                <Upload size={16} />
                Upload audio
                <input
                  aria-label="Upload audio"
                  type="file"
                  accept="audio/*"
                  disabled={
                    transport.playing ||
                    transport.starting ||
                    audio.recording ||
                    previewing ||
                    audio.analyzing
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void audio.upload(file, bpm);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="capture-note">
              4-beat visual count-in · Headphones recommended · Max 60s / 20 MB
            </div>
            <button
              className="text-button"
              disabled={
                transport.playing ||
                transport.starting ||
                audio.recording ||
                previewing ||
                audio.analyzing
              }
              onClick={() => {
                audio.clear();
                audio.setResult(
                  analyzeRhythm(generateDemoAudio(44100, bpm), 44100, bpm),
                );
              }}
            >
              Try demo recording <ChevronRight size={14} />
            </button>
            {audio.status && (
              <p role="status" className="record-status">
                {audio.status}
              </p>
            )}
            {audio.error && audio.errorMode !== "notes" && (
              <p role="alert" className="error">
                {audio.error}
              </p>
            )}
            <div className="pattern-heading">
              <label htmlFor="preset">Pattern</label>
              <select
                id="preset"
                aria-label="Pattern preset"
                disabled={
                  transport.playing ||
                  transport.starting ||
                  audio.recording ||
                  previewing ||
                  audio.analyzing
                }
                value={
                  PRESET_PATTERNS.some((p) => p.id === pattern.id) &&
                  pattern.source === "preset"
                    ? pattern.id
                    : ""
                }
                onChange={(e) => {
                  const p = PRESET_PATTERNS.find(
                    (p) => p.id === e.target.value,
                  );
                  if (p) {
                    setPattern(p);
                    setConfirmed(true);
                    stopPreview();
                    audio.clear();
                    setSaved("");
                  }
                }}
              >
                <option value="" disabled>
                  Custom rhythm
                </option>
                {PRESET_PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pattern-grid">
              {labels.map((label, i) => {
                const event = pattern.events.find((e) => e.beat === i / 2);
                return (
                  <div key={i}>
                    <span>{label}</span>
                    <button
                      data-testid={`pattern-step-${i}`}
                      disabled={
                        transport.playing ||
                        transport.starting ||
                        audio.recording ||
                        previewing ||
                        audio.analyzing
                      }
                      aria-label={`Strum ${i + 1}, beat ${i / 2 + 1}: ${event?.direction ?? "off"}`}
                      title="Cycle: off, detected, down, up, mute"
                      className={`${event ? "filled" : ""} ${transport.playing && transport.beat >= 0 && Math.floor((transport.beat % 4) * 2) === i ? "live-step" : ""}`}
                      onClick={() => editStep(i)}
                    >
                      {event?.direction === "down" ? (
                        <ArrowDown size={21} />
                      ) : event?.direction === "up" ? (
                        <ArrowUp size={21} />
                      ) : event?.direction === "mute" ? (
                        <X size={18} />
                      ) : event ? (
                        <span className="strum-dot" />
                      ) : (
                        <span className="off-mark">–</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="hint">
              Tap to cycle: off → detected → down → up → mute. One bar of eighth
              notes.
            </p>
            {audio.result && (
              <div className="analysis">
                <span>
                  {Math.round(audio.result.confidence * 100)}% timing confidence
                  · {audio.result.onsetTimes.length} detected strums
                </span>
                {audio.result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            <div className="pattern-actions">
              <button
                disabled={
                  !pattern.events.length ||
                  transport.playing ||
                  transport.starting ||
                  audio.recording ||
                  audio.analyzing
                }
                onClick={previewing ? stopPreview : () => void replay()}
              >
                <Play size={15} />
                {previewing ? "Stop replay" : "Replay pattern"}
              </button>
              <button
                className="confirm-button"
                disabled={
                  !pattern.events.length ||
                  audio.recording ||
                  transport.playing ||
                  transport.starting ||
                  audio.analyzing ||
                  previewing
                }
                onClick={() => setConfirmed(true)}
              >
                <Check size={15} />
                {confirmed ? "Pattern confirmed" : "Confirm pattern"}
              </button>
              <button
                className="text-button"
                disabled={
                  transport.starting || !confirmed || !pattern.events.length
                }
                onClick={save}
              >
                Save pattern
              </button>
            </div>
            {!confirmed && (
              <p className="hint">
                Review the detected timing and confirm your pattern before
                practicing.
              </p>
            )}
            {saved && (
              <p role="status" className="hint">
                {saved}
              </p>
            )}
          </section>
          <section
            id="library"
            className="panel library"
            aria-labelledby="library-heading"
          >
            <div className="section-heading">
              <div>
                <div className="eyebrow">03 / EXPLORE</div>
                <h2 id="library-heading">Pick your flow</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Shuffle compatible exercise"
                disabled={visibleArrangements.length === 0}
                onClick={() => {
                  const alternatives = visibleArrangements.filter(
                    (a) => a.id !== selectedId,
                  );
                  const pool = alternatives.length
                    ? alternatives
                    : visibleArrangements;
                  if (pool.length)
                    choose(pool[Math.floor(Math.random() * pool.length)].id);
                }}
              >
                <Shuffle size={19} />
              </button>
            </div>
            <p>
              Familiar acoustic songs and original exercises. Song loops use
              simplified chords and practice timing. Choose the chords you know.
            </p>
            <div className="library-controls">
              <label htmlFor="library-search">Search title or artist</label>
              <input
                id="library-search"
                type="search"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Try Nirvana or Pink Floyd"
              />
              <label htmlFor="library-kind">Show</label>
              <select
                id="library-kind"
                value={libraryKind}
                onChange={(event) => setLibraryKind(event.target.value)}
              >
                <option value="all">Songs and exercises</option>
                <option value="songs">Popular songs</option>
                <option value="originals">Original exercises</option>
              </select>
            </div>
            <fieldset className="known-chords">
              <legend>Known chords</legend>
              {CHORD_NAMES.map((c) => (
                <label key={c} className={known.includes(c) ? "selected" : ""}>
                  <input
                    type="checkbox"
                    checked={known.includes(c)}
                    onChange={(e) => {
                      transport.reset();
                      audio.stop();
                      setKnown(
                        e.target.checked
                          ? [...known, c]
                          : known.filter((k) => k !== c),
                      );
                    }}
                  />
                  {c}
                </label>
              ))}
            </fieldset>
            <div className="exercise-list">
              {visibleArrangements.length === 0 ? (
                <div className="empty">
                  {compatible.length === 0
                    ? "No matching exercises yet. Select more known chords."
                    : "No songs or exercises match this search. Try another title, artist or library filter."}
                </div>
              ) : (
                visibleArrangements.map((a) => (
                  <button
                    key={a.id}
                    aria-pressed={a.id === selectedId}
                    className={`exercise ${a.id === selectedId ? "selected" : ""}`}
                    onClick={() => choose(a.id)}
                  >
                    <span className="exercise-number">
                      {String(ARRANGEMENTS.indexOf(a) + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{a.title}</strong>
                      <small>
                        {a.song && (
                          <span className="song-artist">
                            {a.song.artist} · Simplified loop
                          </span>
                        )}
                        {a.chords.map((c) => c.chord).join(" · ")}
                        <span>{a.tags.join(" / ")}</span>
                      </small>
                    </span>
                    {a.id === selectedId ? (
                      <span className="selected-dot" />
                    ) : (
                      <ChevronRight size={17} />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="library-footer">
              <Guitar size={17} />
              <span>
                Song practice loops and original progressions · Audio stays
                local
              </span>
            </div>
          </section>
        </div>
        <footer>
          <span>GuitarFlow / First sessions</span>
          <span>
            Audio stays in your browser. Only your saved pattern is stored.
          </span>
        </footer>
      </main>
    </div>
  );
}
