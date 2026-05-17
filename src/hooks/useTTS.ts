import { useEffect, useState } from "react";
import { ttsController, type TTSState } from "@/lib/ttsAudio";
import {
  BRIEFING_VOICES,
  DEFAULT_BRIEFING_VOICE_ID,
  PLAYBACK_SPEEDS,
  type PlaybackSpeed,
} from "@/config/voices";

const LS_VOICE = "pillar.tts.briefingVoiceId";
const LS_SPEED = "pillar.tts.speed";

export function useTTSState(): TTSState {
  const [s, setS] = useState<TTSState>(() => ttsController.getState());
  useEffect(() => ttsController.subscribe(setS), []);
  return s;
}

export interface TTSSettings {
  briefingVoiceId: string;
  briefingElevenVoiceId: string;
  speed: PlaybackSpeed;
  setBriefingVoiceId: (id: string) => void;
  setSpeed: (s: PlaybackSpeed) => void;
}

export function useTTSSettings(): TTSSettings {
  const [briefingVoiceId, setBriefingVoiceIdState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_BRIEFING_VOICE_ID;
    const v = window.localStorage.getItem(LS_VOICE);
    return v && BRIEFING_VOICES.some((b) => b.id === v) ? v : DEFAULT_BRIEFING_VOICE_ID;
  });
  const [speed, setSpeedState] = useState<PlaybackSpeed>(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(window.localStorage.getItem(LS_SPEED));
    return (PLAYBACK_SPEEDS as readonly number[]).includes(v) ? (v as PlaybackSpeed) : 1;
  });

  useEffect(() => {
    ttsController.setRate(speed);
  }, [speed]);

  const setBriefingVoiceId = (id: string) => {
    setBriefingVoiceIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_VOICE, id);
  };
  const setSpeed = (s: PlaybackSpeed) => {
    setSpeedState(s);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_SPEED, String(s));
  };

  const briefingElevenVoiceId =
    BRIEFING_VOICES.find((b) => b.id === briefingVoiceId)?.voiceId ??
    BRIEFING_VOICES[0].voiceId;

  return { briefingVoiceId, briefingElevenVoiceId, speed, setBriefingVoiceId, setSpeed };
}
