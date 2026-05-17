import { createFileRoute } from "@tanstack/react-router";

// Returns the ElevenLabs API key to the browser so the client can call
// ElevenLabs directly (residential IP, free-tier friendly).
// SECURITY: key is exposed to anyone who loads the app. Rotate after demo.
export const Route = createFileRoute("/api/tts-key")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ key }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
