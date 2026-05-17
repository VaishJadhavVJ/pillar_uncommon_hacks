// Multi-speaker Panel audio: scripts via Lovable AI Gateway,
// synthesizes each turn in parallel via ElevenLabs, plays sequentially.

import { registerStopper, stopAllExcept } from "./audioBus";
import {
  PANEL_VOICES,
  getOutletVoiceCategory,
  type OutletVoiceCategory,
} from "@/config/voices";

export type PanelPhase =
  | "idle"
  | "scripting"
  | "casting"
  | "mixing"
  | "playing"
  | "paused";

export interface PanelTurn {
  speaker: string;            // "Host" or outlet name (e.g. "WSJ")
  line: string;
  voiceId: string;
  category: OutletVoiceCategory | "host";
}

export interface PanelState {
  trackId: string | null;
  phase: PanelPhase;
  progressLabel: string;
  turns: PanelTurn[];
  currentIndex: number;       // index of currently playing turn (-1 if none)
  error: string | null;
}

export interface PanelOutletInfo {
  source: string;
  affiliations: string;       // joined string used for category mapping
  framingNote?: string;
}

export interface StoryPanelRequest {
  kind: "story";
  trackId: string;
  storyTitle: string;
  storySummary: string;
  outlets: PanelOutletInfo[];
}

export interface TopicPanelRequest {
  kind: "topic";
  trackId: string;
  topic: string;
  stories: Array<{
    title: string;
    summary: string;
    outlets: PanelOutletInfo[];
  }>;
}

export type PanelRequest = StoryPanelRequest | TopicPanelRequest;

type Listener = (s: PanelState) => void;

let elevenKey: string | null = null;
let keyPromise: Promise<string | null> | null = null;
async function getElevenKey(): Promise<string | null> {
  if (elevenKey) return elevenKey;
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    try {
      const r = await fetch("/api/tts-key");
      if (!r.ok) return null;
      const j = (await r.json()) as { key?: string };
      elevenKey = j.key ?? null;
      return elevenKey;
    } catch {
      return null;
    } finally {
      keyPromise = null;
    }
  })();
  return keyPromise;
}

const HOST_NAME = "Host";

function categoryFor(outlet: PanelOutletInfo): OutletVoiceCategory {
  return getOutletVoiceCategory(outlet.affiliations);
}

// Pick up to N outlets to maximize voice-category diversity.
function pickDiverseOutlets(outlets: PanelOutletInfo[], n: number): PanelOutletInfo[] {
  const buckets = new Map<OutletVoiceCategory, PanelOutletInfo[]>();
  outlets.forEach((o) => {
    const c = categoryFor(o);
    if (!buckets.has(c)) buckets.set(c, []);
    buckets.get(c)!.push(o);
  });
  const order: OutletVoiceCategory[] = ["establishment", "cable", "public", "international"];
  const out: PanelOutletInfo[] = [];
  // round-robin across categories
  let added = true;
  while (out.length < n && added) {
    added = false;
    for (const c of order) {
      const arr = buckets.get(c);
      if (arr && arr.length) {
        out.push(arr.shift()!);
        added = true;
        if (out.length >= n) break;
      }
    }
  }
  return out;
}

function buildStoryPrompt(req: StoryPanelRequest, cast: PanelOutletInfo[]) {
  const system = [
    "You are scripting a short multi-speaker news panel for a 75-second audio segment.",
    "Output JSON via the emit_panel_script tool — no prose.",
    "Structure: Host opens (~10s, one turn) → each listed outlet speaks once in order (~12s each, one turn) → Host closes with a brief synthesis (~10s, one turn).",
    "Each outlet's lines MUST reflect their affiliations and likely framing. Make framing differences audible — word choice, emphasis, what each outlet foregrounds. Do not make speakers neutral.",
    "Use the outlet abbreviation exactly as given for the speaker field. Use 'Host' for the moderator.",
    "Lines should sound spoken, not written — contractions, natural cadence, no headers or markdown.",
    "Target ~170 chars per Host turn, ~200 chars per outlet turn.",
  ].join(" ");
  const outletBlock = cast
    .map(
      (o, i) =>
        `${i + 1}. ${o.source} — affiliations: ${o.affiliations}${
          o.framingNote ? ` — house framing note: ${o.framingNote}` : ""
        }`
    )
    .join("\n");
  const user = [
    `STORY: ${req.storyTitle}`,
    `SUMMARY: ${req.storySummary}`,
    `OUTLETS COVERING IT (speak in this order):\n${outletBlock}`,
  ].join("\n\n");
  return { system, user };
}

function buildTopicPrompt(req: TopicPanelRequest, cast: PanelOutletInfo[]) {
  const system = [
    "You are scripting a multi-speaker topic-roundtable panel for a 150-second audio segment.",
    "Output JSON via the emit_panel_script tool — no prose.",
    "Structure: Host opens with a topic overview (~12s) → 3 to 4 rounds in which the listed outlets debate across the stories below, surfacing tensions in coverage (~12s per outlet turn) → Host closes (~12s).",
    "Each outlet's lines MUST reflect their affiliations and likely framing. Make framing differences audible. Do not make speakers neutral.",
    "Reference at least two distinct stories from the brief. Outlets may interrupt or rebut each other across rounds.",
    "Use the outlet abbreviation exactly as given for speaker. Use 'Host' for the moderator. Spoken cadence, no markdown.",
  ].join(" ");
  const outletBlock = cast
    .map((o) => `- ${o.source} — affiliations: ${o.affiliations}`)
    .join("\n");
  const storyBlock = req.stories
    .map(
      (s, i) =>
        `(${i + 1}) ${s.title}\n    ${s.summary}\n    Covering: ${s.outlets.map((o) => o.source).join(", ")}`
    )
    .join("\n");
  const user = [
    `TOPIC: ${req.topic}`,
    `STORIES IN THIS TOPIC:\n${storyBlock}`,
    `PANELISTS (cast at least one from each voice category present):\n${outletBlock}`,
  ].join("\n\n");
  return { system, user };
}

class PanelController {
  private listeners = new Set<Listener>();
  private audio: HTMLAudioElement | null = null;
  private generation = 0; // increments on every start/stop to invalidate async work
  private clipUrls: string[] = [];
  private gapTimer: number | null = null;
  private rate = 1;
  private state: PanelState = {
    trackId: null,
    phase: "idle",
    progressLabel: "",
    turns: [],
    currentIndex: -1,
    error: null,
  };

  getState(): PanelState { return this.state; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => { this.listeners.delete(fn); };
  }

  setRate(rate: number) {
    this.rate = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }

  private emit(patch: Partial<PanelState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  stop = () => {
    this.generation++;
    if (this.gapTimer != null) {
      window.clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    this.clipUrls.forEach((u) => URL.revokeObjectURL(u));
    this.clipUrls = [];
    this.emit({
      trackId: null,
      phase: "idle",
      progressLabel: "",
      turns: [],
      currentIndex: -1,
      error: null,
    });
  };

  async toggle(req: PanelRequest): Promise<void> {
    // Same track: play/pause toggle
    if (this.state.trackId === req.trackId) {
      if (this.state.phase === "playing" && this.audio) {
        this.audio.pause();
        this.emit({ phase: "paused" });
        return;
      }
      if (this.state.phase === "paused" && this.audio) {
        await this.audio.play().catch(() => {});
        this.emit({ phase: "playing" });
        return;
      }
      // mid-generation: ignore
      if (this.state.phase !== "idle") return;
    }

    // New track — stop any other audio + clean prior panel
    stopAllExcept(this.stop);
    this.stop();
    const gen = ++this.generation;

    this.emit({
      trackId: req.trackId,
      phase: "scripting",
      progressLabel: "Writing script…",
      turns: [],
      currentIndex: -1,
      error: null,
    });

    // Choose cast
    let cast: PanelOutletInfo[];
    if (req.kind === "story") {
      cast = pickDiverseOutlets(req.outlets, 4);
      if (cast.length === 0) {
        this.emit({ phase: "idle", trackId: null, error: "No outlets to feature" });
        return;
      }
    } else {
      const all = new Map<string, PanelOutletInfo>();
      req.stories.forEach((s) =>
        s.outlets.forEach((o) => { if (!all.has(o.source)) all.set(o.source, o); })
      );
      cast = pickDiverseOutlets(Array.from(all.values()), 5);
      if (cast.length === 0) {
        this.emit({ phase: "idle", trackId: null, error: "No outlets to feature" });
        return;
      }
    }

    // 1. Script
    let scriptTurns: Array<{ speaker: string; line: string }> = [];
    try {
      const prompts =
        req.kind === "story" ? buildStoryPrompt(req, cast) : buildTopicPrompt(req, cast);
      const r = await fetch("/api/panel-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompts.system, userPrompt: prompts.user }),
      });
      if (gen !== this.generation) return;
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as { error?: string }));
        this.emit({
          phase: "idle",
          trackId: null,
          error: j?.error ?? `Script failed (${r.status})`,
        });
        return;
      }
      const j = (await r.json()) as { turns?: Array<{ speaker: string; line: string }> };
      scriptTurns = Array.isArray(j.turns) ? j.turns : [];
    } catch (e) {
      this.emit({
        phase: "idle",
        trackId: null,
        error: e instanceof Error ? e.message : "Script error",
      });
      return;
    }
    if (gen !== this.generation) return;
    if (scriptTurns.length === 0) {
      this.emit({ phase: "idle", trackId: null, error: "Empty script returned" });
      return;
    }

    // 2. Resolve voices for each turn
    const outletByName = new Map<string, PanelOutletInfo>();
    cast.forEach((o) => outletByName.set(o.source.toLowerCase(), o));
    const turns: PanelTurn[] = scriptTurns.map((t) => {
      const isHost = t.speaker.trim().toLowerCase() === "host";
      if (isHost) {
        return {
          speaker: HOST_NAME,
          line: t.line,
          voiceId: PANEL_VOICES.host,
          category: "host",
        };
      }
      const o = outletByName.get(t.speaker.trim().toLowerCase());
      const cat = o ? categoryFor(o) : "establishment";
      return {
        speaker: t.speaker,
        line: t.line,
        voiceId: PANEL_VOICES[cat],
        category: cat,
      };
    });

    this.emit({ phase: "casting", progressLabel: "Casting voices…", turns });

    // 3. Synthesize all in parallel
    const apiKey = await getElevenKey();
    if (gen !== this.generation) return;
    if (!apiKey) {
      this.emit({ phase: "idle", trackId: null, error: "ElevenLabs key unavailable" });
      return;
    }

    this.emit({ progressLabel: "Mixing audio…", phase: "mixing" });

    let blobs: Blob[];
    try {
      blobs = await Promise.all(
        turns.map(async (t) => {
          const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${t.voiceId}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({ text: t.line, model_id: "eleven_turbo_v2_5" }),
            }
          );
          if (!res.ok) throw new Error(`TTS ${res.status} for ${t.speaker}`);
          return res.blob();
        })
      );
    } catch (e) {
      if (gen !== this.generation) return;
      this.emit({
        phase: "idle",
        trackId: null,
        error: e instanceof Error ? e.message : "Synthesis failed",
      });
      return;
    }
    if (gen !== this.generation) return;

    this.clipUrls = blobs.map((b) => URL.createObjectURL(b));

    // 4. Play sequentially with 300ms gap
    this.emit({ phase: "playing", currentIndex: 0, progressLabel: "" });
    this.playFrom(0, gen);
  }

  private playFrom(index: number, gen: number) {
    if (gen !== this.generation) return;
    if (index >= this.clipUrls.length) {
      this.stop();
      return;
    }
    const audio = new Audio(this.clipUrls[index]);
    audio.playbackRate = this.rate;
    this.audio = audio;
    this.emit({ currentIndex: index });

    audio.addEventListener("ended", () => {
      if (gen !== this.generation) return;
      this.audio = null;
      this.gapTimer = window.setTimeout(() => {
        this.gapTimer = null;
        this.playFrom(index + 1, gen);
      }, 300);
    });
    audio.addEventListener("error", () => {
      if (gen !== this.generation) return;
      this.emit({
        phase: "idle",
        trackId: null,
        currentIndex: -1,
        error: "Playback error",
      });
      this.audio = null;
    });

    audio.play().catch((e) => {
      if (gen !== this.generation) return;
      this.emit({
        phase: "idle",
        trackId: null,
        currentIndex: -1,
        error: e instanceof Error ? e.message : "Playback blocked",
      });
      this.audio = null;
    });
  }
}

export const panelController = new PanelController();
registerStopper(panelController.stop);
