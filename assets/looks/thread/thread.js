/* بذر · رشته, v2 — the art and the behaviour of /thread/ (BZR-183).
   One long wire, generated here in code, loops around the volume of a standing person. A single large figure stays fixed
   behind the whole page (one canvas, moved by transform and opacity only) and changes with each part:
     the hero          a tangle that draws itself in;
     the three worlds  the clear figure, each world's thread coloured in turn (بدن the body, ذهن the head, روح the loose loops);
     «در بذر…»         all three threads;
     the long parts    large and faint behind the words, loosening during the method;
     the end           clear again, with its three threads.
   Where CSS scroll-driven animations are missing, the same scroll pass writes --e / --x / --p / --sp / --hp for the CSS.
   One passive scroll listener; layout is measured only on resize. Draws only when something changes, holds still after
   30 s without input, and under «کاهش حرکت» shows each part's state as a calm still. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  // a touch screen: the big faint figure is drawn at 1.25× at most and holds still between scrolls (no ambient sway), so
  // a mid-range phone spends its frames on scrolling
  const coarse = matchMedia("(pointer: coarse)").matches;
  const DPR = Math.min(coarse ? 1.25 : 1.5, window.devicePixelRatio || 1);
  const narrow = innerWidth < 700;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = u => u * u * (3 - 2 * u);
  const lerp = (a, b, p) => a + (b - a) * p;
  const WORLDS = ["body", "mind", "soul"];
  const STORE = "bazr-thread-theme";
  const THEMES = ["paper", "chalk", "sand", "green"];

  /* ════ The wire ════ */
  function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // the volume of a standing person, as segments with a radius (metres; the floor is y = 0)
  const PARTS = {
    head:  { a: [0, 1.62, 0], b: [0, 1.78, 0], ra: .105, rb: .1, d: .95, w: 1, nb: ["neck"], wt: .13, free: 1.5 },
    neck:  { a: [0, 1.51, 0], b: [0, 1.6, 0], ra: .05, rb: .048, d: 1, w: 1, nb: ["head", "torso"], wt: .03, free: .4 },
    torso: { a: [0, 1.02, 0], b: [0, 1.45, 0], ra: .165, rb: .225, d: .58, w: 0, nb: ["neck", "armL", "armR", "hips"], wt: .22, free: .72 },
    hips:  { a: [0, .86, 0], b: [0, 1.02, 0], ra: .185, rb: .168, d: .62, w: 0, nb: ["torso", "legL", "legR"], wt: .08, free: .62 },
    armL:  { a: [.275, 1.42, 0], b: [.355, .86, 0], ra: .056, rb: .042, d: 1, w: 0, nb: ["torso"], wt: .08, free: .66 },
    armR:  { a: [-.275, 1.42, 0], b: [-.355, .86, 0], ra: .056, rb: .042, d: 1, w: 0, nb: ["torso"], wt: .08, free: .66 },
    legL:  { a: [.11, .88, 0], b: [.17, .05, 0], ra: .088, rb: .047, d: 1, w: 0, nb: ["hips"], wt: .17, free: .6 },
    legR:  { a: [-.11, .88, 0], b: [-.17, .05, 0], ra: .088, rb: .047, d: 1, w: 0, nb: ["hips"], wt: .17, free: .6 },
  };
  // the route the wire takes: up one leg, up the body, down and up each arm, round and round the head, down again,
  // down and up the other leg, and once more up the middle; loops are spaced evenly along each part, so the wire
  // wraps the whole figure and its outline reads clearly
  const ROUTE = [["legR", 1, 0], ["hips", 0, 1], ["torso", 0, 1], ["armR", 0, 1], ["armR", 1, 0], ["torso", 1, .55], ["armL", 0, 1], ["armL", 1, 0],
    ["torso", .55, 1], ["neck", 0, 1], ["head", 0, 1], ["head", 1, 0], ["head", 0, 1], ["neck", 1, 0], ["torso", 1, 0], ["hips", 1, 0],
    ["legL", 0, 1], ["legL", 1, 0], ["hips", 0, 1], ["torso", 0, 1], ["neck", 0, 1], ["head", 0, 1]];
  function buildWire(spacing, per, seed) {
    const r = rng(seed);
    const keys = [];
    for (const [part, s0, s1] of ROUTE) {
      const P = PARTS[part], len = Math.hypot(P.b[0] - P.a[0], P.b[1] - P.a[1]);
      const n = Math.max(2, Math.round(len * Math.abs(s1 - s0) / spacing));
      for (let q = 0; q < n; q++) {
        const s = s0 + (s1 - s0) * (q + r() * .6) / n;
        const loose = part !== "head" && part !== "neck" && r() < .12;
        const rad = (P.ra + (P.rb - P.ra) * s) * (1 + r() * .32) * (loose ? 1.9 + r() * 1.3 : 1);
        const c = P.a.map((v, i) => v + (P.b[i] - v) * s);
        keys.push({
          // the figure: loops hugging the part, tilted a little (the head's turn every way, so together they make a
          // ball); loose loops wider and freer
          x: c[0] + (r() - .5) * .035, y: c[1] + (r() - .5) * .03, z: (r() - .5) * .03,
          rx: rad, rz: rad * (loose ? .9 : P.d), pitch: (r() - .5) * (loose ? 1.2 : P.free), roll: (r() - .5) * (loose ? 1 : P.free * .8),
          // the tangle: big loops anywhere in a tall cloud around the body
          X: (r() - .5) * .6, Y: .12 + r() * 1.78, Z: (r() - .5) * .45,
          RX: .22 + r() * .4, RZ: .18 + r() * .32, PITCH: (r() - .5) * 1.9, ROLL: (r() - .5) * 1.7,
          delay: r() * .4, w: loose ? 2 : P.w, span: TAU * (.78 + r() * .44)
        });
      }
    }
    const K = keys.length - 1;
    const N = K * per;
    const calm = new Float32Array(N * 3), wild = new Float32Array(N * 3), delay = new Float32Array(N), world = new Uint8Array(N);
    let th = r() * TAU;
    const ell = (out, i, x, y, z, rx, rz, pitch, roll) => {
      // a horizontal ellipse, pitched about x and rolled about z
      let px = rx * Math.cos(th), py = 0, pz = rz * Math.sin(th);
      const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      let y1 = py * cp - pz * sp, z1 = py * sp + pz * cp;
      let x2 = px * cr - y1 * sr, y2 = px * sr + y1 * cr;
      out[i * 3] = x + x2; out[i * 3 + 1] = y + y2; out[i * 3 + 2] = z + z1;
    };
    let i = 0;
    for (let k = 0; k < K; k++) {
      const A = keys[k], B = keys[k + 1];
      for (let j = 0; j < per; j++, i++) {
        const u = smooth(j / per), m = (a, b) => a + (b - a) * u;
        ell(calm, i, m(A.x, B.x), m(A.y, B.y), m(A.z, B.z), m(A.rx, B.rx), m(A.rz, B.rz), m(A.pitch, B.pitch), m(A.roll, B.roll));
        ell(wild, i, m(A.X, B.X), m(A.Y, B.Y), m(A.Z, B.Z), m(A.RX, B.RX), m(A.RZ, B.RZ), m(A.PITCH, B.PITCH), m(A.ROLL, B.ROLL));
        delay[i] = m(A.delay, B.delay);
        world[i] = j / per < .5 ? A.w : B.w;
        th += A.span / per;
      }
    }
    return { N, calm, wild, delay, world };
  }

  const WIRE = narrow ? buildWire(.058, 22, 7) : buildWire(.044, 28, 7);
  const POS = new Float32Array(WIRE.N * 3);
  let posT = -1;
  function positions(t) {
    if (t >= 1) return WIRE.calm;
    if (t === posT) return POS;
    const { N, calm, wild, delay } = WIRE;
    for (let i = 0; i < N; i++) {
      const e = smooth(clamp((t - delay[i]) / .6, 0, 1)), o = i * 3;
      POS[o] = wild[o] + (calm[o] - wild[o]) * e; POS[o + 1] = wild[o + 1] + (calm[o + 1] - wild[o + 1]) * e; POS[o + 2] = wild[o + 2] + (calm[o + 2] - wild[o + 2]) * e;
    }
    posT = t; return POS;
  }

  /* ════ Colours: read from the theme's tokens (on start and on every theme change) ════ */
  const COL = {};
  const hex = v => { v = v.trim().replace("#", ""); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); };
  let shadowSprite = null;
  function readTheme() {
    const cs = getComputedStyle(root), g = n => cs.getPropertyValue(n);
    COL.wire = hex(g("--wire")); COL.body = hex(g("--body")); COL.mind = hex(g("--mind")); COL.soul = hex(g("--soul"));
    COL.shade = g("--shade").trim().split(/\s+/).join(","); COL.free = parseFloat(g("--fig-free")) || .12; COL.fade = parseFloat(g("--fig-fade")) || .14;
    COL.dark = g("color-scheme").includes("dark");
    const o = document.createElement("canvas"); o.width = o.height = 128; const c = o.getContext("2d");
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64), a = COL.dark ? .5 : .32;
    gr.addColorStop(0, `rgba(${COL.shade},${a})`); gr.addColorStop(.5, `rgba(${COL.shade},${a * .35})`); gr.addColorStop(1, `rgba(${COL.shade},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128); shadowSprite = o;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = g("--canvas").trim();
  }

  /* ════ Drawing: perspective, depth (near lines stronger and thicker), three threads, and a draw-in ════ */
  const BUCKETS = 4, ALPHA = [.26, .44, .66, .9], WIDTH = [.8, 1, 1.25, 1.55];
  function drawFigure(c, W, H, t, phi, mix, fade, frac) {
    c.clearRect(0, 0, W, H);
    const P = positions(t), N = Math.max(2, Math.floor(WIRE.N * frac)), world = WIRE.world;
    // the camera: close on the clear figure, a step back for the tangle, whose loops reach higher and wider
    const u = 1 - t, D = 5.2, s = Math.min(W / (1.62 + .62 * u), H / (2.12 + .5 * u)), f = s * D, cx = W / 2, cy = H * .5, ty = .98 + .2 * u;
    const cphi = Math.cos(phi), sphi = Math.sin(phi);
    const sw = Math.min(W * .46, s * (.8 - .38 * t)), sh = sw * .14, fy = cy + ty * f / D;
    c.globalAlpha = (.55 + .45 * t) * frac; c.drawImage(shadowSprite, cx - sw, fy - sh, sw * 2, sh * 2); c.globalAlpha = 1;
    const paths = [];
    for (let g = 0; g < 3 * BUCKETS; g++) paths.push(new Path2D());
    const last = new Int32Array(3 * BUCKETS).fill(-2);
    let px = 0, py = 0, pz = 0;
    for (let i = 0; i < N; i++) {
      const o = i * 3, x = P[o], y = P[o + 1], z = P[o + 2];
      const xr = x * cphi + z * sphi, zr = -x * sphi + z * cphi, k = f / (D - zr);
      const X = cx + xr * k, Y = cy + (ty - y) * k;
      if (i) {
        const zm = (zr + pz) * .5, b = clamp(Math.floor((zm + .62) / 1.24 * BUCKETS), 0, BUCKETS - 1), g = world[i] * BUCKETS + b, p = paths[g];
        if (last[g] !== i - 1) p.moveTo(px, py);
        p.lineTo(X, Y); last[g] = i;
      }
      px = X; py = Y; pz = zr;
    }
    c.lineCap = "round"; c.lineJoin = "round";
    for (let w = 0; w < 3; w++) {
      const tone = COL[WORLDS[w]], m = mix[w], fa = fade[w];
      const rgb = COL.wire.map((v, j) => Math.round(v + (tone[j] - v) * m));
      for (let b = 0; b < BUCKETS; b++) {
        c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(ALPHA[b] * fa * (1 + .12 * m)).toFixed(3)})`;
        c.lineWidth = WIDTH[b] * DPR * (1 + .25 * m);
        c.stroke(paths[w * BUCKETS + b]);
      }
    }
  }

  /* ════ Where the figure is: a key per story screen (fitted into its empty «figure zone») and keys for the long parts ════ */
  const cv = document.getElementById("bgfig"), cx2 = cv.getContext("2d");
  const STORY = ["top", "body", "mind", "soul", "together", "start"].map(id => document.getElementById(id));
  const snaps = [...document.querySelectorAll(".snap")];
  const drifts = [...document.querySelectorAll(".drift")];
  const railLinks = [...document.querySelectorAll(".rail a")];
  const navLinks = [...document.querySelectorAll(".top nav a[data-w]")];
  const bar = document.getElementById("top-bar"), prog = bar.querySelector(".prog");
  const sdNative = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  if (!sdNative) root.classList.add("sd-fb");
  const NONE = [0, 0, 0], ALL = [1, 1, 1];
  const MIX = { top: NONE, body: [1, 0, 0], mind: [0, 1, 0], soul: [0, 0, 1], together: ALL, start: ALL };
  // the threads not chosen fade back (a little less on dark paper, where faint lines vanish sooner)
  const fadeFor = id => { const f = COL.fade; return { body: [1, f, f], mind: [f, 1, f], soul: [f, f, 1] }[id] || ALL; };
  let VW = 0, VH = 0, BW = 0, BH = 0, keys = [], G = null;

  function measure() {
    VW = innerWidth; VH = innerHeight;
    BH = Math.round(VH * (VW >= 1024 ? .9 : .84)); BW = Math.round(BH * .8);
    if (BW > VW * 1.05) { BW = Math.round(VW * 1.05); BH = Math.round(BW / .8); }
    cv.style.width = BW + "px"; cv.style.height = BH + "px";
    cv.width = Math.round(BW * DPR); cv.height = Math.round(BH * DPR);
    const sy = scrollY, docTop = el => el.getBoundingClientRect().top + sy;
    const story = STORY.map(el => {
      const top = docTop(el), z = el.querySelector(".fz").getBoundingClientRect();
      return { id: el.id, el, top, h: el.offsetHeight, zone: { x: z.left, y: z.top + sy - top, w: z.width, h: z.height }, snap: el.dataset.snap };
    });
    const sec = id => { const el = document.getElementById(id); return { top: docTop(el), h: el.offsetHeight }; };
    G = { story, why: sec("why"), method: sec("method"), inside: sec("inside"), maxY: Math.max(0, root.scrollHeight - VH),
      snaps: snaps.map(el => ({ el, top: docTop(el), h: el.offsetHeight, e: -1, x: -1 })),
      drifts: drifts.map(el => { const r = el.getBoundingClientRect(); return { el, top: r.top + sy, h: r.height, p: -1 }; }) };
    buildKeys();
    last.key = ""; last.tf = ""; dirty = true;
  }
  // a placement: the canvas's top-left (viewport px), its scale and opacity
  function placeIn(z) {
    const big = z.h >= Math.max(190, VH * .24) && z.w >= 150;
    if (!big) return background();
    const s = Math.min(z.h / BH, z.w / BW, 1) * 1.04;
    return { x: z.x + z.w / 2 - BW * s / 2, y: z.y + z.h / 2 - BH * s / 2, s, o: 1 };
  }
  function background() {
    const s = Math.min(1.3, VH * 1.12 / BH);
    return { x: VW / 2 - BW * s / 2 + (VW >= 1024 ? -VW * .2 : 0), y: VH / 2 - BH * s / 2, s, o: COL.free };
  }
  function buildKeys() {
    const k = [], st = G.story, BG = background();
    const story = (i, t) => ({ y: st[i].top, pl: placeIn(st[i].zone), t, mix: MIX[st[i].id], fade: fadeFor(st[i].id), story: st[i].id });
    for (let i = 0; i < 5; i++) k.push(story(i, i ? 1 : 0));
    k.push({ y: G.why.top, pl: BG, t: 1, mix: NONE, fade: ALL });
    k.push({ y: G.method.top - VH * .4, pl: BG, t: 1, mix: NONE, fade: ALL });
    k.push({ y: G.method.top + VH * .35, pl: BG, t: .42, mix: NONE, fade: ALL });          // the method: the figure loosens
    k.push({ y: G.method.top + G.method.h - VH * .6, pl: BG, t: .42, mix: NONE, fade: ALL });
    k.push({ y: G.inside.top, pl: BG, t: 1, mix: NONE, fade: ALL });
    k.push({ y: st[5].top - VH, pl: BG, t: 1, mix: NONE, fade: ALL });
    k.push(story(5, 1));
    keys = k.filter((x, i) => i === 0 || x.y > k[i - 1].y + 1);
  }
  // the state at a scroll position: between two keys, eased; under «کاهش حرکت», the nearest key, no in-between
  function stateAt(y) {
    let i = 0;
    while (i < keys.length - 1 && y >= keys[i + 1].y) i++;
    const A = keys[i], B = keys[Math.min(i + 1, keys.length - 1)];
    let p = B === A ? 0 : clamp((y - A.y) / (B.y - A.y), 0, 1);
    if (reduce.matches) p = p < .5 ? 0 : 1;
    const e = smooth(p), dip = Math.sin(p * Math.PI) * (A.story && B.story ? 1 : 0);
    // between a story screen and a long part the figure steps back early and comes forward late, so it is only
    // prominent while its screen fills the view, never over the words of the part beside it
    const w = A.story && !B.story ? smooth(clamp(p / .3, 0, 1)) : !A.story && B.story ? smooth(clamp((p - .7) / .3, 0, 1)) : e;
    const pl = {
      x: lerp(A.pl.x, B.pl.x, w), s: lerp(A.pl.s, B.pl.s, w) * (1 - .05 * dip), o: lerp(A.pl.o, B.pl.o, w),
      y: lerp(A.pl.y, B.pl.y, w) + dip * VH * .035
    };
    // a slow float while the figure is in the background: the deepest of the three layers
    const bg = clamp((1 - pl.o) / (1 - COL.free), 0, 1);
    if (!reduce.matches) pl.y += Math.sin(y / VH * 1.15) * VH * .035 * bg;
    return { pl, t: lerp(A.t, B.t, e), mix: A.mix.map((v, j) => lerp(v, B.mix[j], e)), fade: A.fade.map((v, j) => lerp(v, B.fade[j], e)), bg };
  }

  /* ════ The loop: one rAF; scroll marks it dirty; the slow sway runs at 15 frames a second while the figure is
     prominent and the visitor is around ════ */
  let raf = 0, dirty = true, lastNow = 0, lastSway = 0, lastDraw = 0, clock = 0, swayVal = 0, lastInput = performance.now();
  let turn = 0, spin = 0, drag = null, intro = reduce.matches || scrollY > innerHeight * .5 ? 1 : 0, introT0 = 0;
  const IDLE = 30000, SWAY = .5;
  const last = { key: "", tf: "", cur: "", tint: "" };
  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  for (const ev of ["pointermove", "pointerdown", "keydown", "touchstart", "wheel"]) addEventListener(ev, wake, { passive: true });
  addEventListener("scroll", () => { wake(); dirty = true; schedule(); }, { passive: true });
  function wake() { const was = performance.now() - lastInput > IDLE; lastInput = performance.now(); if (was) { lastNow = 0; schedule(); } }
  document.addEventListener("visibilitychange", () => { lastNow = 0; if (!document.hidden) { dirty = true; schedule(); } });
  reduce.addEventListener("change", () => { buildKeys(); dirty = true; last.key = ""; schedule(); });

  function frame(now) {
    raf = 0;
    const dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0;
    lastNow = now; clock += dt;
    const live = !reduce.matches && now - lastInput < IDLE;
    const y = scrollY;
    let again = false;
    if (dirty) { scrollPass(y); dirty = false; }
    const S = stateAt(y);
    // the draw-in of the tangle, once, on arrival
    if (intro < 1) { if (!introT0) introT0 = now; intro = clamp((now - introT0) / 1900, 0, 1); again = true; }
    // a drag turns the figure; it eases back to face you
    if (!drag) {
      if (Math.abs(spin) > .02) { turn += spin * dt; spin *= Math.exp(-dt * 2.4); again = true; }
      else { const home = Math.round(turn / TAU) * TAU; if (Math.abs(turn - home) > .002) { turn += (home - turn) * (1 - Math.exp(-dt * .9)); again = true; } else turn = home; }
    } else again = true;
    // the slow sway: 15 frames a second, only while the figure is prominent and the visitor is around
    const prominent = S.pl.o > .5;
    if (live && prominent && !coarse) { again = true; if (now - lastSway >= 64) { lastSway = now; swayVal = SWAY * Math.sin(clock * .22); } }
    if (reduce.matches) swayVal = .22;
    const phi = turn + swayVal;
    // transform and opacity: only when they change
    const tf = `translate3d(${S.pl.x.toFixed(1)}px,${S.pl.y.toFixed(1)}px,0) scale(${S.pl.s.toFixed(4)})`;
    if (tf !== last.tf) { cv.style.transform = tf; last.tf = tf; }
    const op = (S.pl.o * (intro < 1 ? Math.min(1, intro * 3) : 1)).toFixed(3);
    if (op !== last.op) { cv.style.opacity = op; last.op = op; }
    // the drawing: only when its shape or colour changes
    const key = `${S.t.toFixed(3)}|${S.mix.map(v => v.toFixed(2))}|${S.fade.map(v => v.toFixed(2))}|${phi.toFixed(3)}|${intro.toFixed(3)}|${last.theme}`;
    // (on a touch screen at most 30 redraws a second; the transform above still follows every frame)
    if (key !== last.key && S.pl.o > .01) {
      if (!coarse || now - lastDraw >= 32 || intro < 1) { drawFigure(cx2, cv.width, cv.height, S.t, phi, S.mix, S.fade, smooth(intro)); last.key = key; lastDraw = now; }
      else again = true;
    }
    if (again) schedule(); else lastNow = 0;
  }

  /* snapping in the direction of travel: the screen ahead becomes a snap point once enough of it is in view (most of
     it when you come from another story screen, half of it when you come from a long part); the screen you are leaving
     never is, so the scroll never pulls back, and the long parts have no snap points at all */
  // only while the visitor is scrolling: at rest there are no snap points at all, so a jump from a link, find-in-page
  // or the browser restoring your place lands exactly where it should
  let lastY = scrollY, dir = 0, userAt = 0, restTimer = 0;
  for (const ev of ["wheel", "touchstart", "touchmove", "keydown", "pointerdown"]) addEventListener(ev, () => { userAt = performance.now(); }, { passive: true });
  function rest() { dir = 0; for (const s of G.story) if (s.snap !== "0") { s.el.dataset.snap = "0"; s.snap = "0"; } }
  if ("onscrollend" in window) addEventListener("scrollend", rest);
  addEventListener("scroll", () => { clearTimeout(restTimer); restTimer = setTimeout(rest, "onscrollend" in window ? 1500 : 220); }, { passive: true });
  function snapPass(y) {
    if (Math.abs(y - lastY) > .5) dir = y > lastY ? 1 : -1;
    lastY = y;
    if (performance.now() - userAt > 1200) dir = 0;
    const st = G.story;
    for (let j = 0; j < st.length; j++) {
      const s = st[j], prev = st[j - 1], next = st[j + 1];
      const fromStory = dir > 0 ? prev && Math.abs(prev.top + prev.h - s.top) < 2 && prev.h <= VH * 1.05
                                : next && Math.abs(s.top + s.h - next.top) < 2 && s.h <= VH * 1.05;
      const reach = VH * (fromStory ? .88 : .5);
      const on = dir > 0 ? s.top - y > .5 && s.top - y < reach
               : dir < 0 ? y - s.top > .5 && y - s.top < reach
               : false;
      const v = on ? "1" : "0";
      if (s.snap !== v) { s.el.dataset.snap = v; s.snap = v; }
    }
  }

  /* everything else that follows the scroll, read from cached offsets (no layout read here) */
  function scrollPass(y) {
    snapPass(y);
    // where you are: the rail, the header's world links, and the page's whisper of a world's colour
    let cur = "";
    for (const s of G.story) if (y >= s.top - VH * .5 && y < s.top + s.h - VH * .5) cur = s.id;
    if (cur !== last.cur) {
      last.cur = cur;
      railLinks.forEach(a => a.dataset.k === cur ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"));
      navLinks.forEach(a => a.dataset.w === cur ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current"));
      const tint = WORLDS.includes(cur) ? cur : "";
      if (tint) document.body.dataset.state = tint; else delete document.body.dataset.state;
    }
    if (sdNative || reduce.matches) return;
    // the fallback for scroll-driven animations: one variable per element, written only when it changes
    for (const s of G.snaps) {
      const e = clamp((y + VH - s.top) / VH, 0, 1), x = clamp((y - (s.top + s.h - VH)) / VH, 0, 1);
      if (Math.abs(e - s.e) > .001) { s.el.style.setProperty("--e", e.toFixed(3)); s.e = e; }
      if (Math.abs(x - s.x) > .001) { s.el.style.setProperty("--x", x.toFixed(3)); s.x = x; }
    }
    for (const d of G.drifts) {
      const p = clamp((y + VH - d.top) / (VH + d.h), 0, 1);
      if (Math.abs(p - d.p) > .002) { d.el.style.setProperty("--p", p.toFixed(3)); d.p = p; }
    }
    prog.style.setProperty("--sp", G.maxY ? (y / G.maxY).toFixed(4) : "0");
    bar.style.setProperty("--hp", clamp(y / 120, 0, 1).toFixed(3));
  }

  /* ════ Dragging in an empty figure zone turns the figure ════ */
  document.querySelectorAll(".fz").forEach(z => {
    z.addEventListener("pointerdown", e => { drag = { last: e.clientX, t: performance.now() }; spin = 0; schedule(); });
    z.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = e.clientX - drag.last, now = performance.now();
      turn += dx * .011; spin = clamp(dx * .011 / Math.max(.008, (now - drag.t) / 1000), -6, 6);
      drag.last = e.clientX; drag.t = now; schedule();
    });
    const end = () => { drag = null; schedule(); };
    z.addEventListener("pointerup", end); z.addEventListener("pointercancel", end); z.addEventListener("pointerleave", end);
  });

  /* ════ Themes: four, behind one round button; remembered when storage allows; a circle opens from the button ════ */
  const tpBtn = document.getElementById("tp-btn"), tpMenu = document.getElementById("tp-menu");
  const opts = [...tpMenu.querySelectorAll("[role=radio]")];
  const themeNow = () => THEMES.includes(root.dataset.theme) ? root.dataset.theme : "paper";
  function syncPicker() { const n = themeNow(); opts.forEach(o => { const on = o.dataset.themePick === n; o.setAttribute("aria-checked", on); o.tabIndex = on ? 0 : -1; }); }
  function openMenu(open) {
    tpMenu.hidden = !open; tpBtn.setAttribute("aria-expanded", open);
    if (open) (opts.find(o => o.getAttribute("aria-checked") === "true") || opts[0]).focus();
  }
  function setTheme(name) {
    if (name === themeNow()) return;
    const apply = () => {
      root.classList.add("theme-swap");
      root.dataset.theme = name;
      try { localStorage.setItem(STORE, name); } catch (e) { /* storage off: the choice lasts this visit */ }
      readTheme(); last.theme = name; syncPicker(); buildKeys();
      const S = stateAt(scrollY);
      drawFigure(cx2, cv.width, cv.height, S.t, turn + swayVal, S.mix, S.fade, smooth(intro)); last.key = "";
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-swap")));
    };
    const r = tpBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (document.startViewTransition && !reduce.matches) {
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => {
        const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
          { duration: 680, easing: "cubic-bezier(.77,0,.175,1)", pseudoElement: "::view-transition-new(root)" });
      }).catch(() => {});
    } else apply();
  }
  tpBtn.addEventListener("click", () => openMenu(tpMenu.hidden));
  opts.forEach((o, i) => {
    o.addEventListener("click", () => setTheme(o.dataset.themePick));
    o.addEventListener("keydown", e => {
      // right to left: ← and ↓ go on, → and ↑ go back
      const k = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1, Home: -99, End: 99 }[e.key];
      if (e.key === "Escape") { e.preventDefault(); openMenu(false); tpBtn.focus(); return; }
      if (k === undefined) return;
      e.preventDefault();
      const n = Math.abs(k) === 99 ? (k > 0 ? opts.length - 1 : 0) : (i + k + opts.length) % opts.length;
      opts[n].focus(); setTheme(opts[n].dataset.themePick);
    });
  });
  document.addEventListener("pointerdown", e => { if (!tpMenu.hidden && !e.target.closest(".theme-pick")) openMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !tpMenu.hidden) { openMenu(false); tpBtn.focus(); } });

  /* ════ Start ════ */
  readTheme(); last.theme = themeNow(); syncPicker();
  root.classList.add("art");
  measure();
  let rz = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { measure(); schedule(); }); }).observe(document.body);
  addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { measure(); schedule(); }); });
  if (document.fonts) document.fonts.ready.then(() => { measure(); schedule(); });

  /* free parts: words rise into place once, as they come in */
  const rv = document.querySelectorAll(".rv");
  if (reduce.matches) rv.forEach(el => el.classList.add("in"));
  else {
    const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    rv.forEach(el => rio.observe(el));
  }
  schedule();
})();
