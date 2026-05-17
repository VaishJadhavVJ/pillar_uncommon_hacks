import { X, Rss, ExternalLink } from "lucide-react";
import { useEffect } from "react";
import type { Article, NewsEvent, SourceLinkage } from "@/data/pillarData";

interface Props {
  open: boolean;
  article: Article | null;
  event: NewsEvent | null;
  linkages: Record<string, SourceLinkage>;
  onClose: () => void;
}

// Produce a deterministic RSS-feed-style narration from the mock article.
function buildFeed(article: Article, event: NewsEvent) {
  const ts = new Date(event.timestamp).toUTCString();
  const lede = `${article.headline}. ${event.summary}`;
  const para2 = `${article.framingNote} The ${event.topic.toLowerCase()} desk at ${article.source} positions the story within its house style — ${article.source} has covered ${event.topic.toLowerCase()} from this vantage consistently this cycle.`;
  const para3 = `According to filings to the wire, the event unfolded as follows: ${event.summary} Reporters covering this beat note that responses from stakeholders have been mixed, and analysts expect follow-on coverage in the coming hours.`;
  const para4 = `${article.source} closes its dispatch by signposting related developments and pointing readers to its standing coverage of ${event.topic.toLowerCase()}. The byline notes this filing is part of an evolving story; updates will be appended as new information emerges.`;
  return { ts, paragraphs: [lede, para2, para3, para4] };
}

export function ReportingModal({ open, article, event, linkages, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !article || !event) return null;
  const feed = buildFeed(article, event);
  const link = linkages[article.source];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `3px solid var(--topic-${event.topic.toLowerCase()})` }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Rss className="h-3 w-3" />
              <span>RSS feed · {article.source}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{event.topic}</span>
            </div>
            <h2 className="font-serif text-2xl leading-tight text-foreground">{article.headline}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">{feed.ts}</p>
            {link && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                <span className="text-foreground/80">{link.owner}</span>
                <span> · {[...link.affiliations, ...link.majorFunders.slice(0, 1)].join(" / ")}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          ><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="space-y-4 font-serif text-[15px] leading-relaxed text-foreground/90">
            {feed.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
          >
            View original feed <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
