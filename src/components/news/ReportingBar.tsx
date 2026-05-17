import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, Volume2, Play, Pause, Loader2, X, Eye } from "lucide-react";
import type { Article, NewsEvent, SourceLinkage } from "@/data/pillarData";
import { cn } from "@/lib/utils";
import { ttsController } from "@/lib/ttsAudio";
import { useTTSState, useTTSSettings } from "@/hooks/useTTS";
import { getVoiceForOutlet, estimateDurationSeconds } from "@/config/voices";

function affiliationsStringFor(source: string, link: SourceLinkage | undefined): string {
  if (!link) return source;
  return [source, link.owner, ...link.affiliations, ...link.majorFunders, link.note].join(" | ");
}

export interface ReportingItem {
  article: Article;
  event: NewsEvent;
}

interface Props {
  items: ReportingItem[];
  linkages: Record<string, SourceLinkage>;
  filteredByStory: NewsEvent | null;
  briefingArticles: Article[];
  onClearStoryFilter: () => void;
  onHoverItem: (eventId: string | null) => void;
  onOpenReporting: (item: ReportingItem) => void;
}

const PAGE_SIZE = 6;

type LinkageLike = SourceLinkage;

function whyThisMatters(source: string, link: LinkageLike, event: NewsEvent): string {
  const aff = link.affiliations[0] ?? link.majorFunders[0] ?? "its core audience";
  const tail = link.note.replace(/\.$/, "").toLowerCase();
  return `${source} answers to ${link.owner}, whose ${aff.toLowerCase()} ties overlap the ${event.topic.toLowerCase()} beat this story sits on. Expect framing of "${event.title}" to follow that lens — ${tail}.`;
}

function buildReportingText(article: Article, event: NewsEvent, linkages: Record<string, SourceLinkage>): string {
  const lede = `${article.headline}. ${event.summary}`;
  const body = `${article.framingNote} Reporters covering this beat note that responses from stakeholders have been mixed, and ${article.source} positions the story within its house style on the ${event.topic.toLowerCase()} desk.`;
  const link = linkages[article.source];
  const bias = link
    ? ` This reporting comes from ${article.source}, owned by ${link.owner}, with affiliations to ${[
        ...link.affiliations,
        ...link.majorFunders.slice(0, 1),
      ].join(" and ")} — framing here leans toward ${link.note.replace(/\.$/, "").toLowerCase()}.`
    : "";
  return `${lede} ${body}${bias}`;
}

function buildBriefingText(event: NewsEvent, articles: Article[]): string {
  const intro = `Here's your briefing on ${event.title}. ${event.summary}`;
  const bySource = new Map<string, Article>();
  articles.forEach((a) => { if (!bySource.has(a.source)) bySource.set(a.source, a); });
  const items = Array.from(bySource.values()).slice(0, 5);
  const lines = items.map((a, i) => {
    const lead = i === 0 ? "Over at" : i === items.length - 1 ? "Meanwhile," : "On the other hand,";
    return `${lead} ${a.source} is framing it this way — ${a.framingNote.replace(/\.$/, "")}.`;
  });
  const closer = items.length > 1
    ? `Same story, ${items.length} different lenses. That's the picture across the press right now.`
    : `That's the picture across the press right now.`;
  return [intro, ...lines, closer].join(" ");
}

export function ReportingBar({
  items, linkages, filteredByStory, briefingArticles, onClearStoryFilter, onHoverItem, onOpenReporting,
}: Props) {
  const [page, setPage] = useState(0);
  const ttsState = useTTSState();
  const { briefingElevenVoiceId } = useTTSSettings();

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  useEffect(() => { setPage(0); }, [filteredByStory?.id, items.length]);

  const slice = useMemo(
    () => items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [items, page]
  );

  const briefingTrackId = filteredByStory ? `briefing:${filteredByStory.id}` : "";
  const briefingText = useMemo(
    () => (filteredByStory ? buildBriefingText(filteredByStory, briefingArticles) : ""),
    [filteredByStory, briefingArticles]
  );
  const briefingEstimated = briefingText ? estimateDurationSeconds(briefingText) : 0;
  const briefingIsThis = ttsState.trackId === briefingTrackId && !!briefingTrackId;
  const briefingStatus = briefingIsThis ? ttsState.status : "idle";
  const briefingDisabled = !filteredByStory;

  const onPlayBriefing = () => {
    if (!filteredByStory) return;
    ttsController.toggle({ trackId: briefingTrackId, text: briefingText, voiceId: briefingElevenVoiceId });
  };

  // Stop any playing briefing when the selected story changes to a different one
  useEffect(() => {
    const s = ttsController.getState();
    if (s.trackId?.startsWith("briefing:") && s.trackId !== briefingTrackId) {
      ttsController.stop();
    }
  }, [briefingTrackId]);

  return (
    <div className="flex h-full flex-col border-t border-border bg-card/40 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {filteredByStory && (
            <button
              onClick={onClearStoryFilter}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-3 w-3" /> All reportings
            </button>
          )}
          <span className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {filteredByStory
              ? <>Filtered · <span className="font-serif normal-case tracking-normal text-foreground/90">{filteredByStory.title}</span></>
              : "All reportings on stories in the constellation"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPlayBriefing}
            disabled={briefingDisabled || briefingStatus === "loading"}
            title={briefingDisabled ? "Select a story to play its briefing" : undefined}
            aria-label="Play briefing"
            className={cn(
              "group inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[12px] transition-colors",
              briefingDisabled
                ? "cursor-not-allowed border-border/60 bg-transparent text-muted-foreground/50"
                : "border-[color:var(--briefing-gold,#c9a84c)]/50 bg-[color:var(--briefing-gold,#c9a84c)]/10 text-[color:var(--briefing-gold,#c9a84c)] hover:bg-[color:var(--briefing-gold,#c9a84c)]/20",
              briefingStatus === "playing" && "border-[color:var(--briefing-gold,#c9a84c)]/80 bg-[color:var(--briefing-gold,#c9a84c)]/20"
            )}
          >
            {briefingStatus === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : briefingStatus === "playing" ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span className="font-serif">
              {briefingStatus === "playing"
                ? "Pause Briefing"
                : briefingStatus === "paused"
                ? "Resume Briefing"
                : "Play Briefing"}
            </span>
            {filteredByStory && (
              <span className="text-[10px] tabular-nums opacity-70">
                ≈ {briefingIsThis && ttsState.duration > 0 ? Math.round(ttsState.duration) : briefingEstimated}s
              </span>
            )}
          </button>

        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
          <span>{items.length} reportings</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-sm border border-border p-1 disabled:opacity-30 hover:bg-accent"
              aria-label="Previous page"
            ><ChevronLeft className="h-3 w-3" /></button>
            <span className="tabular-nums">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-sm border border-border p-1 disabled:opacity-30 hover:bg-accent"
              aria-label="Next page"
            ><ChevronRight className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No reportings for this selection.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slice.map((it) => {
              const link = linkages[it.article.source];
              const trackId = `reporting:${it.article.id}`;
              const isThis = ttsState.trackId === trackId;
              const status = isThis ? ttsState.status : "idle";
              const showInlinePlayer = isThis && (status === "loading" || status === "playing" || status === "paused");

              const handleAudio = (e: React.MouseEvent) => {
                e.stopPropagation();
                ttsController.toggle({
                  trackId,
                  text: buildReportingText(it.article, it.event, linkages),
                  voiceId: getVoiceForOutlet(affiliationsStringFor(it.article.source, link)),
                });
              };
              const handleStop = (e: React.MouseEvent) => {
                e.stopPropagation();
                ttsController.stop();
              };

              return (
                <li
                  key={it.article.id}
                  tabIndex={0}
                  onMouseEnter={() => onHoverItem(it.event.id)}
                  onMouseLeave={() => onHoverItem(null)}
                  onFocus={() => onHoverItem(it.event.id)}
                  onBlur={() => onHoverItem(null)}
                  onClick={() => onOpenReporting(it)}
                  className={cn(
                    "group cursor-pointer rounded-md border border-border bg-background/50 p-3 transition-all hover:border-primary/60 hover:-translate-y-0.5 focus:outline-none focus:border-primary/60",
                    isThis && status === "playing" && "border-[color:var(--briefing-gold)]/60 shadow-[0_0_18px_-6px_var(--briefing-gold)]"
                  )}
                  style={{
                    borderLeft: isThis && status === "playing"
                      ? `3px solid var(--briefing-gold)`
                      : `3px solid var(--topic-${it.event.topic.toLowerCase()})`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm text-foreground truncate">{it.article.source}</span>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate">
                          {it.event.topic}
                        </span>
                      </div>
                      {link && (
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          <span className="text-foreground/80">{link.owner}</span>
                          <span className="text-muted-foreground/70">
                            {" · affiliations: "}{[...link.affiliations, ...link.majorFunders.slice(0, 1)].join(" / ")}
                          </span>
                        </p>
                      )}
                    </div>

                    {showInlinePlayer ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex shrink-0 items-center gap-1.5 rounded-sm border border-[color:var(--briefing-gold)]/50 bg-[color:var(--briefing-gold)]/10 px-1.5 py-1"
                      >
                        <button
                          onClick={handleAudio}
                          aria-label={status === "playing" ? "Pause" : "Resume"}
                          className="text-[color:var(--briefing-gold)] hover:opacity-80"
                        >
                          {status === "loading" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : status === "playing" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className="h-full bg-[color:var(--briefing-gold)] transition-[width] duration-200"
                            style={{ width: `${Math.round(ttsState.progress * 100)}%` }}
                          />
                        </div>
                        <button
                          onClick={handleStop}
                          aria-label="Stop"
                          className="text-[color:var(--briefing-gold)]/80 hover:text-[color:var(--briefing-gold)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleAudio}
                        className={cn(
                          "shrink-0 rounded-sm border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        )}
                        aria-label="Play audio"
                      >
                        {isThis && status === "loading" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {isThis && ttsState.error && (
                    <p className="mt-1 text-[10px] text-destructive">{ttsState.error}</p>
                  )}

                  <h4 className="mt-2 font-serif text-[13px] leading-snug text-foreground line-clamp-2">
                    {it.article.headline}
                  </h4>

                  {link && (
                    <p className="mt-2 rounded-sm bg-card/60 px-2 py-1.5 text-[11px] leading-snug text-foreground/75">
                      <span className="text-muted-foreground">Implication: </span>{link.note}
                    </p>
                  )}

                  {link && (
                    <div className="mt-2 rounded-sm bg-foreground/[0.06] px-2 py-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground/80">
                        <Eye className="h-3 w-3" />
                        <span>Why this matters</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-foreground/80">
                        {whyThisMatters(it.article.source, link, it.event)}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
