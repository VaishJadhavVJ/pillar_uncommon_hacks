import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TOPICS, usePillarData, type Topic } from "@/data/pillarData";
import {
  StoryConstellation as StoryConstellation3D,
  type StoryNode,
  type StoryEdge,
} from "@/components/news/StoryConstellation";
import { StoryConstellation2D } from "@/components/news/StoryConstellation2D";
import { ReportingBar, type ReportingItem } from "@/components/news/ReportingBar";
import { ReportingModal } from "@/components/news/ReportingModal";
import { TTSSettingsPopover } from "@/components/news/TTSSettingsPopover";

import { PanelButton } from "@/components/news/PanelButton";
import { PanelTranscript } from "@/components/news/PanelTranscript";
import type { PanelRequest, PanelOutletInfo } from "@/lib/panelAudio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pillar — The Fourth Estate, Mapped" },
      { name: "description", content: "Today's news as a living constellation. Each star is a story, sized by how many outlets covered it. Read reportings, see who owns the press." },
    ],
  }),
  component: Index,
});

function shortHeadline(title: string): string {
  const words = title.replace(/[—–]/g, "-").split(/\s+/).filter(Boolean);
  if (words.length <= 5) return words.join(" ");
  return words.slice(0, 5).join(" ") + "…";
}

const DEFAULT_TOPIC: Topic = "Politics";

type TimeRange = "24h" | "week" | "month";
const TIME_RANGES: { id: TimeRange; label: string; hours: number }[] = [
  { id: "24h", label: "24 hours", hours: 24 },
  { id: "week", label: "This week", hours: 24 * 7 },
  { id: "month", label: "This month", hours: 24 * 30 },
];

function Index() {
  const { events: allEvents, articles: allArticles, linkages } = usePillarData();

  const [category, setCategory] = useState<Topic>(DEFAULT_TOPIC);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [hoverEventId, setHoverEventId] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<ReportingItem | null>(null);

  // Reset selection when category or time range changes
  useEffect(() => { setSelectedStoryId(null); }, [category, timeRange]);

  const categoryEvents = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.id === timeRange)!;
    const cutoff = Date.now() - range.hours * 3600_000;
    return allEvents.filter(
      (e) => e.topic === category && new Date(e.timestamp).getTime() >= cutoff
    );
  }, [allEvents, category, timeRange]);

  const articlesByEvent = useMemo(() => {
    const m = new Map<string, typeof allArticles>();
    categoryEvents.forEach((e) => {
      const arts = allArticles.filter((a) => a.eventId === e.id);
      if (arts.length) m.set(e.id, arts);
    });
    return m;
  }, [categoryEvents, allArticles]);

  const nodes: StoryNode[] = useMemo(
    () =>
      categoryEvents.map((e) => {
        const arts = articlesByEvent.get(e.id) ?? [];
        const outletCount = new Set(arts.map((a) => a.source)).size;
        return {
          id: e.id,
          event: e,
          outletCount,
          shortLabel: shortHeadline(e.title),
          topic: e.topic,
        };
      }),
    [categoryEvents, articlesByEvent]
  );

  const edges: StoryEdge[] = useMemo(() => {
    const out: StoryEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const aSrc = new Set((articlesByEvent.get(a.id) ?? []).map((x) => x.source));
        const bSrc = new Set((articlesByEvent.get(b.id) ?? []).map((x) => x.source));
        let shared = 0;
        aSrc.forEach((s) => { if (bSrc.has(s)) shared++; });
        const weight = shared + 0.6; // same category, baseline thematic edge
        if (weight >= 1) out.push({ a: a.id, b: b.id, weight });
      }
    }
    return out;
  }, [nodes, articlesByEvent]);

  // All reportings for the current category, optionally filtered to selected story
  const reportingItems: ReportingItem[] = useMemo(() => {
    const items: ReportingItem[] = [];
    const evList = selectedStoryId
      ? categoryEvents.filter((e) => e.id === selectedStoryId)
      : categoryEvents;
    evList.forEach((ev) => {
      (articlesByEvent.get(ev.id) ?? []).forEach((a) => items.push({ article: a, event: ev }));
    });
    return items;
  }, [categoryEvents, articlesByEvent, selectedStoryId]);

  const selectedEvent = useMemo(
    () => categoryEvents.find((e) => e.id === selectedStoryId) ?? null,
    [categoryEvents, selectedStoryId]
  );

  const highlightIds = useMemo(() => {
    const s = new Set<string>();
    if (hoverEventId) s.add(hoverEventId);
    return s;
  }, [hoverEventId]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/85 px-5 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-lg font-semibold tracking-tight">Pillar</span>
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            The Fourth Estate, Mapped
          </span>
          <span className="ml-auto text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {nodes.length} stories · {reportingItems.length} reportings
          </span>
          <TTSSettingsPopover />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Focus</span>
          {TOPICS.map((t) => {
            const active = category === t;
            return (
              <button
                key={t}
onClick={() => setCategory(t)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] tracking-wide transition-colors",
                  active
                    ? "border-transparent text-background"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                )}
                style={active ? { backgroundColor: `var(--topic-${t.toLowerCase()})` } : undefined}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Window</span>
          {TIME_RANGES.map((r) => {
            const active = timeRange === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] tracking-wide transition-colors",
                  active
                    ? "border-foreground/60 bg-foreground/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </header>

      <section className="relative h-[calc(100vh-12rem)] min-h-[320px]">
        {viewMode === "3d" ? (
          <StoryConstellation3D
            nodes={nodes}
            edges={edges}
            selectedStoryId={selectedStoryId}
            onSelectStory={setSelectedStoryId}
            highlightIds={highlightIds}
          />
        ) : (
          <StoryConstellation2D
            nodes={nodes}
            edges={edges}
            selectedStoryId={selectedStoryId}
            onSelectStory={setSelectedStoryId}
            highlightIds={highlightIds}
          />
        )}

        <div className="absolute left-3 z-10 flex flex-col items-start gap-2" style={{ top: "calc(1.75rem + 1vh)" }}>
          <div className="inline-flex overflow-hidden rounded-full border border-border bg-card/85 text-[11px] shadow-sm backdrop-blur">
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-3 py-1 uppercase tracking-[0.18em] transition-colors",
                  viewMode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={viewMode === m}
              >
                {m}
              </button>
            ))}
          </div>

          <PanelButton
            trackId={`panel:topic:${category}:${timeRange}`}
            estimatedSeconds={150}
            label="Play Topic Panel"
            disabled={categoryEvents.length === 0}
            disabledHint="No stories in this topic / window"
            className="items-start"
            buildRequest={() => {
              // Pick up to 5 representative stories with the most outlets
              const ranked = [...categoryEvents]
                .map((ev) => ({
                  ev,
                  arts: articlesByEvent.get(ev.id) ?? [],
                }))
                .sort((a, b) => b.arts.length - a.arts.length)
                .slice(0, 5)
                .filter((x) => x.arts.length > 0);
              if (ranked.length === 0) return null;
              const req: PanelRequest = {
                kind: "topic",
                trackId: `panel:topic:${category}:${timeRange}`,
                topic: category,
                stories: ranked.map(({ ev, arts }) => {
                  const seen = new Set<string>();
                  const outlets: PanelOutletInfo[] = [];
                  arts.forEach((a) => {
                    if (seen.has(a.source)) return;
                    seen.add(a.source);
                    const link = linkages[a.source];
                    const aff = link
                      ? [a.source, link.owner, ...link.affiliations, ...link.majorFunders, link.note].join(" | ")
                      : a.source;
                    outlets.push({
                      source: a.source,
                      affiliations: aff,
                      framingNote: a.framingNote,
                    });
                  });
                  return { title: ev.title, summary: ev.summary, outlets };
                }),
              };
              return req;
            }}
          />
        </div>

        <PanelTranscript className="absolute top-3 right-4" />

        <div className="pointer-events-none absolute bottom-3 right-4 max-w-xs text-right text-[11px] leading-relaxed text-muted-foreground/90">
          <p className="text-foreground/85">
            <span className="font-serif font-semibold text-foreground">Hover</span> for a summary,{" "}
            <span className="font-serif font-semibold text-foreground">click</span> to read coverage across the spectrum.
          </p>
          <p className="mt-0.5">
            Drag any star to play. Bigger stars = more outlets covering the story.
          </p>
        </div>
      </section>

      <section className="h-screen flex-shrink-0">
        <ReportingBar
          items={reportingItems}
          linkages={linkages}
          filteredByStory={selectedEvent}
          briefingArticles={selectedEvent ? (articlesByEvent.get(selectedEvent.id) ?? []) : []}
          onClearStoryFilter={() => setSelectedStoryId(null)}
          onHoverItem={setHoverEventId}
          onOpenReporting={setOpenItem}
        />
      </section>

      <ReportingModal
        open={!!openItem}
        article={openItem?.article ?? null}
        event={openItem?.event ?? null}
        linkages={linkages}
        onClose={() => setOpenItem(null)}
      />
    </div>
  );
}
