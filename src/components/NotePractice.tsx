import { useEffect, useRef, useState } from "react";
import { Mic, CircleStop, RotateCcw } from "lucide-react";
import { midiLabel, type PitchEstimate } from "../core/pitch";
import {
  createNoteTracker,
  NOTE_EXERCISES,
  updateNoteTracker,
  type NoteExercise,
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
  songExercise?: NoteExercise | null;
  songRequest?: number;
}
export function NotePractice({
  estimate,
  listening,
  pending,
  busy,
  error,
  onListen,
  onStop,
  songExercise,
  songRequest,
}: NotePracticeProps) {
  const [exerciseId, setExerciseId] = useState(NOTE_EXERCISES[0].id);
  const [selectedMidi, setSelectedMidi] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const tracker = useRef(createNoteTracker());
  const blockedEstimate = useRef(estimate);
  const wasListening = useRef(false);
  const exercise =
    (songExercise?.id === exerciseId ? songExercise : null) ??
    NOTE_EXERCISES.find((entry) => entry.id === exerciseId) ??
    NOTE_EXERCISES[0];
  const notes = selectedMidi === null ? exercise.notes : [selectedMidi];
  const complete = index >= notes.length;
  const targetMidi = complete ? null : notes[index];
  const nextMidi = notes[index + 1] ?? null;
  const targetStep =
    selectedMidi === null ? exercise.steps?.[index] : undefined;
  const latestEstimate = useRef(estimate);
  latestEstimate.current = estimate;
  const previousSong = useRef(songExercise);
  const previousRequest = useRef(songRequest);
  const sequenceRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const region = sequenceRegion.current;
    const active = region?.querySelector<HTMLButtonElement>(
      '[aria-current="step"]',
    );
    if (!region || !active) return;
    const regionBounds = region.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (activeBounds.left < regionBounds.left)
      region.scrollLeft += activeBounds.left - regionBounds.left - 2;
    else if (activeBounds.right > regionBounds.right)
      region.scrollLeft += activeBounds.right - regionBounds.right + 2;
  }, [index, exerciseId, selectedMidi]);
  useEffect(() => {
    const requested = songRequest !== previousRequest.current;
    const changed = songExercise !== previousSong.current;
    const wasSongSelected =
      selectedMidi === null && previousSong.current?.id === exerciseId;
    previousRequest.current = songRequest;
    previousSong.current = songExercise;
    if (!requested && !(changed && wasSongSelected)) return;
    setExerciseId(songExercise?.id ?? NOTE_EXERCISES[0].id);
    setSelectedMidi(null);
    setIndex(0);
    tracker.current = createNoteTracker();
    blockedEstimate.current = latestEstimate.current;
  }, [songExercise, songRequest, exerciseId, selectedMidi]);
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
          {songExercise && (
            <optgroup label="Selected song">
              <option value={songExercise.id}>{songExercise.name}</option>
            </optgroup>
          )}
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
          {targetStep && (
            <small className="note-fingering">
              {targetStep.chord} chord · String {targetStep.string} ·{" "}
              {targetStep.fret === 0 ? "Open" : `Fret ${targetStep.fret}`}
              <br />
              Pick with {targetStep.finger}
            </small>
          )}
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
      {exercise.songId && selectedMidi === null && (
        <p className="notes-explanation">
          An original fingerpicking exercise over this song’s simplified chord
          loop. Mute the other strings and pick one note at a time; this is not
          the song’s signature melody.
        </p>
      )}
      <div
        ref={sequenceRegion}
        className="note-sequence-scroll"
        role="region"
        aria-label="Note sequence"
        tabIndex={0}
      >
        <ol className="note-sequence">
          {notes.map((midi, stepIndex) => {
            const step =
              selectedMidi === null ? exercise.steps?.[stepIndex] : undefined;
            return (
              <li key={stepIndex}>
                <button
                  type="button"
                  aria-current={stepIndex === index ? "step" : undefined}
                  aria-label={`Practise from note ${stepIndex + 1}: ${midiLabel(midi)}${step ? `, ${step.chord} chord, string ${step.string}, ${step.fret === 0 ? "open string" : `fret ${step.fret}`}, pick with ${step.finger}` : ""}`}
                  onClick={() => {
                    setIndex(stepIndex);
                    tracker.current = createNoteTracker();
                    blockedEstimate.current = estimate;
                  }}
                >
                  <span className="sequence-number">{stepIndex + 1}</span>
                  <strong>{midiLabel(midi)}</strong>
                  {step && (
                    <small>
                      {step.chord} · S{step.string} ·{" "}
                      {step.fret === 0 ? "Open" : `F${step.fret}`}
                      <br />
                      {step.finger}
                    </small>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <GuitarNeck
        targetMidi={targetMidi}
        heardMidi={heardMidi}
        targetPosition={targetStep}
        onSelect={(midi) => {
          setSelectedMidi(midi);
          reset();
        }}
      />
      <p className="neck-legend">
        <span className="legend-target">● Target note</span>
        <span className="legend-heard">● Heard note</span>
        {targetStep && (
          <span className="legend-suggested">◎ Suggested fingering</span>
        )}
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
