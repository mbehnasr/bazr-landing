/* بذر · رشته — the art and the behaviour of /thread/ (BZR-182, a second preview beside /bzr/).
   One long wire, generated here in code, loops around the volume of a standing person. Scrolling moves it from a
   tangle (t = 0) to a clear figure (t = 1): «فاصله‌ی میان دانستن و زندگی کردن». The wire is three threads:
     بدن   the loops that hug the torso, the arms and the legs;
     ذهن   the loops around the head and the neck;
     روح   the loose loops that reach out past the figure.
   Choosing a world colours its thread and lets the other two fade. Ink on paper; a world's colour shows only when it is
   chosen. A tiny 3D projection on a 2D canvas, no library. It draws only while a canvas is on screen in a visible tab,
   holds still after 30 s without input, and under «کاهش حرکت» shows one still frame of the clear figure. */
(() => {
  "use strict";
  const root = document.documentElement;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const DPR = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = matchMedia("(max-width: 699px)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const smooth = u => u * u * (3 - 2 * u);
  const WORLDS = ["body", "mind", "soul"];
  const INK = [28, 36, 32];
  const TONE = { body: [176, 96, 42], mind: [24, 118, 116], soul: [120, 88, 164] };

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
  const WIRE = narrow ? buildWire(.062, 22, 7) : buildWire(.044, 28, 7);
  const POS = new Float32Array(WIRE.N * 3);
  let posT = -1;
  function positions(t) {
    // the wire at t: each stretch settles on its own delay, so the tangle calms in waves
    if (t >= 1) return WIRE.calm;
    if (t === posT) return POS;
    const { N, calm, wild, delay } = WIRE;
    for (let i = 0; i < N; i++) {
      const e = smooth(clamp((t - delay[i]) / .6, 0, 1)), o = i * 3;
      POS[o] = wild[o] + (calm[o] - wild[o]) * e; POS[o + 1] = wild[o + 1] + (calm[o + 1] - wild[o + 1]) * e; POS[o + 2] = wild[o + 2] + (calm[o + 2] - wild[o + 2]) * e;
    }
    posT = t; return POS;
  }

  /* ════ Drawing: perspective, depth (near lines darker and thicker), three threads ════ */
  const BUCKETS = 4, ALPHA = [.26, .44, .66, .9], WIDTH = [.75, .95, 1.2, 1.5];
  const shadowSprite = (() => { const o = document.createElement("canvas"); o.width = o.height = 128; const c = o.getContext("2d"); const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(40,34,26,.34)"); g.addColorStop(.5, "rgba(40,34,26,.12)"); g.addColorStop(1, "rgba(40,34,26,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); return o; })();
  // mix: how much of its colour each thread shows; fade: how much of it shows at all
  function drawFigure(c, W, H, cam, t, phi, mix, fade, weight = 1) {
    c.clearRect(0, 0, W, H);
    const P = positions(t), N = WIRE.N, world = WIRE.world;
    const D = 5.2, s = cam.s, f = s * D, cx = W / 2 + (cam.x || 0) * s, cy = H * cam.cy, ty = cam.ty;
    const cphi = Math.cos(phi), sphi = Math.sin(phi);
    // the shadow on the floor: wide and faint in the tangle, close and darker under the clear figure
    const sw = Math.min(W * .48, s * (.8 - .38 * t)), sh = sw * .14, fy = cy + ty * f / D;
    c.globalAlpha = .55 + .45 * t; c.drawImage(shadowSprite, cx - sw, fy - sh, sw * 2, sh * 2); c.globalAlpha = 1;
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
      const tone = TONE[WORLDS[w]], m = mix[w], fa = fade[w];
      const rgb = INK.map((v, j) => Math.round(v + (tone[j] - v) * m));
      for (let b = 0; b < BUCKETS; b++) {
        c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(ALPHA[b] * fa * (1 + .12 * m)).toFixed(3)})`;
        c.lineWidth = WIDTH[b] * DPR * weight * (1 + .25 * m);
        c.stroke(paths[w * BUCKETS + b]);
      }
    }
  }
  function headAt(W, H, cam) {
    const D = 5.2, s = cam.s, f = s * D, cx = W / 2 + (cam.x || 0) * s, cy = H * cam.cy;
    return { x: cx, y: cy + (cam.ty - 1.7) * f / D, r: .16 * s, floor: cy + cam.ty * f / D, half: .34 * s };
  }

  /* ════ Views: canvases that draw while visible ════ */
  const views = [];
  let lastNow = 0, lastDraw = 0, raf = 0, lastInput = performance.now(), clock = 0;
  const IDLE = 30000;
  for (const ev of ["scroll", "pointermove", "pointerdown", "keydown", "touchstart", "wheel"]) addEventListener(ev, () => { const was = performance.now() - lastInput > IDLE; lastInput = performance.now(); if (was) { lastNow = 0; schedule(); } }, { passive: true });
  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0;
    lastNow = now; clock += dt;
    const live = !reduce.matches && now - lastInput < IDLE;
    const due = now - lastDraw >= 64;               // the slow turn: 15 frames a second at most
    let again = false;
    for (const v of views) {
      if (!v.visible) continue;
      const moving = v.step ? v.step(dt, live) : false;   // scroll, a drag or a change of world: every frame
      if (live || moving) again = true;
      if (v.dirty || moving || (due && live)) { v.render(dt); v.dirty = false; }
    }
    if (due) lastDraw = now;
    if (again) schedule(); else lastNow = 0;
  }
  document.addEventListener("visibilitychange", () => { lastNow = 0; if (!document.hidden) schedule(); });
  reduce.addEventListener("change", () => { views.forEach(v => v.dirty = true); schedule(); });
  const io = new IntersectionObserver(es => { for (const e of es) { const v = e.target.__view; v.visible = e.isIntersecting; if (v.visible) { v.dirty = true; schedule(); } } });
  const ro = new ResizeObserver(es => { for (const e of es) { e.target.__view.resize(); schedule(); } });
  function addView(canvas, v) {
    v.canvas = canvas; v.c = canvas.getContext("2d"); v.visible = false; v.dirty = true;
    v.resize = function () { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * DPR)); canvas.height = Math.max(1, Math.round(r.height * DPR)); this.dirty = true; };
    canvas.__view = v; v.resize(); views.push(v); io.observe(canvas); ro.observe(canvas);
    return v;
  }
  // a fixed look at the clear figure, turning slowly: each world's section on a phone or a tablet, and the closing scene
  const STILL_MIX = { body: [1, 0, 0], mind: [0, 1, 0], soul: [0, 0, 1], all3: [1, 1, 1] };
  const STILL_FADE = { body: [1, .16, .16], mind: [.16, 1, .16], soul: [.16, .16, 1], all3: [1, 1, 1] };
  const SWAY = .55;   // the figure turns slowly from side to side around the front, never far enough to lose its arms
  const sway = off => reduce.matches ? off * .3 : SWAY * Math.sin(clock * .22 + off);
  function stillView(canvas, state, camFor, off) {
    addView(canvas, {
      render() { const W = canvas.width, H = canvas.height; drawFigure(this.c, W, H, camFor(W, H), 1, sway(off), STILL_MIX[state], STILL_FADE[state], .95); }
    });
  }
  const fullCam = (W, H) => ({ s: Math.min(W / 1.5, H / 2.1), cy: .5, ty: .94 });
  document.querySelectorAll("canvas.world").forEach((cv, i) => stillView(cv, cv.dataset.w, fullCam, .9 + i * 1.7));
  document.querySelectorAll("canvas.closing").forEach(cv => stillView(cv, "all3", fullCam, -.6));

  /* ════ The figure: scroll draws it out of the tangle; drag turns it; the worlds colour its threads ════ */
  const cv = document.getElementById("figure");
  if (!cv) return;
  root.classList.add("art");
  const desk = matchMedia("(min-width: 1024px) and (min-height: 600px)");
  const worldsEl = document.querySelector(".worlds");
  const stage = document.getElementById("stage");
  const tabs = [...document.querySelectorAll(".legend [role=tab]")];
  const cap = document.getElementById("tri-cap"), capAll = cap.innerHTML;
  const caps = {}; document.getElementById("caps").content.querySelectorAll("p").forEach(p => caps[p.dataset.w] = p.innerHTML);
  const navs = [...document.querySelectorAll(".top nav a[data-w]")];
  const bar = document.getElementById("top-bar");
  const bodyHead = document.getElementById("h-body");
  let state = "all", touched = false;
  let tShow = reduce.matches ? 1 : 0, tGoal = tShow;
  let turn = 0, spin = 0, drag = null;   // turn: how far a drag has turned the figure; it eases back to face you
  const mix = [0, 0, 0], fade = [1, 1, 1], mixGoal = [0, 0, 0], fadeGoal = [1, 1, 1];
  const cam = (W, H) => ({ s: Math.min(W / 2.05, H / 2.2), cy: .5, ty: .98 });

  function goalT() {
    if (reduce.matches) return 1;
    if (desk.matches) {
      // from the top of the page until the first world's name is 60% of the way down the screen: the figure is clear
      // just before that world lights
      const end = bodyHead.getBoundingClientRect().top + scrollY - innerHeight * .6;
      return clamp(scrollY / Math.max(1, end), 0, 1);
    }
    const r = cv.getBoundingClientRect(), top = bar.offsetHeight;
    return clamp((innerHeight * .92 - r.top) / Math.max(1, innerHeight * .92 - top - 16), 0, 1);
  }
  const fig = addView(cv, {
    step(dt, live) {
      let moving = false;
      tGoal = goalT();
      if (Math.abs(tGoal - tShow) > .0005) { tShow += (tGoal - tShow) * (1 - Math.exp(-dt * 7)); if (Math.abs(tGoal - tShow) < .001) tShow = tGoal; moving = true; }
      for (let w = 0; w < 3; w++) {
        if (Math.abs(mixGoal[w] - mix[w]) > .002 || Math.abs(fadeGoal[w] - fade[w]) > .002) {
          const k = reduce.matches ? 1 : 1 - Math.exp(-dt * 6);
          mix[w] += (mixGoal[w] - mix[w]) * k; fade[w] += (fadeGoal[w] - fade[w]) * k; moving = true;
        }
      }
      if (!drag) {
        if (Math.abs(spin) > .02) { turn += spin * dt; spin *= Math.exp(-dt * 2.4); moving = true; }
        else {
          const home = Math.round(turn / TAU) * TAU;
          if (Math.abs(turn - home) > .002) { turn += (home - turn) * (1 - Math.exp(-dt * .9)); moving = true; } else turn = home;
        }
      }
      if (drag) moving = true;
      return moving;
    },
    render() { const W = cv.width, H = cv.height; drawFigure(this.c, W, H, cam(W, H), tShow, turn + sway(.4), mix, fade); }
  });
  addEventListener("scroll", () => { if (Math.abs(goalT() - tShow) > .0005) schedule(); }, { passive: true });

  function set(next) {
    if (next === state) return;
    state = next;
    worldsEl.dataset.state = next;
    if (desk.matches) document.body.dataset.state = next; else delete document.body.dataset.state;
    stage.classList.toggle("tri-all", next === "all" || next === "all3");
    stage.classList.toggle("tri-three", next === "all3");
    tabs.forEach(t => t.setAttribute("aria-selected", t.dataset.w === next));
    const focusable = tabs.find(t => t.dataset.w === next) || tabs[0];
    tabs.forEach(t => t.tabIndex = t === focusable ? 0 : -1);
    navs.forEach(a => { if (a.dataset.w === next) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    const one = WORLDS.includes(next);
    cap.style.setProperty("--w", one ? `var(--${next})` : "");
    cap.style.setProperty("--wi", one ? `var(--${next}-ink)` : "");
    cap.innerHTML = one ? caps[next] : capAll;
    WORLDS.forEach((w, i) => {
      mixGoal[i] = next === "all3" || next === w ? 1 : 0;
      fadeGoal[i] = one && next !== w ? .14 : 1;
    });
    fig.dirty = true; schedule();
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
  // drag turns the figure (with a little momentum); a tap picks the thread under it: the head is ذهن, the body بدن,
  // anything past the silhouette روح
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, last: e.clientX, t: performance.now(), moved: false }; spin = 0; schedule(); });
  cv.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.last, now = performance.now();
    if (Math.abs(e.clientX - drag.x) > 6) drag.moved = true;
    turn += dx * .011; spin = clamp(dx * .011 / Math.max(.008, (now - drag.t) / 1000), -6, 6);
    drag.last = e.clientX; drag.t = now; fig.dirty = true; schedule();
  });
  const end = e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) {
      spin = 0;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * DPR, y = (e.clientY - r.top) * DPR;
      const h = headAt(cv.width, cv.height, cam(cv.width, cv.height));
      const w = Math.hypot(x - h.x, y - h.y) < h.r * 1.5 ? "mind" : (Math.abs(x - h.x) < h.half && y > h.y && y < h.floor ? "body" : "soul");
      choose(w);
    }
    schedule();
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", () => { drag = null; });

  /* desktop: the words lead; each block sets its world (or all three) as it crosses the middle of the screen */
  let sio;
  function watch() {
    if (sio) sio.disconnect();
    if (!desk.matches) return;
    sio = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) set(e.target.dataset.step); }, { rootMargin: "-50% 0px -50% 0px" });
    // each block's heading (or the block itself) sets the world as it crosses the middle line
    document.querySelectorAll("[data-step]").forEach(el => { const h = el.querySelector("h1, h2"); h.dataset.step = el.dataset.step; sio.observe(h); });
  }
  function place() {
    if (desk.matches) { const top = bar.offsetHeight, h = stage.offsetHeight; stage.style.top = Math.max(top + 8, Math.round(top + (innerHeight - top - h) / 2)) + "px"; }
    else stage.style.top = "";
  }
  place(); addEventListener("resize", place);
  desk.addEventListener("change", () => {
    watch(); place();
    if (desk.matches) document.body.dataset.state = state; else delete document.body.dataset.state;
  });
  watch();
  stage.classList.add("shown");

  // on a phone the button goes to the figure; on a desktop to the first world's words
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
