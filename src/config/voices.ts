// ElevenLabs voice configuration. Swap or extend voice IDs here.

export interface BriefingVoice {
  id: string;
  voiceId: string;
  label: string;
  description: string;
}

// Existing single-voice briefing constants — keep stable for the gear popover.
export const VOICE_ESTABLISHMENT = "uju3wxzG5OhpWcoi3SMy";
export const VOICE_WARM = "EST9Ui6982FZPSi7gCHi";
export const VOICE_NARRATIVE = "wBXNqKUATyqu0RtYt25i";

export const BRIEFING_VOICES: BriefingVoice[] = [
  {
    id: "confident",
    voiceId: VOICE_ESTABLISHMENT,
    label: "Confident & Expressive",
    description: "Default newsreader",
  },
  {
    id: "warm",
    voiceId: VOICE_WARM,
    label: "Warm & Engaging",
    description: "Conversational",
  },
  {
    id: "narrative",
    voiceId: VOICE_NARRATIVE,
    label: "Narrative",
    description: "Long-form storyteller",
  },
];

export const DEFAULT_BRIEFING_VOICE_ID = BRIEFING_VOICES[0].id;

export const VOICE_PREVIEW_TEXT =
  "This is how I'll sound when I read your briefing.";

// ============= Panel voice cast =============
// Five-voice cast used by the Story/Topic Panel feature.

export type OutletVoiceCategory =
  | "establishment"
  | "public"
  | "cable"
  | "international";

export const PANEL_VOICES: Record<"host" | OutletVoiceCategory, string> = {
  host: "uju3wxzG5OhpWcoi3SMy",          // Confident & Expressive (moderator)
  establishment: "wBXNqKUATyqu0RtYt25i", // Narrative (Broadsheet)
  public: "EST9Ui6982FZPSi7gCHi",        // Warm & Engaging
  cable: "M4FiuEOcSLrYgftiXoq9",         // Punchy / Declarative
  international: "1nFfPv6rPB37Tt2950M0", // Globally-accented / Calm
};

export const VOICE_CATEGORY_LABEL: Record<OutletVoiceCategory, string> = {
  establishment: "Establishment Broadsheet",
  public: "Public / Warm Voice",
  cable: "Cable / Energetic Voice",
  international: "International / Wire Voice",
};

// Typography class for the transcript speaker name — small, polished detail.
export const VOICE_CATEGORY_TYPE_CLASS: Record<OutletVoiceCategory | "host", string> = {
  host: "font-serif italic text-foreground/80",
  establishment: "font-serif text-foreground",
  public: "font-serif italic text-foreground",
  cable: "font-sans uppercase tracking-[0.18em] font-bold text-foreground",
  international: "font-sans uppercase tracking-[0.28em] text-foreground",
};

// Keyword priority (case-insensitive substring match).
const CABLE_KEYWORDS = [
  "opinion network",
  "opinion-heavy",
  "cable carriage",
  "cable news",
  "murdoch",
  "sinclair",
  "republican",
  "democratic ecosystem",
  "partisan",
  "family-owned",
  "family owned",
  "founder-led",
  "fox",
  "ny post",
  "new york post",
  "msnbc",
  "cnn",
];

const PUBLIC_KEYWORDS = [
  "publicly funded",
  "publicly-funded",
  "state funded",
  "state-funded",
  "public broadcasting",
  "public broadcaster",
  "npr",
  "pbs",
  "al jazeera",
  "qatar",
  "government of",
  "ministry of",
];

const INTERNATIONAL_KEYWORDS = [
  "wire service",
  "international",
  "bbc",
  "reuters",
  "associated press",
  " ap ",
  "bloomberg",
  "publicly funded by uk",
  "non-western",
  "non-us",
];

export function getOutletVoiceCategory(affiliations: string): OutletVoiceCategory {
  const hay = ` ${(affiliations || "").toLowerCase()} `;
  const has = (kws: string[]) => kws.some((k) => hay.includes(k));
  if (has(CABLE_KEYWORDS)) return "cable";
  if (has(PUBLIC_KEYWORDS)) return "public";
  if (has(INTERNATIONAL_KEYWORDS)) return "international";
  return "establishment";
}

export function getVoiceForOutlet(affiliations: string): string {
  return PANEL_VOICES[getOutletVoiceCategory(affiliations)];
}

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export const ESTIMATED_SECONDS_PER_CHAR = 0.06;
export function estimateDurationSeconds(text: string): number {
  return Math.max(3, Math.round(text.length * ESTIMATED_SECONDS_PER_CHAR));
}
