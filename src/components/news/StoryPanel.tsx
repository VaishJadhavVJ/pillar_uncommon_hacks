import { Play, Pause, Loader2, X } from "lucide-react";
import { useMemo } from "react";
import type { NewsEvent, Article, SourceLinkage } from "@/data/pillarData";
import { ttsController } from "@/lib/ttsAudio";
import { useTTSSettings, useTTSState } from "@/hooks/useTTS";
import { estimateDurationSeconds } from "@/config/voices";
import { cn } from "@/lib/utils";

interface Props {
  event: NewsEvent | null;
  articles: Article[];
  linkages: Record<string, SourceLinkage>;
  onClose: () => void;
}

function buildBriefingText(event: NewsEvent, articles: Article[]): string {
  const intro = `Here's your briefing on ${event.title}. ${event.summary}`;
  const bySource = new Map<string, Article>();
  articles.forEach((a) => {
    if (!bySource.has(a.source)) bySource.set(a.source, a);
  });
  const lines: string[] = [];
  const items = Array.from(bySource.values()).slice(0, 5);
  items.forEach((a, i) => {
    const lead =
      i === 0 ? "Over at" : i === items.length - 1 ? "Meanwhile," : "On the other hand,";
    lines.push(`${lead} ${a.source} is framing it this way — ${a.framingNote.replace(/\.$/, "")}.`);
  });
  const closer =
    items.length > 1
      ? `Same story, ${items.length} different lenses. That's the picture across the press right now.`
      : `That's the picture across the press right now.`;
  return [intro, ...lines, closer].join(" ");
}

export function StoryPanel({ event, articles, linkages, onClose }: Props) {
  const { briefingElevenVoiceId } = useTTSSettings();
  const state = useTTSState();


  const trackId = event ? `briefing:${event.id}` : "";
  const text = useMemo(
    () => (event ? buildBriefingText(event, articles) : ""),
    [event, articles]
  );
  const estimated = useMemo(() => (text ? estimateDurationSeconds(text) : 0), [text]);

  if (!event) return null;

  const isThis = state.trackId === trackId;
  const status = isThis ? state.status : "idle";
  const outletCount = new Set(articles.map((a) => a.source)).size;

  const onPlay = () => {
    ttsController.toggle({ trackId, text, voiceId: briefingElevenVoiceId });
  };

  return (
    <aside
      className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-md flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur animate-in slide-in-from-right duration-300"
      role="complementary"
      aria-label="Story briefing panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: `var(--topic-${event.topic.toLowerCase()})` }}
            />
            <span>{event.topic} · {outletCount} outlet{outletCount === 1 ? "" : "s"}</span>
          </div>
          <h2 className="mt-1 font-serif text-xl leading-tight text-foreground">
            {event.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close story panel"
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-4">
        <button
          onClick={onPlay}
          disabled={status === "loading"}
          className={cn(
            "group relative flex w-full items-center justify-center gap-3 rounded-md border px-4 py-3 font-serif text-base text-foreground transition-all",
            "border-[color:var(--briefing-gold,#c9a84c)]/50 bg-gradient-to-r from-[color:var(--briefing-gold,#c9a84c)]/15 via-[color:var(--briefing-gold,#c9a84c)]/5 to-transparent",
            "hover:border-[color:var(--briefing-gold,#c9a84c)]/80 hover:from-[color:var(--briefing-gold,#c9a84c)]/25",
            status === "playing" && "border-[color:var(--briefing-gold,#c9a84c)]/80"
          )}
        >
          {status === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-[color:var(--briefing-gold,#c9a84c)]" />
          ) : status === "playing" ? (
            <Pause className="h-5 w-5 text-[color:var(--briefing-gold,#c9a84c)]" />
          ) : (
            <Play className="h-5 w-5 fill-[color:var(--briefing-gold,#c9a84c)] text-[color:var(--briefing-gold,#c9a84c)]" />
          )}
          <span>
            {status === "playing"
              ? "Pause Briefing"
              : status === "loading"
              ? "Loading…"
              : status === "paused"
              ? "Resume Briefing"
              : "Play Briefing"}
          </span>
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {isThis && state.duration > 0
            ? `≈ ${Math.round(state.duration)}s`
            : `≈ ${estimated}s overview`}
        </p>
        {isThis && state.status === "playing" && state.duration > 0 && (
          <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-[color:var(--briefing-gold,#c9a84c)] transition-[width] duration-200"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
        )}
        {isThis && state.error && (
          <p className="mt-2 text-center text-[11px] text-destructive">{state.error}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <p className="text-[13px] leading-relaxed text-foreground/85">{event.summary}</p>
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            How it's being covered
          </p>
          <ul className="space-y-2">
            {articles.map((a) => {
              const link = linkages[a.source];
              return (
                <li
                  key={a.id}
                  className="rounded-md border border-border bg-background/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-[13px] text-foreground">{a.source}</span>
                    {link && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        · {link.owner}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-foreground/75">
                    {a.framingNote}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
