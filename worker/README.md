# Trust Verifier backend (Cloudflare Worker)

Powers **live** multi-agent scoring with Claude Opus 4.8. The browser calls this
Worker; the Worker calls Claude with your API key. The key is stored as an
encrypted Cloudflare secret and is **never** sent to the browser or committed to git.

## Deploy (~5 minutes)

You need: a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and an
[Anthropic API key](https://console.anthropic.com) (`sk-ant-...`).

```bash
cd worker

# 1. Log in to Cloudflare (opens a browser)
npx wrangler login

# 2. Store your Anthropic key as an encrypted secret (paste when prompted)
npx wrangler secret put ANTHROPIC_API_KEY

# 3. Deploy
npx wrangler deploy
```

`wrangler deploy` prints a URL like:

```
https://trust-verifier.<your-subdomain>.workers.dev
```

## Wire it to the site

Open `../script.js`, find `const VERIFIER_API = "";` near the top, and paste the
Worker URL:

```js
const VERIFIER_API = "https://trust-verifier.<your-subdomain>.workers.dev";
```

Commit + push — GitHub Pages redeploys and the hero verifier now scores live.
(Until you set this, the site uses the built-in demo simulation automatically;
if the Worker is ever unreachable, it falls back to the simulation too.)

## Test the Worker directly

```bash
curl -X POST https://trust-verifier.<your-subdomain>.workers.dev \
  -H "content-type: application/json" \
  -d '{"claim":"Q3 revenue grew 18% YoY"}'
```

Expected shape:

```json
{
  "agents": [
    { "name": "News", "score": 88 },
    { "name": "Filings", "score": 95 },
    { "name": "Market", "score": 90 },
    { "name": "Web RAG", "score": 94 }
  ],
  "overall": 92,
  "verdict": "Plausible and checkable against quarterly filings."
}
```

## Cost note
Each verify is one short Claude Opus 4.8 call (a few hundred tokens). Cheap, but
real — the key is yours and you're billed for usage. Cloudflare Workers' free
tier (100k requests/day) is far more than a hackathon demo needs.
