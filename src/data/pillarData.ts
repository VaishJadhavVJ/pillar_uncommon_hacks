// Pillar data: fetched at runtime from /data.json with a cache-busting query.
// Components consume via the `usePillarData()` hook.

import { useEffect, useState } from "react";

// ============= Types =============

export type Topic =
  | "Politics" | "Economics" | "Sports" | "World" | "Tech"
  | "Lifestyle" | "Health" | "Entertainment" | "Editorial" | "Academia";

export const TOPICS: Topic[] = [
  "Politics", "Economics", "Sports", "World", "Tech",
  "Lifestyle", "Health", "Entertainment", "Editorial", "Academia",
];

export type Bias = "Left" | "Lean Left" | "Center" | "Lean Right" | "Right";
export type RelationType = "causal" | "temporal" | "thematic";

export interface NewsEvent {
  id: string;
  title: string;
  summary: string;
  topic: Topic;
  timestamp: string;
  articleIds: string[];
}

export interface Article {
  id: string;
  eventId: string;
  headline: string;
  source: string;
  sourceBias: Bias;
  url: string;
  framingNote: string;
}

export interface Relation {
  fromEventId: string;
  toEventId: string;
  type: RelationType;
  strength: number;
}

export interface SourceLinkage {
  owner: string;
  majorFunders: string[];
  affiliations: string[];
  note: string;
}

export interface OutletMeta {
  id: string;
  label: string;
  bias: Bias;
  color: string;
  blurb: string;
}

// ============= Raw shape =============

interface RawEntities {
  locations?: string[];
  organizations?: string[];
  people?: string[];
  topics?: string[];
}

interface RawItem {
  story_id: number;
  headline: string;
  outlet: string;
  owner: string;
  ownership_details: string;
  country: string;
  url: string;
  cortex_summary: string;
  category: string;
  cluster_id: number;
  entities?: RawEntities;
}

// ============= Transform =============

function normalizeTopic(category: string): Topic {
  return (TOPICS as string[]).includes(category) ? (category as Topic) : "World";
}

export interface PillarData {
  events: NewsEvent[];
  articles: Article[];
  linkages: Record<string, SourceLinkage>;
  outlets: OutletMeta[];
  relations: Relation[];
}

const EMPTY: PillarData = {
  events: [],
  articles: [],
  linkages: {},
  outlets: [],
  relations: [],
};

function transform(raw: RawItem[]): PillarData {
  const nowIso = new Date().toISOString();

  const articles: Article[] = raw.map((item) => ({
    id: String(item.story_id),
    eventId: String(item.cluster_id),
    headline: item.headline,
    source: item.outlet,
    sourceBias: "Center",
    url: item.url,
    framingNote: item.cortex_summary,
  }));

  const clusterMap = new Map<string, RawItem[]>();
  raw.forEach((item) => {
    const key = String(item.cluster_id);
    const arr = clusterMap.get(key);
    if (arr) arr.push(item);
    else clusterMap.set(key, [item]);
  });

  const events: NewsEvent[] = Array.from(clusterMap.entries()).map(
    ([clusterId, items]) => {
      const first = items[0];
      return {
        id: clusterId,
        title: first.headline,
        summary: first.cortex_summary,
        topic: normalizeTopic(first.category),
        timestamp: nowIso,
        articleIds: items.map((it) => String(it.story_id)),
      };
    }
  );

  const linkages: Record<string, SourceLinkage> = {};
  raw.forEach((item) => {
    if (linkages[item.outlet]) return;
    linkages[item.outlet] = {
      owner: item.owner || "Unknown",
      majorFunders: item.country ? [item.country] : [],
      affiliations: item.ownership_details ? [item.ownership_details] : [],
      note: item.ownership_details || "",
    };
  });

  const outlets: OutletMeta[] = Object.keys(linkages).map((id) => ({
    id,
    label: id,
    bias: "Center",
    color: "var(--bias-center)",
    blurb: linkages[id].owner,
  }));

  const entitySetFor = (items: RawItem[]): Set<string> => {
    const s = new Set<string>();
    items.forEach((it) => {
      const e = it.entities ?? {};
      (e.people ?? []).forEach((v) => s.add(`p:${v.toLowerCase()}`));
      (e.organizations ?? []).forEach((v) => s.add(`o:${v.toLowerCase()}`));
      (e.locations ?? []).forEach((v) => s.add(`l:${v.toLowerCase()}`));
    });
    return s;
  };

  const clusterEntities = new Map<string, Set<string>>();
  clusterMap.forEach((items, id) => clusterEntities.set(id, entitySetFor(items)));

  const relations: Relation[] = [];
  const ids = Array.from(clusterMap.keys());
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = clusterEntities.get(ids[i])!;
      const b = clusterEntities.get(ids[j])!;
      if (a.size === 0 || b.size === 0) continue;
      let shared = 0;
      a.forEach((v) => { if (b.has(v)) shared++; });
      if (shared === 0) continue;
      const union = new Set<string>([...a, ...b]).size;
      relations.push({
        fromEventId: ids[i],
        toEventId: ids[j],
        type: "thematic",
        strength: Math.min(1, shared / Math.max(1, union)),
      });
    }
  }

  return { events, articles, linkages, outlets, relations };
}

// ============= Runtime fetch =============

let cachedPromise: Promise<PillarData> | null = null;

function loadPillarData(): Promise<PillarData> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch(`/data.json?t=${Date.now()}`)
    .then((r) => {
      console.log("[pillarData] status:", r.status);
      if (!r.ok) {
        throw new Error(`Failed to load data.json (${r.status})`);
      }
      return r.json();
    })
    .then((raw: RawItem[]) => {
      console.log("[pillarData] data length:", Array.isArray(raw) ? raw.length : undefined);
      console.log("[pillarData] first item:", Array.isArray(raw) ? raw[0] : raw);
      const filtered = Array.isArray(raw)
        ? raw.filter((item) => typeof item.cluster_id === "number" && item.cluster_id <= 182)
        : [];
      console.log("[pillarData] filtered length (cluster_id <= 182):", filtered.length);
      return transform(filtered);
    })
    .catch((err) => {
      console.error("[pillarData] fetch error:", err);
      cachedPromise = null;
      throw err;
    });
  return cachedPromise;
}

export function usePillarData(): PillarData {
  const [data, setData] = useState<PillarData>(EMPTY);
  useEffect(() => {
    let alive = true;
    loadPillarData()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { console.error("[pillarData]", e); });
    return () => { alive = false; };
  }, []);
  return data;
}

// ============= Tokens =============

export const TOPIC_COLORS: Record<Topic, string> = {
  Politics: "var(--topic-politics)",
  Economics: "var(--topic-economics)",
  Sports: "var(--topic-sports)",
  World: "var(--topic-world)",
  Tech: "var(--topic-tech)",
  Lifestyle: "var(--topic-lifestyle)",
  Health: "var(--topic-health)",
  Entertainment: "var(--topic-entertainment)",
  Editorial: "var(--topic-editorial)",
  Academia: "var(--topic-academia)",
};

export const BIAS_ORDER: Bias[] = ["Left", "Lean Left", "Center", "Lean Right", "Right"];
