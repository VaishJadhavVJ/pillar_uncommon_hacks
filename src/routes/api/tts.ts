import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Per-session sliding-window rate limit.
// NOTE: in-memory, per Worker isolate. Not a strict global cap — see chat notes.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;          // ~12 TTS requests / minute / session
const MAX_TEXT_LEN = 4000;
const buckets = new Map<string, number[]>();

function getOrSetSessionId(request: Request): { id: string; setCookie?: string } {
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)tts_sid=([A-Za-z0-9_-]{16,64})/);
  if (m) return { id: m[1] };
  const id = crypto.randomUUID().replace(/-/g, "");
  return {
    id,
    setCookie: `tts_sid=${id}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`,
  };
}

function checkLimit(sid: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const arr = (buckets.get(sid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - arr[0])) / 1000);
    buckets.set(sid, arr);
    return { ok: false, retryAfter };
  }
  arr.push(now);
  buckets.set(sid, arr);
  return { ok: true };
}

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return json(500, { error: "ELEVENLABS_API_KEY is not configured" });
        }

        const session = getOrSetSessionId(request);
        const cookieHeader: Record<string, string> = session.setCookie
          ? { "Set-Cookie": session.setCookie }
          : {};

        const limit = checkLimit(session.id);
        if (!limit.ok) {
          return json(
            429,
            { error: `Rate limit exceeded. Retry in ${limit.retryAfter}s.` },
            { "Retry-After": String(limit.retryAfter), ...cookieHeader }
          );
        }

        let body: { text?: string; voiceId?: string; modelId?: string };
        try {
          body = await request.json();
        } catch {
          return json(400, { error: "Invalid JSON body" }, cookieHeader);
        }

        const text = (body.text ?? "").toString().trim();
        const voiceId = (body.voiceId ?? "").toString().trim();
        const modelId = (body.modelId ?? "eleven_turbo_v2_5").toString().trim();

        if (!text || !voiceId) {
          return json(400, { error: "Missing text or voiceId" }, cookieHeader);
        }
        if (text.length > MAX_TEXT_LEN) {
          return json(400, { error: `Text exceeds ${MAX_TEXT_LEN} chars` }, cookieHeader);
        }
        if (!/^[A-Za-z0-9]+$/.test(voiceId)) {
          return json(400, { error: "Invalid voiceId format" }, cookieHeader);
        }
        if (!/^[a-z0-9_]+$/.test(modelId)) {
          return json(400, { error: "Invalid modelId format" }, cookieHeader);
        }

        let upstream: Response;
        try {
          upstream = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({ text, model_id: modelId }),
            }
          );
        } catch (e) {
          return json(
            502,
            { error: "Failed to reach ElevenLabs", detail: e instanceof Error ? e.message : String(e) },
            cookieHeader
          );
        }

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          // Surface upstream status verbatim (401 bad key, 422 invalid voice, 429 quota, etc.)
          return json(
            upstream.status,
            {
              error: `ElevenLabs ${upstream.status} ${upstream.statusText}`,
              detail: errText.slice(0, 1000),
            },
            cookieHeader
          );
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            ...CORS,
            ...cookieHeader,
          },
        });
      },
    },
  },
});
