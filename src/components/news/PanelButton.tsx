import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePanelState } from "@/hooks/usePanel";
import { panelController, type PanelRequest } from "@/lib/panelAudio";

interface Props {
  trackId: string;
  estimatedSeconds: number;
  label: string;            // e.g. "Play Panel" / "Play Topic Panel"
  buildRequest: () => PanelRequest | null;
  disabled?: boolean;
  disabledHint?: string;
  className?: string;
  size?: "sm" | "md";
}

export function PanelButton({
  trackId,
  estimatedSeconds,
  label,
  buildRequest,
  disabled,
  disabledHint,
  className,
  size = "sm",
}: Props) {
  const state = usePanelState();
  const isThis = state.trackId === trackId;
  const phase = isThis ? state.phase : "idle";
  const busy = phase === "scripting" || phase === "casting" || phase === "mixing";
  const playing = phase === "playing";
  const paused = phase === "paused";

  const onClick = () => {
    if (disabled) return;
    if (isThis && busy) return;
    const req = buildRequest();
    if (!req) return;
    panelController.toggle(req);
  };

  const padding = size === "md" ? "px-3.5 py-1.5 text-[12px]" : "px-3 py-1 text-[12px]";

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <button
        onClick={onClick}
        disabled={disabled || busy}
        title={disabled ? disabledHint : undefined}
        aria-label={label}
        className={cn(
          "group inline-flex shrink-0 items-center gap-2 rounded-full border transition-colors",
          padding,
          disabled
            ? "cursor-not-allowed border-border/60 bg-transparent text-muted-foreground/50"
            : "border-[color:var(--briefing-gold,#c9a84c)]/50 bg-[color:var(--briefing-gold,#c9a84c)]/10 text-[color:var(--briefing-gold,#c9a84c)] hover:bg-[color:var(--briefing-gold,#c9a84c)]/20",
          playing && "border-[color:var(--briefing-gold,#c9a84c)]/80 bg-[color:var(--briefing-gold,#c9a84c)]/20"
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current" />
        )}
        <span className="font-serif">
          {busy
            ? "Assembling Panel…"
            : playing
            ? `Pause ${label.replace(/^Play\s+/i, "")}`
            : paused
            ? `Resume ${label.replace(/^Play\s+/i, "")}`
            : label}
        </span>
        {!busy && (
          <span className="text-[10px] tabular-nums opacity-70">
            ≈ {estimatedSeconds}s
          </span>
        )}
      </button>
      {isThis && busy && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--briefing-gold,#c9a84c)]/80">
          {state.progressLabel}
        </span>
      )}
    </div>
  );
}
