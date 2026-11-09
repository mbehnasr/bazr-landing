/* بذر · سه دنیا — the art and the behaviour of /bzr/, drawn in code (BZR-182, second version).
   Nothing here comes from the app: no painting, no scenes, no characters. Three worlds, each its own visual language:
     بدن  sand and terracotta: lines of terrain that rise and fall like a breath, a warmth that pulses slowly;
     ذهن  deep teal: ripples spreading from a clear lens of focus, and its reflection;
     روح  dawn violet: an orb rising, rays turning very slowly, a soft aurora, a few stars.
   The emblem is one sphere cut by two meridians into the three worlds, read right to left as ب ذ ر. Choosing a world
   turns the sphere until that world faces you. Canvas only; at most 30 frames a second, and only while a canvas is on
   screen in a visible tab. Under «کاهش حرکت» every canvas is one still, finished frame. */
(() => {
  "use strict";
  const root = document.documentElement;
  const DPR = Math.min(matchMedia("(pointer: coarse)").matches ? 1.5 : 2, window.devicePixelRatio || 1);  // a touch screen: 1.5× at most (the art is soft; the letters are HTML)
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const STILL_T = 2.6; // the moment a still frame shows

  /* ════ The three worlds. Each draws into a box, around an anchor (ax, ay), at a scale S (about a radius); r is the
     part of the box that will be seen (fills stop there, so a thin sliver costs a thin sliver). ════ */
  const cache = new Map();
  function backdrop(key, w, h, paint) {
    const k = key + w + "x" + h;
    let o = cache.get(k);
    if (!o) { o = document.createElement("canvas"); o.width = Math.max(1, Math.round(w)); o.height = Math.max(1, Math.round(h)); paint(o.getContext("2d"), o.width, o.height); cache.set(k, o); if (cache.size > 24) cache.delete(cache.keys().next().value); }
    return o;
  }
  function blit(c, o, b, r) {
    // copy the part of a box-sized backdrop that falls inside r
    const sx = Math.max(0, r.x - b.x), sy = Math.max(0, r.y - b.y), sw = Math.min(o.width - sx, r.w), sh = Math.min(o.height - sy, r.h);
    if (sw > 0 && sh > 0) c.drawImage(o, sx, sy, sw, sh, b.x + sx, b.y + sy, sw, sh);
  }
  function body(c, b, ax, ay, S, t, r = b) {
    blit(c, backdrop("body", b.w, b.h, (o, w, h) => { const g = o.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#f5ddbd"); g.addColorStop(.4, "#df9d68"); g.addColorStop(.76, "#ad5d2c"); g.addColorStop(1, "#77391a"); o.fillStyle = g; o.fillRect(0, 0, w, h); }), b, r);
    const br = .5 + .5 * Math.sin(t * TAU / 6.4);             // one slow breath, about 6.4 s
    const wy = ay - S * .06, D = S * 2;
    const glow = backdrop("warm", D, D, (o, w) => { const g = o.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(255,230,190,.5)"); g.addColorStop(.55, "rgba(255,214,160,.13)"); g.addColorStop(1, "rgba(255,214,160,0)"); o.fillStyle = g; o.fillRect(0, 0, w, w); });
    c.globalAlpha = .72 + .28 * br; blit(c, glow, { x: ax - glow.width / 2, y: wy - glow.height / 2 }, r); c.globalAlpha = 1;
    // terrain: lines that rise over the anchor like a chest on a breath, and drift like dunes (only where seen)
    const n = 15, steps = Math.max(6, Math.round(48 * r.w / b.w)), x0 = r.x - 2, dx = (r.w + 4) / steps, mid = 7;
    const line = (i, out) => {
      const f = (i + .5) / n, y0 = b.y + f * b.h, lift = Math.sin(f * Math.PI) * (.12 + .05 * br);
      for (let k = 0; k <= steps; k++) {
        const x = x0 + dx * k, u = (x - ax) / S;
        out[k] = y0 + S * (.036 * Math.sin(u * 2.3 + i * .62 + t * .3) + .018 * Math.sin(u * 5.2 - t * .42 + i * 1.7) - lift * Math.exp(-u * u * 1.15));
      }
      return f;
    };
    const ys = new Array(steps + 1);
    c.lineWidth = 1.15 * DPR; c.lineCap = "round"; c.lineJoin = "round";
    for (let i = 0; i < n; i++) {
      const f = line(i, ys);
      c.strokeStyle = `rgba(255,241,224,${(.16 + .44 * f).toFixed(3)})`;
      c.beginPath(); for (let k = 0; k <= steps; k++) { if (k) c.lineTo(x0 + dx * k, ys[k]); else c.moveTo(x0, ys[k]); } c.stroke();
    }
    // the pulse: a soft bead of light travels the middle line, right to left, once every 7 s, fading in and out at the
    // edges of what is seen (in motion only: held still, a bead would read as a mark)
    if (reduce.matches || r.w < b.w * .3) return;
    line(mid, ys);
    const q = (t / 7) % 1, env = Math.pow(Math.sin(q * Math.PI), 1.4);
    if (env < .03) return;
    const head = (1 - q) * steps, k0 = Math.floor(head), fr = head - k0;
    const hx = x0 + dx * head, hy = ys[k0] + (ys[Math.min(steps, k0 + 1)] - ys[k0]) * fr;
    const bead = backdrop("bead", 64 * DPR, 64 * DPR, (o, w) => { const g = o.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(255,250,236,1)"); g.addColorStop(.12, "rgba(255,244,222,.9)"); g.addColorStop(.35, "rgba(255,230,196,.32)"); g.addColorStop(1, "rgba(255,230,196,0)"); o.fillStyle = g; o.fillRect(0, 0, w, w); });
    c.globalAlpha = env; c.drawImage(bead, hx - bead.width / 2, hy - bead.height / 2); c.globalAlpha = 1;
  }

  function mind(c, b, ax, ay, S, t, r = b) {
    const fy = ay - S * .1;
    // the deep water: one large radial backdrop, moved with the focus
    const D = S * 3.2, o = backdrop("mind", D, D, (o, w) => { const g = o.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w * .4844); g.addColorStop(0, "#5fbab3"); g.addColorStop(.28, "#2a7e7f"); g.addColorStop(.68, "#124c50"); g.addColorStop(1, "#092d31"); o.fillStyle = g; o.fillRect(0, 0, w, w); });
    blit(c, o, { x: ax - o.width / 2, y: fy - o.height / 2 }, r);
    // ripples spreading from the focus, slowly, fading as they go
    const n = 6, P = 9.5;
    for (let i = 0; i < n; i++) {
      const p = ((t / P) + i / n) % 1, a = Math.pow(1 - p, 1.7) * .55;
      c.strokeStyle = `rgba(214,241,235,${a.toFixed(3)})`; c.lineWidth = (1.45 - p * .65) * DPR;
      c.beginPath(); c.arc(ax, fy, S * (.19 + p * 1.3), 0, TAU); c.stroke();
    }
    // the lens: a clear disc of focus with a bright rim
    const r0 = S * .15;
    const lg = c.createRadialGradient(ax - r0 * .35, fy - r0 * .42, r0 * .08, ax, fy, r0);
    lg.addColorStop(0, "rgba(240,253,250,.96)"); lg.addColorStop(.55, "rgba(152,216,208,.55)"); lg.addColorStop(1, "rgba(84,172,166,.14)");
    c.fillStyle = lg; c.beginPath(); c.arc(ax, fy, r0, 0, TAU); c.fill();
    c.strokeStyle = "rgba(232,251,247,.9)"; c.lineWidth = 1.35 * DPR; c.stroke();
    // its reflection on still water
    c.lineCap = "round";
    for (let j = 0; j < 5; j++) {
      const yy = fy + S * (.32 + j * .085), w = S * (.24 - j * .035) * (1 + .14 * Math.sin(t * 1.05 + j * 1.3));
      c.strokeStyle = `rgba(202,238,231,${(.36 - j * .06).toFixed(3)})`; c.lineWidth = 1.25 * DPR;
      c.beginPath(); c.moveTo(ax - w, yy); c.lineTo(ax + w, yy); c.stroke();
    }
  }

  const STARS = Array.from({ length: 14 }, (_, i) => [((i * 0.6180339) % 1), ((i * 0.3819660 * 1.7) % 1) * .34, (i % 3) * .5 + .8]);
  function soul(c, b, ax, ay, S, t, r = b, orbAt = .64) {
    blit(c, backdrop("soul", b.w, b.h, (o, w, h) => { const g = o.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#241b47"); g.addColorStop(.36, "#56408a"); g.addColorStop(.6, "#a67bab"); g.addColorStop(.8, "#f0bd9b"); g.addColorStop(1, "#f9e1b6"); o.fillStyle = g; o.fillRect(0, 0, w, h); }), b, r);
    // a few stars, fading as the light comes
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i], x = ax + (s[0] - .5) * S * 2.4, y = b.y + s[1] * b.h;
      const a = .35 + .3 * Math.sin(t * .9 + i * 2.1);
      c.fillStyle = `rgba(255,246,230,${a.toFixed(3)})`;
      c.beginPath(); c.arc(x, y, s[2] * DPR, 0, TAU); c.fill();
    }
    // aurora: two soft veils drifting across the upper sky, each laid down in three passes so its edges stay soft
    const steps = 22;
    for (let k = 0; k < 2; k++) {
      const col = k ? "255,196,218" : "206,180,255", peak = k ? .085 : .1;
      const ag = c.createLinearGradient(ax - S * 1.3, 0, ax + S * 1.3, 0);
      ag.addColorStop(0, `rgba(${col},0)`); ag.addColorStop(.5, `rgba(${col},${peak})`); ag.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = ag;
      for (const sp of [1, .66, .36]) {
        const base = b.y + b.h * (.17 + k * .15), amp = S * .07, th = S * (.17 - k * .05) * sp, mid = th * (1 - sp) / 2 / sp * sp;
        c.beginPath();
        for (let i = 0; i <= steps; i++) { const x = r.x + r.w * i / steps, u = (x - ax) / S; const y = base + (S * (.17 - k * .05) - th) / 2 + amp * Math.sin(u * 1.7 + t * .16 + k * 2.2); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
        for (let i = steps; i >= 0; i--) { const x = r.x + r.w * i / steps, u = (x - ax) / S; c.lineTo(x, base + (S * (.17 - k * .05) + th) / 2 + amp * .6 * Math.sin(u * 2.4 - t * .13 + k)); }
        c.closePath(); c.fill();
      }
    }
    // the orb, rising a little and settling, with rays that turn very slowly
    const ro = S * .16, oy = b.y + b.h * orbAt - S * .035 * Math.sin(t * TAU / 16), rot = t * .022;
    const rg = c.createRadialGradient(ax, oy, ro, ax, oy, S * 1.45);
    rg.addColorStop(0, "rgba(255,228,174,.4)"); rg.addColorStop(1, "rgba(255,228,174,0)");
    c.fillStyle = rg; c.beginPath();
    const N = 16, L = S * 1.6;
    for (let i = 0; i < N; i++) {
      const a0 = rot + i * TAU / N, a1 = a0 + TAU / N * .3;
      c.moveTo(ax, oy); c.lineTo(ax + Math.cos(a0) * L, oy + Math.sin(a0) * L); c.lineTo(ax + Math.cos(a1) * L, oy + Math.sin(a1) * L); c.closePath();
    }
    c.fill();
    const gl = c.createRadialGradient(ax, oy, ro * .6, ax, oy, ro * 3.6);
    gl.addColorStop(0, "rgba(255,230,172,.78)"); gl.addColorStop(1, "rgba(255,230,172,0)");
    c.fillStyle = gl; c.beginPath(); c.arc(ax, oy, ro * 3.6, 0, TAU); c.fill();
    const og = c.createRadialGradient(ax - ro * .3, oy - ro * .36, ro * .1, ax, oy, ro);
    og.addColorStop(0, "#fffaea"); og.addColorStop(.6, "#ffe1a6"); og.addColorStop(1, "#f5bd70");
    c.fillStyle = og; c.beginPath(); c.arc(ax, oy, ro, 0, TAU); c.fill();
  }
  const DRAW = { body, mind, soul };
  const ORDER = ["body", "mind", "soul"];
  const INK = { body: "#8c4618", mind: "#155a5c", soul: "#574083" };
  const TONE = { body: "#b86a35", mind: "#23807f", soul: "#7d5fa6" };
  const LETTER = { body: "ب", mind: "ذ", soul: "ر" };

  /* ════ Views: canvases that draw while visible ════ */
  const views = [];
  let T = reduce.matches ? STILL_T : 0, lastNow = 0, lastDraw = 0, raf = 0, lastInput = performance.now();
  const IDLE = 30000;   // after this long without input the worlds hold still, until the visitor moves again
  for (const ev of ["scroll", "pointermove", "pointerdown", "keydown", "touchstart", "wheel"]) addEventListener(ev, () => { const was = performance.now() - lastInput > IDLE; lastInput = performance.now(); if (was) { lastNow = 0; schedule(); } }, { passive: true });
  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const live = !reduce.matches && now - lastInput < IDLE;
    if (live && lastNow) T += Math.min(.1, (now - lastNow) / 1000);
    lastNow = now;
    const due = now - lastDraw >= 64;          // the slow ambient motion: 15 frames a second at most
    let again = false;
    for (const v of views) {
      if (!v.visible) continue;
      const moving = v.step ? v.step(now) : false;  // a turn of the sphere draws every frame, so it stays smooth
      if (live || moving) again = true;
      if (v.dirty || moving || (due && live)) { v.render(T); v.dirty = false; }
    }
    if (due) lastDraw = now;
    if (again) schedule(); else lastNow = 0;
  }
  document.addEventListener("visibilitychange", () => { lastNow = 0; if (!document.hidden) schedule(); });
  reduce.addEventListener("change", () => { T = reduce.matches ? STILL_T : T; views.forEach(v => v.dirty = true); schedule(); });
  const io = new IntersectionObserver(es => { for (const e of es) { const v = e.target.__view; v.visible = e.isIntersecting; if (v.visible) { v.dirty = true; schedule(); } } }, { rootMargin: "0px" });
  const ro = new ResizeObserver(es => { for (const e of es) { e.target.__view.resize(); schedule(); } });
  function addView(canvas, v) {
    v.canvas = canvas; v.c = canvas.getContext("2d"); v.visible = false; v.dirty = true;
    v.resize = v.resize || function () { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * DPR)); canvas.height = Math.max(1, Math.round(r.height * DPR)); this.dirty = true; };
    canvas.__view = v; v.resize(); views.push(v); io.observe(canvas); ro.observe(canvas);
    return v;
  }

  /* one world, filling its canvas (each world's section on a phone or a tablet) */
  document.querySelectorAll("canvas.world").forEach(cv => addView(cv, {
    render(t) { const c = this.c, W = cv.width, H = cv.height; DRAW[cv.dataset.w](c, { x: 0, y: 0, w: W, h: H }, W * .5, H * .52, Math.max(H * .6, W * .34), t); }
  }));

  /* the end: the three worlds in one landscape — still water (ذهن), a path of warm sand (بدن), the light rising (روح) */
  document.querySelectorAll("canvas.dawn").forEach(cv => addView(cv, {
    render(t) {
      const c = this.c, W = cv.width, H = cv.height, hz = H * .56, cx = W * .5, S = Math.max(H * .6, W * .3);
      // the sky: soul() puts its orb at 64% of the box, so a box of hz / .64 sets the orb on the horizon
      soul(c, { x: 0, y: 0, w: W, h: hz / .64 }, cx, hz * .5, S, t);
      const wg = c.createLinearGradient(0, hz, 0, H);
      wg.addColorStop(0, "#467a7c"); wg.addColorStop(.3, "#1f5156"); wg.addColorStop(1, "#0b2a2f");
      c.fillStyle = wg; c.fillRect(0, hz, W, H - hz);
      // slow ripples across the water
      c.lineCap = "round";
      for (let j = 0; j < 7; j++) {
        const f = (j + .5) / 7, y = hz + (H - hz) * f * f + 2 * DPR, a = .1 + .05 * Math.sin(t * .7 + j * 1.9);
        c.strokeStyle = `rgba(190,232,226,${a.toFixed(3)})`; c.lineWidth = DPR;
        const sw = W * (.18 + .3 * f), off = W * .2 * Math.sin(j * 2.3 + t * .05);
        c.beginPath(); c.moveTo(cx + off - sw, y); c.lineTo(cx + off + sw, y); c.stroke();
      }
      // the path of light on the water, widening toward you, its flecks drifting toward the horizon
      const n = 18, speed = t * .045;
      for (let i = 0; i < n; i++) {
        const p = ((i / n) + speed) % 1, d = p * p, y = hz + 1.5 * DPR + (H - hz) * d;
        const half = (W * .12) * (.12 + d) * (1 + .2 * Math.sin(t * 1.3 + i * 2.2)), th = Math.max(1, 5 * d + .6) * DPR;
        c.fillStyle = `rgba(255,226,170,${(.75 - .45 * d).toFixed(3)})`;
        c.beginPath(); c.ellipse(cx, y, half, th * .5, 0, 0, TAU); c.fill();
      }
      // a warm horizon line
      const hg = c.createLinearGradient(0, 0, W, 0);
      hg.addColorStop(0, "rgba(255,226,180,0)"); hg.addColorStop(.5, "rgba(255,228,184,.9)"); hg.addColorStop(1, "rgba(255,226,180,0)");
      c.fillStyle = hg; c.fillRect(0, hz - DPR * .5, W, DPR);
      // the land in front: two dunes of warm sand with the lines of their terrain
      const br = .5 + .5 * Math.sin(t * TAU / 6.4);
      for (const side of [1, -1]) {
        const ex = side > 0 ? W : 0, top = H * (side > 0 ? .7 : .76), inner = W * (side > 0 ? .64 : .36);
        const dune = (k, lift) => { c.beginPath(); c.moveTo(ex, top + lift); c.bezierCurveTo(ex - side * W * .14, top - H * .02 + lift, inner + side * W * .08, H * .9 + lift, inner, H + 2); c.lineTo(ex, H + 2); c.closePath(); };
        const dg = c.createLinearGradient(0, top, 0, H);
        dg.addColorStop(0, "#c9844f"); dg.addColorStop(.5, "#9a4f24"); dg.addColorStop(1, "#5c2b12");
        dune(0, 0); c.fillStyle = dg; c.fill();
        c.save(); dune(0, 0); c.clip();
        c.lineWidth = DPR;
        for (let k = 1; k <= 5; k++) {
          const dy = k * H * .045 + br * H * .004 * k;
          c.strokeStyle = `rgba(255,236,214,${(.32 - k * .04).toFixed(3)})`;
          c.beginPath(); c.moveTo(ex, top + dy); c.bezierCurveTo(ex - side * W * .14, top - H * .02 + dy, inner + side * W * .08, H * .9 + dy, inner + side * k * W * .03, H + dy); c.stroke();
        }
        c.restore();
        c.strokeStyle = "rgba(255,232,200,.55)"; c.lineWidth = 1.2 * DPR; dune(0, 0); c.stroke();
      }
    }
  }));

  /* ════ The emblem ════ */
  const cv = document.getElementById("emblem");
  if (!cv) return;
  root.classList.add("art");
  const discs = {}; cv.parentNode.querySelectorAll(".orb-disc").forEach(el => discs[el.dataset.w] = el);
  // the two meridians, as a share of the radius: + toward the right edge (the reading start), − toward the left
  const STATES = { all: [1 / 3, -1 / 3], body: [-.6, -.8], mind: [.8, -.8], soul: [.8, .6] };
  let cur = reduce.matches ? STATES.all.slice() : [.008, -.008];      // closed: a seed, before it opens
  let from = null, to = null, t0 = 0, dur = 1100, state = "all", hover = null;
  let G = null;                                                      // geometry, set on resize
  const em = addView(cv, {
    resize() {
      const r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR);
      const W = cv.width, gap = 24 * DPR;
      G = { W, cx: W / 2, cy: W / 2, R: W / 2 - gap };
      this.dirty = true;
    },
    step(now) {
      if (!from) return false;
      const p = clamp((now - t0) / dur, 0, 1), e = ease(p);
      cur = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      if (p >= 1) from = null;
      return true;
    },
    render(t) {
      const c = this.c, { W, cx, cy, R } = G;
      c.clearRect(0, 0, W, W);
      let [u1, u2] = cur;
      if (state === "all" && !from && !reduce.matches) { const s = .018 * Math.sin(t * TAU / 9); u1 += s; u2 -= s; }  // the whole breathes, barely
      const regions = [["body", 1, u1], ["mind", u1, u2], ["soul", u2, -1]];
      const box = { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
      for (const [w, a, b] of regions) {
        if (a - b < .004) continue;
        // the region's bounding box: its widest point is at the equator, between the two meridians
        const bx0 = Math.floor(cx + Math.min(b, 0) * R - 2), bx1 = Math.ceil(cx + Math.max(a, 0) * R + 2);
        const rr = { x: bx0, y: box.y, w: bx1 - bx0, h: box.h };
        c.save(); lens(c, a, b); c.clip();
        DRAW[w](c, box, cx + (a + b) / 2 * R, cy, R, t, rr, .575);   // on the sphere the orb sits a little higher, clear of its letter
        if (hover === w) { c.fillStyle = "rgba(255,250,240,.1)"; c.fillRect(rr.x, rr.y, rr.w, rr.h); }
        c.restore();
      }
      // the seams between the worlds
      c.strokeStyle = "rgba(253,250,245,.92)"; c.lineWidth = 1.5 * DPR;
      for (const u of [u1, u2]) { c.beginPath(); meridian(c, u, false); c.stroke(); }
      // an orbit around the sphere, and a mark for each world above it (the open one larger)
      const RR = R + 13 * DPR;                      // the orbit itself is drawn by CSS
      for (const [w, a, b] of regions) {
        const width = a - b, o = clamp((width - .667) / (1.4 - .667), 0, 1), sx = clamp((a + b) / 2 * R / RR, -1, 1);
        const x = cx + RR * sx, y = cy - RR * Math.sqrt(1 - sx * sx);
        c.globalAlpha = width < .02 ? 0 : .5 + .5 * o; c.fillStyle = TONE[w];
        c.beginPath(); c.arc(x, y, (2.6 + 2.6 * o) * DPR, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      // the letters on their discs (HTML over the canvas), in every world wide enough to hold one: ب ذ ر from the right
      const dy = .52, sq = Math.sqrt(1 - dy * dy), k = 1 / DPR;
      for (const [w, a, b] of regions) {
        const el = discs[w], vis = clamp((a - b - .32) / .22, 0, 1);
        const x = (cx + (a + b) / 2 * R * sq) * k, y = (cy + dy * R) * k;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.opacity = vis.toFixed(3);
        el.classList.toggle("on", state === w);
      }
      c.globalAlpha = 1;
    }
  });
  // half an ellipse from the top of the sphere to its bottom, |u|·R wide, on the side of u's sign
  function meridian(c, u, back) {
    const { cx, cy, R } = G, rx = Math.max(.5, Math.abs(u) * R);
    if (!back) c.ellipse(cx, cy, rx, R, 0, -Math.PI / 2, Math.PI / 2, u < 0);
    else c.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, u >= 0);
  }
  function lens(c, a, b) { c.beginPath(); meridian(c, a, false); meridian(c, b, true); c.closePath(); }
  function regionAt(px, py) {
    const { cx, cy, R } = G, dy = (py - cy) / R;
    if (Math.hypot(px - cx, py - cy) > R) return null;
    const x = (px - cx) / (R * Math.sqrt(Math.max(1e-4, 1 - dy * dy)));
    return x > cur[0] ? "body" : x > cur[1] ? "mind" : "soul";
  }

  /* ════ The page: which world is open, from the legend, a tap on the sphere, a swipe, or (on a desktop) the scroll ════ */
  const desk = matchMedia("(min-width: 1024px) and (min-height: 600px)");
  const worlds = document.querySelector(".worlds");
  const stage = document.getElementById("stage");
  const tabs = [...document.querySelectorAll(".legend [role=tab]")];
  const cap = document.getElementById("tri-cap"), capAll = cap.innerHTML;
  const caps = {}; document.getElementById("caps").content.querySelectorAll("p").forEach(p => caps[p.dataset.w] = p.innerHTML);
  const navs = [...document.querySelectorAll(".top nav a[data-w]")];
  const bar = document.getElementById("top-bar");
  let touched = false, opened = false;

  function go(next, slow) {
    to = STATES[next]; from = cur.slice(); t0 = performance.now(); dur = slow ? 1700 : 1100;
    if (reduce.matches) { cur = to.slice(); from = null; }
    em.dirty = true; schedule();
  }
  function set(next) {
    if (next === state) return;
    state = next;
    worlds.dataset.state = next;
    if (desk.matches) document.body.dataset.state = next; else delete document.body.dataset.state;
    stage.classList.toggle("tri-all", next === "all");
    tabs.forEach(t => t.setAttribute("aria-selected", t.dataset.w === next));
    const focusable = tabs.find(t => t.dataset.w === next) || tabs[0];
    tabs.forEach(t => t.tabIndex = t === focusable ? 0 : -1);
    navs.forEach(a => { if (a.dataset.w === next) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    cap.style.setProperty("--w", next === "all" ? "" : `var(--${next})`);
    cap.style.setProperty("--wi", next === "all" ? "" : `var(--${next}-ink)`);
    cap.innerHTML = next === "all" ? capAll : caps[next];
    if (opened) go(next);
  }
  stage.classList.add("tri-all");

  function choose(w) {
    touched = true;
    if (desk.matches) document.getElementById(w).scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "center" });
    else set(w);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => choose(t.dataset.w));
    t.addEventListener("keydown", e => {
      const k = { ArrowLeft: 1, ArrowRight: -1, Home: -9, End: 9 }[e.key];     // right to left: ← goes on
      if (k === undefined) return;
      e.preventDefault();
      const n = Math.abs(k) === 9 ? (k > 0 ? 2 : 0) : clamp(i + k, 0, 2);
      tabs[n].focus(); choose(tabs[n].dataset.w);
    });
  });
  // the sphere: a tap picks the world under the finger; a sideways swipe turns to the next (←) or the previous (→)
  let down = null;
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]; };
  cv.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  cv.addEventListener("pointerup", e => {
    if (!down) return;
    const dx = e.clientX - down[0], dy = e.clientY - down[1]; down = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      const i = Math.max(0, ORDER.indexOf(state)), n = clamp(i + (dx < 0 ? 1 : -1), 0, 2);
      choose(ORDER[state === "all" ? (dx < 0 ? 0 : 2) : n]); return;
    }
    if (Math.hypot(dx, dy) < 12) { const w = regionAt(...pt(e)); if (w) choose(w); }
  });
  cv.addEventListener("pointercancel", () => { down = null; });
  cv.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const w = regionAt(...pt(e));
    if (w !== hover) { hover = w; cv.style.cursor = w ? "pointer" : ""; em.dirty = true; schedule(); }
  });
  cv.addEventListener("pointerleave", () => { if (hover) { hover = null; em.dirty = true; schedule(); } });

  /* desktop: the words lead; each block sets its world as it crosses the middle of the screen */
  let sio;
  function watch() {
    if (sio) sio.disconnect();
    if (!desk.matches) return;
    sio = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) set(e.target.dataset.step); }, { rootMargin: "-50% 0px -50% 0px" });
    document.querySelectorAll("[data-step]").forEach(el => sio.observe(el));
  }
  function place() {
    // keep the sphere and its legend centred in the space under the top bar
    if (desk.matches) { const top = bar.offsetHeight, h = stage.offsetHeight; stage.style.top = Math.max(top + 8, Math.round(top + (innerHeight - top - h) / 2)) + "px"; }
    else stage.style.top = "";
  }
  place(); addEventListener("resize", place);
  desk.addEventListener("change", () => {
    watch(); place();
    if (desk.matches) document.body.dataset.state = state; else delete document.body.dataset.state;
    if (!desk.matches && state === "all" && !touched && opened) set("body");
  });

  /* the opening: once the sphere is in view, the seed opens into three; on a phone or a tablet the first world then
     turns to face you, once, to show what the sphere does */
  const open = () => {
    opened = true;
    stage.classList.add("shown");
    if (reduce.matches) { cur = STATES[state].slice(); em.dirty = true; if (!desk.matches && !touched) set("body"); schedule(); return; }
    go(state, true);
    if (!desk.matches) setTimeout(() => { if (!touched && state === "all") set("body"); }, 2300);
  };
  new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); open(); } }, { threshold: .35 }).observe(cv);
  watch();
  if (document.fonts) document.fonts.ready.then(() => { em.dirty = true; schedule(); });

  // on a phone the button goes to the sphere; on a desktop to the first world's words
  const toWorlds = document.getElementById("to-worlds");
  if (toWorlds) toWorlds.addEventListener("click", e => {
    if (desk.matches) return;
    e.preventDefault();
    stage.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
  });

  /* the top bar gets a hairline once the page moves */
  const onScroll = () => bar.classList.toggle("stuck", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* words and frames rise into place once, as they come in */
  const rv = document.querySelectorAll(".rv, .rv-frame");
  if (reduce.matches) rv.forEach(el => el.classList.add("in"));
  else {
    const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    rv.forEach(el => rio.observe(el));
  }
  schedule();
})();
