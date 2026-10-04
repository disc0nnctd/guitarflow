import { useEffect, useRef, useState } from "react";
import { analyzeRhythm, estimateChord } from "../core/audio";
import { closeAudioContext } from "../core/audio-context";
import type { ChordEstimate, RhythmAnalysis } from "../core/types";
const CAPTURE_PROCESSOR = `class Capture extends AudioWorkletProcessor {
 constructor(options) { super(); this.start = options.processorOptions.start; this.end = this.start + options.processorOptions.length; this.done = false; }
 process(inputs) { if(this.done) return false; const channel=inputs[0]?.[0]; if(channel) { const a=Math.max(0,this.start-currentFrame); const b=Math.min(channel.length,this.end-currentFrame); if(b>a) this.port.postMessage({samples:channel.slice(a,b)}); } if(currentFrame+128>=this.end) {this.done=true;this.port.postMessage({done:true});return false;} return true; }
} registerProcessor('guitarflow-capture',Capture);`;
export function useAudio() {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<RhythmAnalysis | null>(null);
  const [listening, setListening] = useState(false);
  const [estimate, setEstimate] = useState<ChordEstimate | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const token = useRef(0);
  const stop = () => {
    token.current++;
    cleanup.current?.();
    cleanup.current = null;
    setRecording(false);
    setListening(false);
    setAnalyzing(false);
    setStatus("");
  };
  const clear = () => {
    stop();
    setError("");
    setResult(null);
    setEstimate(null);
  };
  useEffect(
    () => () => {
      token.current++;
      cleanup.current?.();
    },
    [],
  );
  const mic = async (bpm: number, mode: "record" | "listen") => {
    clear();
    const session = token.current;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    setStatus("Requesting microphone…");
    setRecording(mode === "record");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Microphone access needs HTTPS or localhost and a supported browser.",
        );
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (token.current !== session) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      ctx = new AudioContext();
      await ctx.resume();
      if (token.current !== session) {
        stream.getTracks().forEach((t) => t.stop());
        await ctx.close();
        return;
      }
      const context = ctx;
      const source = context.createMediaStreamSource(stream);
      let timer: ReturnType<typeof setInterval> | undefined;
      let node: AudioWorkletNode | null = null;
      cleanup.current = () => {
        if (timer) clearInterval(timer);
        if (node) {
          node.port.onmessage = null;
          node.disconnect();
        }
        source.disconnect();
        stream?.getTracks().forEach((t) => t.stop());
        closeAudioContext(context);
      };
      if (mode === "listen") {
        const analyser = context.createAnalyser();
        analyser.fftSize = Math.min(
          32768,
          2 ** Math.ceil(Math.log2(context.sampleRate * 0.18)),
        );
        source.connect(analyser);
        setListening(true);
        setStatus("");
        timer = setInterval(() => {
          const data = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(data);
          setEstimate(estimateChord(data, context.sampleRate));
        }, 300);
        return;
      }
      if (!context.audioWorklet)
        throw new Error(
          "Audio recording requires AudioWorklet support on HTTPS or localhost.",
        );
      const url = URL.createObjectURL(
        new Blob([CAPTURE_PROCESSOR], { type: "application/javascript" }),
      );
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (token.current !== session) return;
      const startTime = context.currentTime + 240 / bpm;
      const captureLength = Math.round((960 / bpm) * context.sampleRate);
      const chunks: Float32Array[] = [];
      node = new AudioWorkletNode(context, "guitarflow-capture", {
        processorOptions: {
          start: Math.round(startTime * context.sampleRate),
          length: captureLength,
        },
      });
      node.port.onmessage = (
        event: MessageEvent<{ samples?: Float32Array; done?: boolean }>,
      ) => {
        if (token.current !== session) return;
        if (event.data.samples) chunks.push(event.data.samples);
        if (event.data.done) {
          const samples = new Float32Array(captureLength);
          let offset = 0;
          for (const chunk of chunks) {
            const size = Math.min(chunk.length, captureLength - offset);
            if (size > 0) samples.set(chunk.subarray(0, size), offset);
            offset += size;
          }
          try {
            setResult(analyzeRhythm(samples, context.sampleRate, bpm));
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Could not analyze this recording.",
            );
          }
          stop();
        }
      };
      source.connect(node);
      node.connect(context.destination);
      timer = setInterval(() => {
        const remaining = startTime - context.currentTime;
        setStatus(
          remaining > 0
            ? `Count in · ${Math.max(1, Math.ceil((remaining * bpm) / 60))}`
            : `Recording · bar ${Math.min(4, Math.floor((-remaining * bpm) / 240) + 1)} of 4`,
        );
      }, 80);
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      closeAudioContext(ctx);
      if (token.current !== session) return;
      stop();
      setError(
        e instanceof Error
          ? `${e.message} Allow microphone access in your browser, then retry.`
          : "Microphone unavailable.",
      );
    }
  };
  const upload = async (file: File, bpm: number) => {
    clear();
    const session = token.current;
    setAnalyzing(true);
    setStatus("Analyzing audio…");
    let ctx: AudioContext | null = null;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choose an audio file smaller than 20 MB.");
      ctx = new AudioContext();
      const audio = await ctx.decodeAudioData(await file.arrayBuffer());
      if (token.current !== session) return;
      if (audio.duration > 60)
        throw new Error("Choose a recording shorter than 60 seconds.");
      const mono = new Float32Array(audio.length);
      for (let c = 0; c < audio.numberOfChannels; c++) {
        const channel = audio.getChannelData(c);
        for (let i = 0; i < mono.length; i++)
          mono[i] += channel[i] / audio.numberOfChannels;
      }
      setResult(analyzeRhythm(mono, audio.sampleRate, bpm));
    } catch (e) {
      if (token.current === session)
        setError(
          e instanceof Error
            ? e.message
            : "Unsupported audio file. Try WAV or MP3.",
        );
    } finally {
      if (ctx) await ctx.close();
      if (token.current === session) {
        setStatus("");
        setAnalyzing(false);
      }
    }
  };
  return {
    recording,
    analyzing,
    status,
    error,
    result,
    setResult,
    listening,
    estimate,
    stop,
    clear,
    mic,
    upload,
  };
}
