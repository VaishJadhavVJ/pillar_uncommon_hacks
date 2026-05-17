import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { NewsEvent } from "@/data/pillarData";
import { cssVar } from "@/lib/cssVar";

export interface StoryNode {
  id: string;
  event: NewsEvent;
  outletCount: number;
  shortLabel: string;
  topic: string;
}

export interface StoryEdge {
  a: string;
  b: string;
  weight: number;
}

interface Props {
  nodes: StoryNode[];
  edges: StoryEdge[];
  selectedStoryId: string | null;
  onSelectStory: (id: string | null) => void;
  highlightIds?: Set<string>;
  backdrop?: React.ReactNode;
}

interface SimNode {
  id: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  node: StoryNode;
  pinned: boolean;
}

function fibSphere(i: number, n: number, radius: number): THREE.Vector3 {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  return new THREE.Vector3(
    radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi),
  );
}

function oklchToRgbString(input: string): string | null {
  const match = input.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)/i);
  if (!match) return null;

  const lightnessRaw = match[1];
  const chroma = Number(match[2]);
  const hue = Number(match[3]) * (Math.PI / 180);
  const lightness = lightnessRaw.endsWith("%")
    ? Number(lightnessRaw.slice(0, -1)) / 100
    : Number(lightnessRaw);

  if ([lightness, chroma, hue].some(Number.isNaN)) return null;

  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l ** 3;
  const m3 = m ** 3;
  const s3 = s ** 3;

  const linearR = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const linearG = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const linearB = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const toSrgb = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    const srgb = clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(srgb * 255);
  };

  return `rgb(${toSrgb(linearR)}, ${toSrgb(linearG)}, ${toSrgb(linearB)})`;
}

function resolveThemeColor(input: string, fallback: string): string {
  if (!input) return fallback;
  if (input.startsWith("oklch(")) return oklchToRgbString(input) ?? fallback;
  return input;
}

function topicColor(topic: string): string {
  const token = cssVar(`--topic-${topic.toLowerCase()}`, "");
  return resolveThemeColor(token, cssVar("--primary", "#7aa2ff"));
}

function Scene({
  nodes,
  edges,
  selectedStoryId,
  onSelectStory,
  highlightIds,
  hoverId,
  setHoverId,
  setOrbitEnabled,
}: Props & {
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  setOrbitEnabled: (b: boolean) => void;
}) {
  const simRef = useRef<Map<string, SimNode>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const { gl, camera } = useThree();

  // Drag state
  const dragRef = useRef<{
    id: string | null;
    plane: THREE.Plane;
    offset: THREE.Vector3;
    moved: boolean;
  }>({
    id: null,
    plane: new THREE.Plane(),
    offset: new THREE.Vector3(),
    moved: false,
  });

  useEffect(() => {
    const sim = simRef.current;
    nodes.forEach((n, i) => {
      const r = 0.4 + Math.min(1.3, n.outletCount * 0.2);
      const existing = sim.get(n.id);
      if (existing) {
        existing.node = n;
        existing.radius = r;
        return;
      }
      sim.set(n.id, {
        id: n.id,
        pos: fibSphere(i, Math.max(nodes.length, 1), 6),
        vel: new THREE.Vector3(),
        radius: r,
        node: n,
        pinned: false,
      });
    });
    for (const id of Array.from(sim.keys())) {
      if (!nodes.find((n) => n.id === id)) sim.delete(id);
    }
  }, [nodes]);

  const edgeColors = useMemo(() => ({
    base: new THREE.Color(resolveThemeColor(cssVar("--foreground", "#ffffff"), "#ffffff")),
    active: new THREE.Color(resolveThemeColor(cssVar("--primary", "#7aa2ff"), "#7aa2ff")),
  }), []);

  const lineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    return g;
  }, []);

  useEffect(() => {
    const positions = new Float32Array(edges.length * 6);
    const colors = new Float32Array(edges.length * 6);
    lineGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [edges.length, lineGeom]);

  useFrame((state, deltaSec) => {
    const dt = Math.min(0.05, deltaSec);
    const sim = simRef.current;
    const arr = Array.from(sim.values());
    const center = new THREE.Vector3(0, 0, 0);

    for (const n of arr) {
      if (n.pinned) continue;
      const toCenter = center.clone().sub(n.pos).multiplyScalar(0.4);
      n.vel.add(toCenter.multiplyScalar(dt));
    }
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i]; const b = arr[j];
        const diff = b.pos.clone().sub(a.pos);
        const d2 = diff.lengthSq() + 0.01;
        const f = 6 / d2;
        const dir = diff.normalize().multiplyScalar(f * dt);
        if (!a.pinned) a.vel.sub(dir);
        if (!b.pinned) b.vel.add(dir);
      }
    }
    for (const e of edges) {
      const a = sim.get(e.a); const b = sim.get(e.b);
      if (!a || !b) continue;
      const diff = b.pos.clone().sub(a.pos);
      const d = diff.length() + 0.001;
      const rest = 4 - Math.min(2, e.weight * 0.4);
      const k = 0.4 + e.weight * 0.12;
      const f = (d - rest) * k * dt;
      const dir = diff.normalize().multiplyScalar(f);
      if (!a.pinned) a.vel.add(dir);
      if (!b.pinned) b.vel.sub(dir);
    }
    for (const n of arr) {
      if (n.pinned) { n.vel.set(0, 0, 0); continue; }
      n.vel.multiplyScalar(0.9);
      n.pos.add(n.vel.clone().multiplyScalar(dt * 6));
    }

    if (groupRef.current) {
      for (const child of groupRef.current.children) {
        const id = (child as THREE.Object3D & { userData: { id?: string } }).userData.id;
        if (!id) continue;
        const n = sim.get(id);
        if (n) child.position.copy(n.pos);
      }
    }

    const posAttr = lineGeom.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = lineGeom.getAttribute("color") as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const a = sim.get(e.a); const b = sim.get(e.b);
      const o = i * 6;
      if (!a || !b) { for (let k = 0; k < 6; k++) posAttr.array[o + k] = 0; continue; }
      posAttr.array[o] = a.pos.x; posAttr.array[o + 1] = a.pos.y; posAttr.array[o + 2] = a.pos.z;
      posAttr.array[o + 3] = b.pos.x; posAttr.array[o + 4] = b.pos.y; posAttr.array[o + 5] = b.pos.z;

      const active = hoverId === e.a || hoverId === e.b || selectedStoryId === e.a || selectedStoryId === e.b;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i);
      const intensity = active ? 0.8 + pulse * 0.2 : 0.25 + Math.min(0.3, e.weight * 0.06);
      const c = active ? edgeColors.active : edgeColors.base;
      colAttr.array[o] = c.r * intensity; colAttr.array[o + 1] = c.g * intensity; colAttr.array[o + 2] = c.b * intensity;
      colAttr.array[o + 3] = c.r * intensity; colAttr.array[o + 4] = c.g * intensity; colAttr.array[o + 5] = c.b * intensity;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  useEffect(() => () => { gl.domElement.style.cursor = "default"; }, [gl]);

  function onNodeDown(id: string, e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const sim = simRef.current.get(id);
    if (!sim) return;
    // Drag plane perpendicular to camera direction, through node
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    dragRef.current.plane.setFromNormalAndCoplanarPoint(camDir, sim.pos.clone());
    const hit = new THREE.Vector3();
    e.ray.intersectPlane(dragRef.current.plane, hit);
    dragRef.current.offset.copy(sim.pos).sub(hit);
    dragRef.current.id = id;
    dragRef.current.moved = false;
    sim.pinned = true;
    sim.vel.set(0, 0, 0);
    setOrbitEnabled(false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = "grabbing";
  }

  function onNodeMove(e: ThreeEvent<PointerEvent>) {
    const d = dragRef.current;
    if (!d.id) return;
    e.stopPropagation();
    const sim = simRef.current.get(d.id);
    if (!sim) return;
    const hit = new THREE.Vector3();
    if (e.ray.intersectPlane(d.plane, hit)) {
      sim.pos.copy(hit.add(d.offset));
      d.moved = true;
    }
  }

  function onNodeUp(id: string, e: ThreeEvent<PointerEvent>) {
    const d = dragRef.current;
    e.stopPropagation();
    const sim = simRef.current.get(id);
    if (sim) sim.pinned = false; // release so forces resume
    const wasDrag = d.moved;
    d.id = null;
    d.moved = false;
    setOrbitEnabled(true);
    gl.domElement.style.cursor = "pointer";
    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    if (!wasDrag) {
      onSelectStory(selectedStoryId === id ? null : id);
    }
  }

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 12, 10]} intensity={1.6} color="#ffffff" />
      <pointLight position={[-12, -8, -6]} intensity={0.8} color="#7aa2ff" />
      <pointLight position={[0, 0, 18]} intensity={0.4} color="#ffd9a8" />

      <Stars radius={60} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />

      <lineSegments geometry={lineGeom}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} />
      </lineSegments>

      <group ref={groupRef} onPointerMissed={() => onSelectStory(null)}>
        {nodes.map((n) => {
          const color = topicColor(n.topic);
          const isSel = selectedStoryId === n.id;
          const isHover = hoverId === n.id;
          const isExt = !!highlightIds && highlightIds.has(n.id);
          const glow = isSel || isHover || isExt;
          const radius = 0.4 + Math.min(1.3, n.outletCount * 0.2);
          return (
            <group key={n.id} userData={{ id: n.id }}>
              <mesh>
                <sphereGeometry args={[radius * (glow ? 2.4 : 1.7), 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={glow ? 0.22 : 0.1} depthWrite={false} />
              </mesh>
              <mesh
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoverId(n.id);
                  if (!dragRef.current.id) gl.domElement.style.cursor = "grab";
                }}
                onPointerOut={() => {
                  setHoverId(null);
                  if (!dragRef.current.id) gl.domElement.style.cursor = "default";
                }}
                onPointerDown={(e) => onNodeDown(n.id, e)}
                onPointerMove={onNodeMove}
                onPointerUp={(e) => onNodeUp(n.id, e)}
              >
                <sphereGeometry args={[radius, 48, 48]} />
                <meshBasicMaterial color={color} toneMapped={false} />
              </mesh>
                <mesh scale={1.018}>
                <sphereGeometry args={[radius, 48, 48]} />
                <meshPhysicalMaterial
                    color={color}
                  transparent
                    opacity={glow ? 0.1 : 0.05}
                  roughness={0.08}
                  metalness={0}
                  clearcoat={1}
                  clearcoatRoughness={0.04}
                  transmission={0.02}
                  ior={1.2}
                  depthWrite={false}
                />
              </mesh>
              <Billboard position={[0, radius + 0.5, 0]}>
                <Html
                  center
                  distanceFactor={8}
                  zIndexRange={[10, 0]}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.2,
                      color: "white",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: glow ? "rgba(10,12,20,0.92)" : "rgba(10,12,20,0.7)",
                      border: `1px solid ${glow ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"}`,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    {n.shortLabel}
                  </div>
                </Html>
              </Billboard>
            </group>
          );
        })}
      </group>
    </>
  );
}

export function StoryConstellation(props: Props) {
  const { nodes, edges } = props;
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  useEffect(() => setMounted(true), []);
  const hoveredNode = useMemo(() => nodes.find((n) => n.id === hoverId) ?? null, [nodes, hoverId]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, oklch(0.20 0.02 250) 0%, oklch(0.12 0.012 250) 75%, oklch(0.09 0.01 250) 100%)",
      }}
    >
      {props.backdrop}
      {mounted && (
        <Canvas camera={{ position: [0, 0, 16], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <Scene
              {...props}
              hoverId={hoverId}
              setHoverId={setHoverId}
              setOrbitEnabled={setOrbitEnabled}
            />
            <OrbitControls
              enabled={orbitEnabled}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.6}
              zoomSpeed={0.8}
              minDistance={8}
              maxDistance={40}
            />
          </Suspense>
        </Canvas>
      )}

      <div className="pointer-events-none absolute left-4 top-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Constellation · {nodes.length} stories · {edges.length} links · drag stars to reposition · orbit to rotate
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

export { StoryConstellation as StoryConstellation3D };
