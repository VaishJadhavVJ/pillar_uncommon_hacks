import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

interface ScriptRequest {
  systemPrompt?: string;
  userPrompt?: string;
}

export const Route = createFileRoute("/api/panel-script")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json(500, { error: "LOVABLE_API_KEY not configured" });

        let body: ScriptRequest;
        try {
          body = (await request.json()) as ScriptRequest;
        } catch {
          return json(400, { error: "Invalid JSON" });
        }
        const systemPrompt = (body.systemPrompt ?? "").toString().slice(0, 4000);
        const userPrompt = (body.userPrompt ?? "").toString().slice(0, 8000);
        if (!systemPrompt || !userPrompt) {
          return json(400, { error: "Missing systemPrompt or userPrompt" });
        }

        let upstream: Response;
        try {
          upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "emit_panel_script",
                      description:
                        "Emit the panel script as an ordered list of speaker turns.",
                      parameters: {
                        type: "object",
                        properties: {
                          turns: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                speaker: { type: "string" },
                                line: { type: "string" },
                              },
                              required: ["speaker", "line"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["turns"],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: {
                  type: "function",
                  function: { name: "emit_panel_script" },
                },
              }),
            }
          );
        } catch (e) {
          return json(502, {
            error: "AI gateway unreachable",
            detail: e instanceof Error ? e.message : String(e),
          });
        }

        if (upstream.status === 429) {
          return json(429, { error: "Rate limited by AI gateway. Try again shortly." });
        }
        if (upstream.status === 402) {
          return json(402, { error: "AI workspace credits exhausted." });
        }
        if (!upstream.ok) {
          const t = await upstream.text().catch(() => "");
          return json(upstream.status, {
            error: `AI gateway ${upstream.status}`,
            detail: t.slice(0, 500),
          });
        }

        const data = (await upstream.json()) as {
          choices?: Array<{
            message?: {
              tool_calls?: Array<{
                function?: { arguments?: string };
              }>;
              content?: string;
            };
          }>;
        };
        const args =
          data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        let turns: Array<{ speaker: string; line: string }> = [];
        if (args) {
          try {
            const parsed = JSON.parse(args) as {
              turns?: Array<{ speaker: string; line: string }>;
            };
            turns = Array.isArray(parsed.turns) ? parsed.turns : [];
          } catch {
            /* fall through */
          }
        }
        return json(200, { turns });
      },
    },
  },
});
