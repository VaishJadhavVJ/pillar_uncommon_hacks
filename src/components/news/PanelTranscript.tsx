import { usePanelState } from "@/hooks/usePanel";
import { VOICE_CATEGORY_TYPE_CLASS } from "@/config/voices";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { panelController } from "@/lib/panelAudio";

export function PanelTranscript({ className }: { className?: string }) {
  const s = usePanelState();
  const active =
    s.phase === "playing" || s.phase === "paused" || s.phase === "mixing";
  if (!active || s.turns.length === 0) return null;

  const current = s.turns[Math.max(0, s.currentIndex)] ?? s.turns[0];
  const nameClass =
    VOICE_CATEGORY_TYPE_CLASS[current.category] ?? VOICE_CATEGORY_TYPE_CLASS.host;

  return (
    <div
      className={cn(
        "pointer-events-auto z-30 max-w-[320px] rounded-md border border-[color:var(--briefing-gold,#c9a84c)]/40 bg-card/95 px-3 py-2 text-[12px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--briefing-gold,#c9a84c)]" />
          <span className={cn("truncate text-[12px]", nameClass)}>
            {current.speaker}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
            {Math.min(s.currentIndex + 1, s.turns.length)}/{s.turns.length}
          </span>
        </div>
        <button
          onClick={() => panelController.stop()}
          aria-label="Stop panel"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 line-clamp-4 text-[12px] leading-snug text-foreground/90">
        {current.line}
      </p>
    </div>
  );
}
