import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsEvent } from "@/data/pillarData";
import { cssVar } from "@/lib/cssVar";

export interface StoryNode {
  id: string;
  event: NewsEvent;
  outletCount: number;
  shortLabel: string; // 5-word headline
  topic: string;
}

export interface StoryEdge {
  a: string;
  b: string;
  weight: number; // shared outlets (+ topic bonus)
}

interface Props {
  nodes: StoryNode[];
  edges: StoryEdge[];
  selectedStoryId: string | null;
  onSelectStory: (id: string | null) => void;
  highlightIds?: Set<string>;
  backdrop?: React.ReactNode;
}

export function StoryConstellation2D({
  nodes, edges, selectedStoryId, onSelectStory, highlightIds, backdrop,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  // simulation state
  const simRef = useRef<
    Record<string, { x: number; y: number; vx: number; vy: number; r: number; node: StoryNode; pinned?: boolean }>
  >({});
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

  // alpha cooling (d3-force style): forces scale by alpha, alpha decays each tick.
  // Interactions reheat. When alpha is near zero the layout is "settled" and
  // we skip physics entirely so nothing wiggles.
  const alphaRef = useRef(1);
  const ALPHA_MIN = 0.005;
  const ALPHA_DECAY = 0.018;     // per tick — reach min in ~5–6s
  const ALPHA_TARGET = 0;
  const VELOCITY_DECAY = 0.4;    // friction; higher = faster settle
  const reheat = (a = 0.6) => { alphaRef.current = Math.max(alphaRef.current, a); };

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: Math.max(320, width), h: Math.max(320, height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Seed nodes
  useEffect(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    nodes.forEach((n, i) => {
      const r = 9 + Math.min(22, n.outletCount * 5);
      if (simRef.current[n.id]) {
        simRef.current[n.id].r = r;
        simRef.current[n.id].node = n;
        return;
      }
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const radius = Math.min(size.w, size.h) * 0.34;
      simRef.current[n.id] = {
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0, r, node: n,
      };
    });
    Object.keys(simRef.current).forEach((id) => {
      if (!nodes.find((n) => n.id === id)) delete simRef.current[id];
    });
    reheat(1);
  }, [nodes, size.w, size.h]);

  useEffect(() => { reheat(0.3); }, [selectedStoryId]);

  // Animation loop
  useEffect(() => {
    let raf = 0;
    let t0 = performance.now();
    const fg = cssVar("--foreground") as string;
    const muted = cssVar("--muted-foreground") as string;

    const tick = (t: number) => {
      const dt = Math.min(32, t - t0) / 16;
      t0 = t;
      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(tick); return; }

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
        canvas.width = size.w * dpr;
        canvas.height = size.h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);

      drawStars(ctx, size.w, size.h, t);

      const sim = simRef.current;
      const ids = Object.keys(sim);
      const cx = size.w / 2, cy = size.h / 2;

      const alpha = alphaRef.current;
      const physicsOn = alpha > ALPHA_MIN || !!dragRef.current;

      if (physicsOn) {
        // center gravity (alpha-scaled)
        ids.forEach((id) => {
          const n = sim[id];
          n.vx += (cx - n.x) * 0.0006 * alpha * dt;
          n.vy += (cy - n.y) * 0.0006 * alpha * dt;
        });

        // repulsion (alpha-scaled) — stronger to spread the constellation
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = sim[ids[i]], b = sim[ids[j]];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy + 0.01;
            const f = (16000 + (a.r + b.r) * 120) / d2;
            const d = Math.sqrt(d2);
            const fx = (dx / d) * f * alpha * dt;
            const fy = (dy / d) * f * alpha * dt;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;

            // hard minimum separation so labels never collide
            const minDist = a.r + b.r + 56;
            if (d < minDist) {
              const push = (minDist - d) * 0.5;
              const ux = dx / d, uy = dy / d;
              if (!a.pinned) { a.x -= ux * push; a.y -= uy * push; }
              if (!b.pinned) { b.x += ux * push; b.y += uy * push; }
            }
          }
        }

        // springs (alpha-scaled) — longer rest length for breathing room
        edges.forEach((e) => {
          const a = sim[e.a], b = sim[e.b];
          if (!a || !b) return;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const rest = 260 - Math.min(120, e.weight * 22);
          const k = 0.008 + e.weight * 0.003;
          const f = (d - rest) * k * alpha * dt;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        });

        // integrate with velocity decay
        const damp = Math.pow(1 - VELOCITY_DECAY, dt);
        ids.forEach((id) => {
          const n = sim[id];
          if (n.pinned) { n.vx = 0; n.vy = 0; return; }
          n.vx *= damp;
          n.vy *= damp;
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          const m = n.r + 6;
          if (n.x < m) { n.x = m; n.vx *= -0.4; }
          if (n.x > size.w - m) { n.x = size.w - m; n.vx *= -0.4; }
          if (n.y < m) { n.y = m; n.vy *= -0.4; }
          if (n.y > size.h - m) { n.y = size.h - m; n.vy *= -0.4; }
        });

        // cool down (only when not being dragged)
        if (!dragRef.current) {
          alphaRef.current = alpha + (ALPHA_TARGET - alpha) * ALPHA_DECAY * dt;
        }
      }

      // edges
      edges.forEach((e) => {
        const a = sim[e.a], b = sim[e.b];
        if (!a || !b) return;
        const active = hoverId === e.a || hoverId === e.b || selectedStoryId === e.a || selectedStoryId === e.b;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + (a.x + b.x) * 0.002);
        const baseAlpha = 0.1 + Math.min(0.22, e.weight * 0.05);
        const alpha = active ? 0.55 + pulse * 0.25 : baseAlpha + pulse * 0.05;
        ctx.strokeStyle = active
          ? withAlpha(cssVar("--primary") as string, alpha)
          : withAlpha(fg, alpha);
        ctx.lineWidth = 0.5 + Math.min(2, e.weight * 0.35);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      // nodes
      ids.forEach((id) => {
        const n = sim[id];
        const isHover = hoverId === id;
        const isSel = selectedStoryId === id;
        const isExt = !!highlightIds && highlightIds.has(id);
        const glow = isHover || isSel || isExt;

        const topicVar = `--topic-${n.node.topic.toLowerCase()}`;
        let color = cssVar(topicVar) as string;
        if (!color) color = cssVar("--primary") as string;

        const pulse = glow ? 1 + Math.sin(t * 0.005) * 0.14 : 1;
        const haloR = n.r * (glow ? 2.6 : 1.8) * pulse;

        const grd = ctx.createRadialGradient(n.x, n.y, 1, n.x, n.y, haloR);
        grd.addColorStop(0, withAlpha(color, glow ? 0.6 : 0.28));
        grd.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.strokeStyle = isSel ? (cssVar("--primary") as string) : withAlpha(fg, 0.45);
        ctx.stroke();

        // label
        ctx.font = `500 11px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = glow ? fg : muted;
        ctx.fillText(n.node.shortLabel, n.x, n.y + n.r + 6);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h, edges, selectedStoryId, hoverId, highlightIds]);

  const localXY = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pickAt = (x: number, y: number) => {
    return Object.entries(simRef.current).find(([, n]) => {
      const dx = n.x - x, dy = n.y - y;
      return dx * dx + dy * dy <= (n.r + 6) ** 2;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = localXY(e);
    const hit = pickAt(x, y);
    if (!hit) { dragRef.current = null; return; }
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: hit[0], moved: false };
    simRef.current[hit[0]].pinned = true;
    reheat(0.5);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = localXY(e);
    if (dragRef.current) {
      const n = simRef.current[dragRef.current.id];
      if (n) {
        if (Math.hypot(n.x - x, n.y - y) > 3) dragRef.current.moved = true;
        n.x = x; n.y = y; n.vx = 0; n.vy = 0;
      }
      setHoverId(dragRef.current.id);
      if (wrapRef.current) wrapRef.current.style.cursor = "grabbing";
      return;
    }
    const hit = pickAt(x, y);
    const id = hit?.[0] ?? null;
    setHoverId(id);
    if (wrapRef.current) wrapRef.current.style.cursor = id ? "grab" : "default";
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
      const n = simRef.current[drag.id];
      if (n) {
        n.pinned = false;
        // Zero out velocity on release so the node doesn't snap back
        n.vx = 0; n.vy = 0;
      }
      if (!drag.moved) {
        onSelectStory(drag.id === selectedStoryId ? null : drag.id);
      }
      dragRef.current = null;
      // Re-energize so neighbors gently re-settle around the new position,
      // then cool to rest.
      reheat(0.4);
      return;
    }
    // empty-space click clears selection
    const { x, y } = localXY(e);
    if (!pickAt(x, y)) onSelectStory(null);
  };

  const hoveredNode = useMemo(
    () => nodes.find((n) => n.id === hoverId) ?? null,
    [nodes, hoverId]
  );

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseLeave={() => { setHoverId(null); if (wrapRef.current) wrapRef.current.style.cursor = "default"; }}
      style={{ touchAction: "none",
        background:
          "radial-gradient(ellipse at center, oklch(0.20 0.02 250) 0%, oklch(0.12 0.012 250) 75%, oklch(0.09 0.01 250) 100%)",
      }}
    >
      {backdrop}
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h, display: "block", position: "absolute", inset: 0 }}
      />

      <div className="pointer-events-none absolute left-4 top-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Constellation · {nodes.length} stories · {edges.length} links · node size = outlets covering
      </div>

      {hoveredNode && (
        <div className="pointer-events-none absolute bottom-3 left-4 max-w-sm rounded-md border border-border bg-card/85 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <div className="font-serif text-sm text-foreground">{hoveredNode.event.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {hoveredNode.topic} · {hoveredNode.outletCount} outlets covering · click for coverage
          </div>
        </div>
      )}
    </div>
  );
}

function withAlpha(color: string, a: number) {
  if (!color) return `rgba(255,255,255,${a})`;
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
  if (color.startsWith("oklch")) {
    return color.replace(/oklch\(([^)]+)\)/, (_m, inner) => `oklch(${inner} / ${a})`);
  }
  return color;
}

const STARS = Array.from({ length: 110 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.1 + 0.2,
  tw: Math.random() * Math.PI * 2,
}));
function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  STARS.forEach((s) => {
    const a = 0.25 + Math.sin(t * 0.001 + s.tw) * 0.15;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}
