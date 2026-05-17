// Cross-controller stop registry so Briefing TTS and Panel audio
// never play at the same time.
type Stopper = () => void;
const stoppers = new Set<Stopper>();

export function registerStopper(fn: Stopper): () => void {
  stoppers.add(fn);
  return () => {
    stoppers.delete(fn);
  };
}

export function stopAllExcept(self: Stopper): void {
  stoppers.forEach((s) => {
    if (s !== self) {
      try { s(); } catch { /* ignore */ }
    }
  });
}
