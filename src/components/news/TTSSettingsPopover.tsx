import { Settings, Play, Pause, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BRIEFING_VOICES,
  PLAYBACK_SPEEDS,
  VOICE_PREVIEW_TEXT,
} from "@/config/voices";
import { useTTSSettings, useTTSState } from "@/hooks/useTTS";
import { ttsController } from "@/lib/ttsAudio";
import { cn } from "@/lib/utils";

export function TTSSettingsPopover() {
  const { briefingVoiceId, setBriefingVoiceId, speed, setSpeed } = useTTSSettings();
  const ttsState = useTTSState();

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Briefing voice settings"
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background/40 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Settings className="h-3.5 w-3.5" />
        <span>Voice</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 border-border bg-card/95 p-3 text-foreground backdrop-blur"
      >
        <div className="mb-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Briefing voice
          </p>
          <div className="flex flex-col gap-1">
            {BRIEFING_VOICES.map((v) => {
              const active = v.id === briefingVoiceId;
              const previewTrackId = `voice-preview:${v.id}`;
              const isThis = ttsState.trackId === previewTrackId;
              const status = isThis ? ttsState.status : "idle";
              const onPreview = (e: React.MouseEvent) => {
                e.stopPropagation();
                ttsController.toggle({
                  trackId: previewTrackId,
                  text: VOICE_PREVIEW_TEXT,
                  voiceId: v.voiceId,
                });
              };
              return (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center gap-2 rounded-sm border px-2 py-1.5 transition-colors",
                    active
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-background/40 hover:border-foreground/40"
                  )}
                >
                  <button
                    onClick={() => setBriefingVoiceId(v.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="font-serif text-[12px] text-foreground">
                      {v.label}
                      {active && (
                        <span className="ml-1 text-[10px] text-primary">· selected</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{v.description}</div>
                  </button>
                  <button
                    onClick={onPreview}
                    aria-label={`Preview ${v.label}`}
                    className="shrink-0 rounded-sm border border-border bg-background/60 p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {status === "loading" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : status === "playing" ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Playback speed
          </p>
          <div className="flex gap-1">
            {PLAYBACK_SPEEDS.map((s) => {
              const active = s === speed;
              return (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "flex-1 rounded-sm border px-2 py-1 text-[11px] tabular-nums transition-colors",
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}x
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
