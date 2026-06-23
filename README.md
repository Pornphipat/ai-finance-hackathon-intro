# อยู่ไม่ไหว อยู่ไม่ไหว เฮ้ย — AI × Finance Hackathon

One-page team intro for the **CFA Society Thailand AI × Finance Hackathon**.

We turn a flood of conflicting financial data into one trusted signal, using
multiple agents that fact-check each other to suppress hallucination.

> **The hard part? That's on us.** — ให้ความยุ่งยาก_เป็นเรื่องของเรา

## What's inside
- Sticky nav with section jumps + TH/EN toggle
- Interactive **Multi-Agent Trust Verifier** (type a claim → agents score it)
- Animated SVG system architecture (Sources → RAG → multi-agent verify → trusted signal)
- 5 team-member cards (placeholders to fill in)

## Run locally
Open `index.html` in any browser. No build step.

## Fill in later
- `index.html` → replace `[PROJECT NAME]` in the hero.
- Each `.member` card → set `[Name]` / `[Role]`, drop a photo into the `.avatar`
  (`<img src="photos/your.jpg" alt="Name">`), and update the links.

## Live AI scoring (optional)
The Trust Verifier runs on a built-in demo simulation out of the box. To make it
score claims with **real Claude Opus 4.8**, deploy the Cloudflare Worker in
[`worker/`](worker/README.md) and paste its URL into `VERIFIER_API` in `script.js`.
The Anthropic API key lives only in the Worker secret — never in the static site.

## Stack
Plain HTML / CSS / JS (no build step). Backend: Cloudflare Worker → Claude Opus 4.8.
Fonts: Space Grotesk, Inter, IBM Plex Mono.
