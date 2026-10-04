import { useEffect, useRef, useState } from "react";
import { patternEventsBetween } from "../core/transport";
import { closeAudioContext } from "../core/audio-context";
import type { StrumPattern } from "../core/types";
export function useTransport(
  bpm: number,
  loop: boolean,
  length: number,
  muted: boolean,
  pattern: StrumPattern,
) {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [starting, setStarting] = useState(false);
  const token = useRef(0);
  const ctx = useRef<AudioContext | null>(null);
  const saved = useRef(0);
  const origin = useRef(0);
  const scheduledGeneration = useRef(-1);
  const oscillators = useRef<OscillatorNode[]>([]);
  const muteRef = useRef(muted);
  muteRef.current = muted;
  const silence = () => {
    oscillators.current.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already ended */
      }
    });
    oscillators.current = [];
  };
  useEffect(() => {
    if (muted) silence();
  }, [muted]);
  const completed = !loop && beat >= length;
  const pause = () => {
    token.current++;
    setStarting(false);
    if (ctx.current) {
      saved.current = Math.max(
        -4,
        ((ctx.current.currentTime - origin.current) * bpm) / 60,
      );
      setBeat(saved.current);
    }
    silence();
    setPlaying(false);
  };
  const start = async (restart = false) => {
    const session = ++token.current;
    setStarting(true);
    try {
      if (!ctx.current || ctx.current.state === "closed")
        ctx.current = new AudioContext();
      await ctx.current.resume();
      if (token.current !== session) return;
      setStarting(false);
      if (restart || (!loop && saved.current >= length) || !started)
        saved.current = -4;
      origin.current =
        ctx.current.currentTime + 0.05 - (saved.current * 60) / bpm;
      setBeat(saved.current);
      setStarted(true);
      setPlaying(true);
      setGeneration((g) => g + 1);
      setError("");
    } catch {
      if (token.current !== session) return;
      setStarting(false);
      setError("Audio could not start. Try again in a supported browser.");
    }
  };
  const restart = () => {
    token.current++;
    setStarting(false);
    silence();
    saved.current = -4;
    setBeat(-4);
    setStarted(false);
    if (playing && ctx.current) {
      origin.current = ctx.current.currentTime + 240 / bpm;
      setStarted(true);
      setGeneration((g) => g + 1);
    }
  };
  useEffect(() => {
    if (!playing) return;
    // React may commit after the provisional start time under load. Anchor a
    // new session when its scheduler is ready so the first count-in survives.
    if (ctx.current && scheduledGeneration.current !== generation) {
      scheduledGeneration.current = generation;
      origin.current =
        ctx.current.currentTime + 0.05 - (saved.current * 60) / bpm;
    }
    let cursor = Math.max(
      saved.current,
      ctx.current
        ? ((ctx.current.currentTime - origin.current) * bpm) / 60
        : saved.current,
    );
    let frame: number;
    const update = () => {
      const context = ctx.current;
      if (!context) return;
      const elapsed = ((context.currentTime - origin.current) * bpm) / 60;
      setBeat(elapsed);
      if (!loop && elapsed >= length) {
        saved.current = length;
        silence();
        setPlaying(false);
        setBeat(length);
        return;
      }
      frame = requestAnimationFrame(update);
    };
    const schedule = () => {
      const context = ctx.current;
      if (!context) return;
      const horizon =
        ((context.currentTime + 0.12 - origin.current) * bpm) / 60;
      const events: { beat: number; accent: number; direction: string }[] = [];
      for (let tick = Math.ceil(cursor); tick < Math.min(0, horizon); tick++)
        events.push({
          beat: tick,
          accent: tick === -4 ? 1 : 0.7,
          direction: "countin",
        });
      events.push(
        ...patternEventsBetween(
          pattern,
          Math.max(0, cursor),
          Math.max(0, horizon),
        ),
      );
      for (const event of events) {
        const at = (event.beat * 60) / bpm + origin.current;
        if (
          at >= context.currentTime &&
          !muteRef.current &&
          (loop || event.beat < length)
        ) {
          const o = context.createOscillator();
          const gain = context.createGain();
          o.frequency.value =
            event.direction === "mute"
              ? 180
              : event.direction === "up"
                ? 850
                : event.accent >= 0.95
                  ? 1050
                  : 700;
          gain.gain.setValueAtTime(0.085 * event.accent, at);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.045);
          o.connect(gain);
          gain.connect(context.destination);
          oscillators.current.push(o);
          o.onended = () => {
            oscillators.current = oscillators.current.filter((x) => x !== o);
            o.disconnect();
            gain.disconnect();
          };
          o.start(at);
          o.stop(at + 0.05);
        }
      }
      cursor = horizon;
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", visibility);
    schedule();
    const interval = setInterval(schedule, 25);
    frame = requestAnimationFrame(update);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      silence();
    };
  }, [playing, bpm, loop, length, generation, pattern]);
  useEffect(
    () => () => {
      token.current++;
      silence();
      closeAudioContext(ctx.current);
    },
    [],
  );
  return {
    playing,
    starting,
    beat,
    error,
    completed,
    paused: started && !playing && !completed,
    start,
    pause,
    restart,
    reset: () => {
      token.current++;
      setStarting(false);
      silence();
      saved.current = 0;
      setPlaying(false);
      setStarted(false);
      setBeat(0);
    },
  };
}
