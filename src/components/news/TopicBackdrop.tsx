import { useEffect, useState } from "react";
import type { Topic } from "@/data/pillarData";

// Hardcoded generic imagery per topic. Uses Unsplash's keyword endpoint
// which redirects to a relevant photo. Three images per topic.
const TOPIC_IMAGES: Record<Topic, string[]> = {
  Politics: [
    "https://source.unsplash.com/600x600/?capitol,government",
    "https://source.unsplash.com/600x600/?voting,election",
    "https://source.unsplash.com/600x600/?podium,politician",
  ],
  Economics: [
    "https://source.unsplash.com/600x600/?stockmarket,chart",
    "https://source.unsplash.com/600x600/?coins,finance",
    "https://source.unsplash.com/600x600/?skyscraper,bank",
  ],
  Sports: [
    "https://source.unsplash.com/600x600/?stadium,crowd",
    "https://source.unsplash.com/600x600/?soccer,ball",
    "https://source.unsplash.com/600x600/?runner,athletics",
  ],
  World: [
    "https://source.unsplash.com/600x600/?globe,earth",
    "https://source.unsplash.com/600x600/?worldmap",
    "https://source.unsplash.com/600x600/?flags,international",
  ],
  Tech: [
    "https://source.unsplash.com/600x600/?microchip,circuit",
    "https://source.unsplash.com/600x600/?code,programming",
    "https://source.unsplash.com/600x600/?robot,ai",
  ],
  Lifestyle: [
    "https://source.unsplash.com/600x600/?coffee,morning",
    "https://source.unsplash.com/600x600/?plants,interior",
    "https://source.unsplash.com/600x600/?fashion,style",
  ],
  Health: [
    "https://source.unsplash.com/600x600/?stethoscope,medicine",
    "https://source.unsplash.com/600x600/?heart,health",
    "https://source.unsplash.com/600x600/?pills,pharmacy",
  ],
  Entertainment: [
    "https://source.unsplash.com/600x600/?cinema,film",
    "https://source.unsplash.com/600x600/?concert,music",
    "https://source.unsplash.com/600x600/?stage,theater",
  ],
  Editorial: [
    "https://source.unsplash.com/600x600/?newspaper,press",
    "https://source.unsplash.com/600x600/?typewriter,writing",
    "https://source.unsplash.com/600x600/?pen,journal",
  ],
  Academia: [
    "https://source.unsplash.com/600x600/?library,books",
    "https://source.unsplash.com/600x600/?university,campus",
    "https://source.unsplash.com/600x600/?graduation,scholar",
  ],
};

// Fixed slots, each image lands in a distinct quadrant with its own
// drift animation. Drift keyframes are defined inline below.
const SLOTS = [
  { top: "8%", left: "6%", size: 220, rot: -6, anim: "tb-drift-a" },
  { top: "14%", right: "8%", size: 260, rot: 5, anim: "tb-drift-b" },
  { bottom: "10%", left: "18%", size: 200, rot: 4, anim: "tb-drift-c" },
  { bottom: "8%", right: "14%", size: 240, rot: -7, anim: "tb-drift-a" },
] as const;

interface Props {
  topic: Topic;
  popKey: number; // increment to trigger pop-forward animation
}

export function TopicBackdrop({ topic, popKey }: Props) {
  const images = TOPIC_IMAGES[topic] ?? [];
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    setPopping(true);
    const t = setTimeout(() => setPopping(false), 900);
    return () => clearTimeout(t);
  }, [popKey, topic]);

  return (
    <div
      key={topic}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <style>{`
        @keyframes tb-drift-a {
          0%,100% { transform: translate3d(0,0,0) rotate(var(--tb-rot)); }
          50% { transform: translate3d(14px,-18px,0) rotate(calc(var(--tb-rot) + 2deg)); }
        }
        @keyframes tb-drift-b {
          0%,100% { transform: translate3d(0,0,0) rotate(var(--tb-rot)); }
          50% { transform: translate3d(-16px,12px,0) rotate(calc(var(--tb-rot) - 2deg)); }
        }
        @keyframes tb-drift-c {
          0%,100% { transform: translate3d(0,0,0) rotate(var(--tb-rot)); }
          50% { transform: translate3d(10px,16px,0) rotate(calc(var(--tb-rot) + 3deg)); }
        }
        @keyframes tb-pop-in {
          0% { opacity: 0; transform: scale(0.55) rotate(var(--tb-rot)); filter: blur(0px); }
          60% { opacity: 1; transform: scale(1.18) rotate(var(--tb-rot)); filter: blur(0px); }
          100% { opacity: var(--tb-rest-opacity); transform: scale(1) rotate(var(--tb-rot)); filter: blur(8px); }
        }
      `}</style>

      {images.slice(0, SLOTS.length).map((src, i) => {
        const slot = SLOTS[i];
        const restOpacity = 0.18;
        const style: React.CSSProperties = {
          position: "absolute",
          width: slot.size,
          height: slot.size,
          top: "top" in slot ? slot.top : undefined,
          bottom: "bottom" in slot ? (slot as any).bottom : undefined,
          left: "left" in slot ? (slot as any).left : undefined,
          right: "right" in slot ? (slot as any).right : undefined,
          // CSS custom props consumed by keyframes
          ["--tb-rot" as any]: `${slot.rot}deg`,
          ["--tb-rest-opacity" as any]: String(restOpacity),
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.55)",
          opacity: restOpacity,
          filter: "blur(8px)",
          animation: popping
            ? `tb-pop-in 900ms ${i * 80}ms cubic-bezier(0.2,0.8,0.2,1) both`
            : `${slot.anim} ${14 + i * 2}s ease-in-out ${i * 0.7}s infinite`,
          willChange: "transform, opacity, filter",
        };
        return (
          <div key={`${topic}-${i}`} style={style}>
            <img
              src={src}
              alt=""
              loading="lazy"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
