/** Cleanup is idempotent even when cancellation races a failed audio startup. */
export function closeAudioContext(context: AudioContext | null): void {
  if (context && context.state !== "closed") {
    void context.close().catch(() => undefined);
  }
}
