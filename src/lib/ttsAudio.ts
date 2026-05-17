// Centralized audio player for ElevenLabs TTS.
// - In-memory cache keyed by hash(text + voiceId)
// - Single concurrent playback across the app
// - Listener pattern so multiple UIs can reflect the active track

import { registerStopper, stopAllExcept } from "./audioBus";

export type TTSStatus = "idle" | "loading" | "playing" | "paused";

export interface TTSState {
  trackId: string | null;
  status: TTSStatus;
  progress: number; // 0..1
  duration: number; // seconds
  error: string | null;
}

type Listener = (s: TTSState) => void;

function hashKey(text: string, voiceId: string): string {
  let h = 5381;
  const s = `${voiceId}::${text}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `k${(h >>> 0).toString(36)}`;
}

let cachedKey: string | null = null;
let keyPromise: Promise<string | null> | null = null;
async function getElevenLabsKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    try {
      const res = await fetch("/api/tts-key");
      if (!res.ok) return null;
      const j = (await res.json()) as { key?: string };
      cachedKey = j.key ?? null;
      return cachedKey;
    } catch {
      return null;
    } finally {
      keyPromise = null;
    }
  })();
  return keyPromise;
}

class TTSController {
  private audio: HTMLAudioElement | null = null;
  private cache = new Map<string, string>(); // key -> blob URL
  private listeners = new Set<Listener>();
  private state: TTSState = {
    trackId: null,
    status: "idle",
    progress: 0,
    duration: 0,
    error: null,
  };
  private rate = 1;

  getState(): TTSState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  setRate(rate: number) {
    this.rate = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }

  private emit(patch: Partial<TTSState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }
    this.emit({
      trackId: null,
      status: "idle",
      progress: 0,
      duration: 0,
      error: null,
    });
  }

  async toggle(opts: {
    trackId: string;
    text: string;
    voiceId: string;
  }): Promise<void> {
    const { trackId, text, voiceId } = opts;

    // Same track: toggle play/pause
    if (this.state.trackId === trackId && this.audio) {
      if (this.state.status === "playing") {
        this.audio.pause();
        this.emit({ status: "paused" });
      } else if (this.state.status === "paused") {
        await this.audio.play().catch(() => {});
        this.emit({ status: "playing" });
      }
      return;
    }

    // Different track: stop any other audio source (e.g. Panel) and previous TTS
    stopAllExcept(this.stop.bind(this));
    this.stop();
    this.emit({ trackId, status: "loading", error: null, progress: 0, duration: 0 });

    const key = hashKey(text, voiceId);
    let url = this.cache.get(key) ?? null;

    if (!url) {
      try {
        const apiKey = await getElevenLabsKey();
        if (!apiKey) {
          this.emit({ status: "idle", error: "ElevenLabs key unavailable" });
          return;
        }
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
          }
        );
        if (!res.ok) {
          let msg = `TTS failed (${res.status})`;
          try {
            const j = (await res.json()) as { detail?: { message?: string } | string };
            const detail = typeof j?.detail === "string" ? j.detail : j?.detail?.message;
            if (detail) msg = detail;
          } catch {
            /* ignore */
          }
          this.emit({ status: "idle", error: msg });
          return;
        }
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        this.cache.set(key, url);
      } catch (e) {
        this.emit({
          status: "idle",
          error: e instanceof Error ? e.message : "Network error",
        });
        return;
      }
    }

    // Guard: another track may have started while we were fetching
    if (this.state.trackId !== trackId) return;

    const audio = new Audio(url);
    audio.playbackRate = this.rate;
    this.audio = audio;

    audio.addEventListener("loadedmetadata", () => {
      this.emit({ duration: isFinite(audio.duration) ? audio.duration : 0 });
    });
    audio.addEventListener("timeupdate", () => {
      const dur = audio.duration || 0;
      this.emit({
        progress: dur > 0 ? audio.currentTime / dur : 0,
        duration: dur,
      });
    });
    audio.addEventListener("ended", () => {
      this.emit({ status: "idle", trackId: null, progress: 0 });
      this.audio = null;
    });
    audio.addEventListener("error", () => {
      this.emit({ status: "idle", trackId: null, error: "Playback error" });
      this.audio = null;
    });

    try {
      await audio.play();
      this.emit({ status: "playing" });
    } catch (e) {
      this.emit({
        status: "idle",
        trackId: null,
        error: e instanceof Error ? e.message : "Playback blocked",
      });
    }
  }
}

export const ttsController = new TTSController();
registerStopper(() => ttsController.stop());
