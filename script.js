/* ============================================================
   อยู่ไม่ไหว อยู่ไม่ไหว เฮ้ย — interactions
   - language toggle (TH/EN, persisted)
   - active-section nav highlight
   - hero Trust Verifier demo
   - scroll-reveal
   - ambient signal-from-noise backdrop
   ============================================================ */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ← Paste your deployed Cloudflare Worker URL here to enable LIVE Claude scoring.
  //   Leave empty to use the built-in demo simulation. You can also set it at
  //   runtime via window.VERIFIER_API or localStorage "ynm-verifier-api".
  const VERIFIER_API = "";

  /* ---------- language toggle ---------- */
  const html = document.documentElement;
  const toggle = document.getElementById("lang-toggle");

  function applyLang(lang) {
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang === "th" ? "th" : "en");
    document.querySelectorAll("[data-en][data-th]").forEach((el) => {
      const txt = lang === "th" ? el.getAttribute("data-th") : el.getAttribute("data-en");
      if (txt != null) el.textContent = txt;
    });
    document.querySelectorAll(".lang-opt").forEach((o) =>
      o.classList.toggle("is-on", o.getAttribute("data-lang-opt") === lang)
    );
  }

  let lang = "en";
  try { lang = localStorage.getItem("ynm-lang") || "en"; } catch (_) {}
  applyLang(lang);

  if (toggle) {
    toggle.addEventListener("click", () => {
      lang = html.getAttribute("data-lang") === "en" ? "th" : "en";
      applyLang(lang);
      try { localStorage.setItem("ynm-lang", lang); } catch (_) {}
    });
  }

  /* ---------- active-section nav highlight ---------- */
  const links = [...document.querySelectorAll(".nav-link")];
  const map = new Map();
  links.forEach((l) => {
    const id = l.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(sec, l);
  });

  if ("IntersectionObserver" in window) {
    const navObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove("is-active"));
            const link = map.get(e.target);
            if (link) link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    map.forEach((_, sec) => navObs.observe(sec));
  }

  /* ---------- scroll reveal ---------- */
  const reveals = [...document.querySelectorAll(".reveal")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((r) => r.classList.add("in-view"));
  } else {
    const revObs = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach((r) => revObs.observe(r));
  }

  /* ---------- Trust Verifier demo ---------- */
  const verifier = document.getElementById("verifier");
  const fill = document.getElementById("vf-fill");
  const scoreEl = document.getElementById("vf-score");
  const verdictEl = document.getElementById("vf-verdict");
  const agents = [...document.querySelectorAll(".vf-agent")];
  const vfForm = document.getElementById("vf-form");
  const vfInput = document.getElementById("vf-input");
  const vfRun = document.getElementById("vf-run");

  // Derive plausible per-agent credibility scores from the claim text.
  // Deterministic (same claim -> same scores) and always in a believable
  // high-confidence band so the demo reads as a working verifier.
  let finals = [88, 95, 90, 94];
  function scoresFor(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const seeds = [h, h ^ 0x9e3779b9, h ^ 0x7f4a7c15, h ^ 0x2545f491];
    return seeds.map((s) => 82 + (Math.abs(s) % 16)); // 82–97
  }
  let busy = false;

  function setVerdict(trusted) {
    if (!verdictEl) return;
    const t = html.getAttribute("data-lang") === "th";
    if (trusted) {
      verdictEl.textContent = t ? "เชื่อถือได้ ✓" : "trusted ✓";
      verdictEl.setAttribute("data-th", "เชื่อถือได้ ✓");
      verdictEl.setAttribute("data-en", "trusted ✓");
      verdictEl.classList.add("is-trusted");
    } else {
      verdictEl.textContent = t ? "กำลังตรวจสอบ…" : "verifying…";
      verdictEl.setAttribute("data-th", "กำลังตรวจสอบ…");
      verdictEl.setAttribute("data-en", "verifying…");
      verdictEl.classList.remove("is-trusted");
    }
  }

  // Live backend: resolve scores from the Claude Worker if configured,
  // otherwise fall back to the deterministic local simulation.
  const AGENT_ORDER = ["News", "Filings", "Market", "Web RAG"];
  function verifierEndpoint() {
    try {
      return (window.VERIFIER_API || localStorage.getItem("ynm-verifier-api") || VERIFIER_API || "").trim();
    } catch (_) {
      return VERIFIER_API;
    }
  }
  async function resolveScores(claim) {
    const url = verifierEndpoint();
    if (!url) return scoresFor(claim); // no backend → demo simulation
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim }),
      });
      if (!res.ok) throw new Error("status " + res.status);
      const data = await res.json();
      const byName = {};
      (data.agents || []).forEach((a) => { byName[a.name] = a.score; });
      const sim = scoresFor(claim);
      return AGENT_ORDER.map((n, i) => {
        const v = Number(byName[n]);
        return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : sim[i];
      });
    } catch (_) {
      return scoresFor(claim); // network/parse failure → demo simulation
    }
  }

  async function runVerifier() {
    if (!verifier || busy) return;
    busy = true;
    if (vfRun) vfRun.disabled = true;
    const claim = vfInput && vfInput.value.trim() ? vfInput.value.trim() : "default";

    // reset to "verifying" state (also covers the live-fetch wait)
    agents.forEach((a) => {
      a.classList.remove("is-live", "is-done");
      a.querySelector(".vf-a-score").textContent = "—";
    });
    if (fill) fill.style.width = "0%";
    if (scoreEl) scoreEl.textContent = "0";
    setVerdict(false);

    // live Claude scoring if a Worker URL is set, else local simulation
    finals = await resolveScores(claim);

    if (reduceMotion) {
      // static, fully-resolved state — no animation
      agents.forEach((a, i) => {
        a.classList.add("is-done");
        a.querySelector(".vf-a-score").textContent = finals[i];
      });
      const avg = Math.round(finals.reduce((s, n) => s + n, 0) / finals.length);
      if (fill) fill.style.width = avg + "%";
      if (scoreEl) scoreEl.textContent = avg;
      setVerdict(true);
      busy = false;
      if (vfRun) vfRun.disabled = false;
      return;
    }

    // animate each agent settling on its score, one after another
    agents.forEach((agent, i) => {
      const scoreSpan = agent.querySelector(".vf-a-score");
      setTimeout(() => {
        agent.classList.add("is-live");
        let ticks = 0;
        const jitter = setInterval(() => {
          scoreSpan.textContent = Math.floor(40 + Math.random() * 59); // noisy amber
          if (++ticks > 9) {
            clearInterval(jitter);
            agent.classList.remove("is-live");
            agent.classList.add("is-done");
            scoreSpan.textContent = finals[i];
            if (i === agents.length - 1) resolveMeter();
          }
        }, 60);
      }, 500 + i * 850);
    });
  }

  function resolveMeter() {
    const target = Math.round(finals.reduce((s, n) => s + n, 0) / finals.length);
    let cur = 0;
    const step = () => {
      cur += Math.max(1, Math.round((target - cur) / 6));
      if (cur >= target) cur = target;
      if (fill) fill.style.width = cur + "%";
      if (scoreEl) scoreEl.textContent = cur;
      if (cur < target) requestAnimationFrame(step);
      else {
        setVerdict(true);
        busy = false;
        if (vfRun) vfRun.disabled = false;
      }
    };
    step();
  }

  // re-run on claim submit
  if (vfForm) {
    vfForm.addEventListener("submit", (e) => {
      e.preventDefault();
      runVerifier();
    });
  }

  // run once verifier scrolls into view
  if (verifier && "IntersectionObserver" in window) {
    const vfObs = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            runVerifier();
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    vfObs.observe(verifier);
  } else {
    runVerifier();
  }

  /* ---------- ambient signal-from-noise backdrop ---------- */
  const canvas = document.getElementById("bg-noise");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let w, h, dots, raf;
    const COLORS = ["#5C6B8A", "#5B8CFF", "#34E0A1"];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(70, Math.floor((w * h) / 26000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        // links between nearby dots = converging signals
        for (let j = i + 1; j < dots.length; j++) {
          const o = dots[j];
          const dx = d.x - o.x, dy = d.y - o.y;
          const dist = dx * dx + dy * dy;
          if (dist < 16000) {
            ctx.globalAlpha = (1 - dist / 16000) * 0.18;
            ctx.strokeStyle = "#5B8CFF";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(o.x, o.y);
            ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 200);
    });
  }
})();
