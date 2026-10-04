import { useEffect, useRef, useState } from "react";
import { Mic, CircleStop, RotateCcw } from "lucide-react";
import { midiLabel, type PitchEstimate } from "../core/pitch";
import {
  createNoteTracker,
  NOTE_EXERCISES,
  updateNoteTracker,
} from "../core/note-practice";
import { GuitarNeck } from "./GuitarNeck";
import "./notes.css";

interface NotePracticeProps {
  estimate: PitchEstimate | null;
  listening: boolean;
  pending: boolean;
  busy: boolean;
  error: string;
  onListen: () => void;
  onStop: () => void;
}
export function NotePractice({
  estimate,
  listening,
  pending,
  busy,
  error,
  onListen,
  onStop,
}: NotePracticeProps) {
  const [exerciseId, setExerciseId] = useState(NOTE_EXERCISES[0].id);
  const [selectedMidi, setSelectedMidi] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const tracker = useRef(createNoteTracker());
  const blockedEstimate = useRef(estimate);
  const wasListening = useRef(false);
  const exercise = NOTE_EXERCISES.find((entry) => entry.id === exerciseId)!;
  const notes = selectedMidi === null ? exercise.notes : [selectedMidi];
  const complete = index >= notes.length;
  const targetMidi = complete ? null : notes[index];
  const nextMidi = notes[index + 1] ?? null;
  const reset = () => {
    setIndex(0);
    tracker.current = createNoteTracker();
    blockedEstimate.current = estimate;
  };
  useEffect(() => {
    if (wasListening.current !== listening) {
      wasListening.current = listening;
      tracker.current = createNoteTracker();
      blockedEstimate.current = estimate;
      return;
    }
    if (
      !listening ||
      targetMidi === null ||
      estimate === blockedEstimate.current
    )
      return;
    const result = updateNoteTracker(
      tracker.current,
      estimate,
      targetMidi,
      performance.now(),
    );
    tracker.current = result.state;
    if (result.matched) setIndex((current) => current + 1);
  }, [estimate, listening, targetMidi]);
  const heardMidi =
    listening &&
    estimate !== blockedEstimate.current &&
    estimate &&
    estimate.confidence >= 0.85 &&
    estimate.rms >= 0.008
      ? estimate.midi
      : null;
  const cents = heardMidi !== null ? estimate?.cents : null;
  const tuning =
    cents === null || cents === undefined
      ? "Play one string clearly"
      : Math.abs(cents) <= 10
        ? "In tune"
        : `${Math.round(Math.abs(cents))} cents ${cents > 0 ? "sharp" : "flat"}`;
  return (
    <section
      id="notes"
      className="note-practice"
      aria-labelledby="note-practice-title"
    >
      <div className="notes-heading">
        <div>
          <p className="notes-eyebrow">ONE NOTE AT A TIME</p>
          <h2 id="note-practice-title">Explore the guitar neck</h2>
          <p>Play a single note. Hear it, find it, then follow the next cue.</p>
        </div>
        <button
          type="button"
          className="note-listen"
          disabled={!pending && !listening && busy}
          onClick={listening || pending ? onStop : onListen}
        >
          {listening ? <CircleStop size={18} /> : <Mic size={18} />}
          {pending
            ? "Cancel microphone request"
            : listening
              ? "Stop note listening"
              : "Listen to single notes"}
        </button>
      </div>
      {error && (
        <p className="notes-error" role="alert">
          {error}
        </p>
      )}
      <div className="note-controls">
        <label htmlFor="note-exercise">Note exercise</label>
        <select
          id="note-exercise"
          value={selectedMidi === null ? exerciseId : "single"}
          onChange={(event) => {
            if (event.target.value !== "single") {
              setExerciseId(event.target.value);
              setSelectedMidi(null);
              reset();
            }
          }}
        >
          {NOTE_EXERCISES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
          {selectedMidi !== null && (
            <option value="single">
              Selected note: {midiLabel(selectedMidi)}
            </option>
          )}
        </select>
        <button type="button" onClick={reset}>
          <RotateCcw size={16} />
          Restart note exercise
        </button>
      </div>
      <p className="notes-explanation">
        {selectedMidi === null
          ? exercise.description
          : "Play the selected note. Choose another fret to change your target."}
      </p>
      <div className="note-cues">
        <div className="note-cue current">
          <span>PLAY NOW</span>
          <strong>{complete ? "Complete!" : midiLabel(targetMidi!)}</strong>
          <small>
            {complete
              ? "Restart or choose another exercise"
              : `Note ${index + 1} of ${notes.length}`}
          </small>
        </div>
        <div className="note-cue">
          <span>UP NEXT</span>
          <strong>{nextMidi === null ? "—" : midiLabel(nextMidi)}</strong>
          <small>
            {complete
              ? "Exercise finished"
              : "The correct note advances your cue"}
          </small>
        </div>
        <div className="note-cue heard" aria-live="polite" aria-atomic="true">
          <span>HEARD</span>
          <strong>{heardMidi === null ? "—" : midiLabel(heardMidi)}</strong>
          <small>{listening ? tuning : "Microphone stopped"}</small>
        </div>
      </div>
      <p className="notes-explanation">
        Hold the correct note briefly to advance. Mute briefly between repeated
        notes. Match the octave as well as the note.
      </p>
      <GuitarNeck
        targetMidi={targetMidi}
        heardMidi={heardMidi}
        onSelect={(midi) => {
          setSelectedMidi(midi);
          reset();
        }}
      />
      <p className="neck-legend">
        <span className="legend-target">● Target note</span>
        <span className="legend-heard">● Heard note</span>
        <span>Click a fret to practise its note.</span>
      </p>
      <p className="notes-explanation">
        Audio identifies pitch, but the same pitch can be played on several
        strings. The green positions are possibilities; the microphone cannot
        identify the exact string or fret.
      </p>
    </section>
  );
}
