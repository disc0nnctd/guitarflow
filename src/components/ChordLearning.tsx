import { useEffect, useRef, useState } from "react";
import { CircleStop, Mic, RotateCcw } from "lucide-react";
import type { Arrangement, ChordEstimate } from "../core/types";
import { createChordTracker, updateChordTracker } from "../core/chord-practice";
import { ChordDiagram } from "./ChordDiagram";
import "./chord-learning.css";

interface ChordLearningProps {
  arrangement: Arrangement;
  estimate: ChordEstimate | null;
  listening: boolean;
  pending: boolean;
  busy: boolean;
  error: string;
  onListen: () => void;
  onStop: () => void;
}
export function ChordLearning({
  arrangement,
  estimate,
  listening,
  pending,
  busy,
  error,
  onListen,
  onStop,
}: ChordLearningProps) {
  const [index, setIndex] = useState(0);
  const tracker = useRef(createChordTracker());
  const blockedEstimate = useRef(estimate);
  const wasListening = useRef(listening);
  const previousArrangement = useRef(arrangement.id);
  const complete = index >= arrangement.chords.length;
  const current = arrangement.chords[index];
  const next = arrangement.chords[index + 1];
  const resetTracker = () => {
    tracker.current = createChordTracker();
    blockedEstimate.current = estimate;
  };
  useEffect(() => {
    if (previousArrangement.current !== arrangement.id) {
      previousArrangement.current = arrangement.id;
      setIndex(0);
      tracker.current = createChordTracker();
      blockedEstimate.current = estimate;
      return;
    }
    if (wasListening.current !== listening) {
      wasListening.current = listening;
      tracker.current = createChordTracker();
      blockedEstimate.current = estimate;
      return;
    }
    if (!listening || !current || estimate === blockedEstimate.current) return;
    const result = updateChordTracker(
      tracker.current,
      estimate,
      current.chord,
      performance.now(),
    );
    tracker.current = result.state;
    if (result.matched) setIndex((step) => step + 1);
  }, [arrangement.id, current, estimate, listening]);
  const heard =
    listening &&
    estimate !== blockedEstimate.current &&
    estimate &&
    estimate.confidence >= 0.65 &&
    estimate.rms >= 0.008
      ? estimate.chord
      : null;
  return (
    <section
      id="learn-chords"
      className="chord-learning"
      aria-labelledby="chord-lesson-title"
    >
      <div className="chord-lesson-heading">
        <div>
          <p className="chord-lesson-eyebrow">FOLLOW YOUR PLAYING</p>
          <h2 id="chord-lesson-title">{arrangement.title} chord lesson</h2>
          <p>Learn this simplified chord loop at your own pace.</p>
        </div>
        <button
          type="button"
          disabled={!pending && !listening && busy}
          onClick={pending || listening ? onStop : onListen}
        >
          {listening ? <CircleStop size={18} /> : <Mic size={18} />}
          {pending
            ? "Cancel chord microphone request"
            : listening
              ? "Stop chord lesson"
              : "Listen for chord changes"}
        </button>
      </div>
      {error && (
        <p className="chord-lesson-error" role="alert">
          {error}
        </p>
      )}
      <div className="chord-lesson-cues">
        <div
          className="chord-lesson-cue current"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>PLAY NOW</span>
          <strong>{complete ? "Complete!" : current.chord}</strong>
          <small>
            {complete
              ? "Restart or choose another song"
              : `Chord ${index + 1} of ${arrangement.chords.length}`}
          </small>
          {current && <ChordDiagram chord={current.chord} />}
        </div>
        <div className="chord-lesson-cue">
          <span>UP NEXT</span>
          <strong>{next?.chord ?? "—"}</strong>
          <small>
            {complete
              ? "Lesson finished"
              : "The correct chord advances your cue"}
          </small>
          {next && <ChordDiagram chord={next.chord} />}
        </div>
        <div
          className="chord-lesson-cue heard"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>HEARD</span>
          <strong>{heard ?? "—"}</strong>
          <small>
            {!listening
              ? "Microphone stopped"
              : heard
                ? `Detector confidence ${Math.round(estimate!.confidence * 100)}%`
                : "Strum a chord clearly"}
          </small>
        </div>
      </div>
      <p className="chord-lesson-help">
        Strum all the unmuted strings. Hold the chord briefly; mute for about a
        second between repeated chords. This lesson waits for your playing,
        without a timer.
      </p>
      <p className="chord-lesson-help">
        Chord recognition is experimental. Detector confidence is a matching
        score; it does not guarantee the chord was played correctly.
      </p>
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          resetTracker();
        }}
      >
        <RotateCcw size={16} />
        Restart chord lesson
      </button>
      <div
        className="chord-lesson-sequence-scroll"
        role="region"
        aria-label="Chord lesson sequence"
        tabIndex={0}
      >
        <ol className="chord-lesson-sequence">
          {arrangement.chords.map((step, stepIndex) => (
            <li key={stepIndex}>
              <button
                type="button"
                aria-current={stepIndex === index ? "step" : undefined}
                aria-label={`Practise from chord ${stepIndex + 1}: ${step.chord}`}
                onClick={() => {
                  setIndex(stepIndex);
                  resetTracker();
                }}
              >
                <span>{stepIndex + 1}</span>
                <strong>{step.chord}</strong>
                <small>{step.section}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
