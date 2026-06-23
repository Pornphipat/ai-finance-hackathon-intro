/**
 * Trust Verifier backend — Cloudflare Worker
 * อยู่ไม่ไหว อยู่ไม่ไหว เฮ้ย · AI × Finance Hackathon
 *
 * POST { "claim": "<financial claim>" }
 *   → { "agents": [{name, score}], "overall": int, "verdict": "..." }
 *
 * Calls Claude Opus 4.8 with a structured-output schema so the response is
 * guaranteed-valid JSON. The API key lives in the ANTHROPIC_API_KEY secret —
 * it is NEVER shipped to the browser.
 */

const MODEL = "claude-opus-4-8";
const AGENTS = ["News", "Filings", "Market", "Web RAG"];

const SYSTEM = [
  "You are a multi-agent financial-claim verifier.",
  "Four independent agents each judge how credible a financial claim is from",
  "their own data vantage point — News, Filings, Market, and Web RAG.",
  "Each agent scores 0-100 (higher = more verifiable/trustworthy).",
  "Scores should be realistic and vary meaningfully with the specific claim:",
  "vague, unverifiable, or implausible claims score lower; precise, checkable",
  "claims score higher. Keep the verdict to one short sentence.",
].join(" ");

export default {
  async fetch(request, env) {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "Server not configured (missing ANTHROPIC_API_KEY)" }, 500, cors);

    let claim = "";
    try { ({ claim } = await request.json()); } catch (_) {}
    claim = (claim || "").toString().slice(0, 200).trim();
    if (!claim) return json({ error: "Missing 'claim'." }, 400, cors);

    const body = {
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Claim: "${claim}"\n\nScore this claim's credibility from each agent's vantage point, give an overall score, and a one-sentence verdict.`,
      }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              agents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", enum: AGENTS },
                    score: { type: "integer" },
                  },
                  required: ["name", "score"],
                  additionalProperties: false,
                },
              },
              overall: { type: "integer" },
              verdict: { type: "string" },
            },
            required: ["agents", "overall", "verdict"],
            additionalProperties: false,
          },
        },
      },
    };

    let upstream;
    try {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return json({ error: "Upstream fetch failed", detail: String(e) }, 502, cors);
    }

    if (!upstream.ok) {
      const detail = await upstream.text();
      return json({ error: "Anthropic API error", status: upstream.status, detail }, 502, cors);
    }

    const data = await upstream.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let parsed;
    try { parsed = JSON.parse(text); } catch (_) {
      return json({ error: "Could not parse model output", text }, 502, cors);
    }
    return json(parsed, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}
