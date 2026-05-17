// Resolve a CSS custom property to a concrete color string (for canvas rendering).
export function cssVar(name: string, fallback = "#888"): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
