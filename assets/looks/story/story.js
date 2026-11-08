/* «داستان بذر» (index.html, BZR-175, BZR-180): what the page does. No dependencies; the seed and the earthworm come from
   characters.js (window.BazrCharacters) and the page reads and works without them.
   - The characters: made when they come near the screen, their idle motion paused while they are off it; a tap on a
     seed plays the app's tap reaction (a happy jump and «دوست داشتن» in turn; a sleeping one wakes for a moment).
   - The growth story: the scroll through #grow drives the day (۱ → ۲۹ → ۸۳) and the stage (ریشه → گل); the earthworm
     comes up once, briefly, beside the flowering plant.
   - The carousel: dots and arrows over a native snap scroller; each moment plays once when its card is in view.
   - «آب بدهید»: each tap waters the sprout, the رکورد grows a day, the seed is happy; five taps reach گل.
   - «متد بذر»: the four sentences light one by one as they rise into the upper part of the screen.
   Motion is transform and opacity, from the scroll or a tap, and interruptible. Under «کاهش حرکت» nothing moves: the
   story is three still pictures, the moments show their end, and characters.js shows its key poses. */
(function () {
  "use strict";
  var D = document, W = window, root = D.documentElement;
  var mq = W.matchMedia ? W.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var RM = function () { return !!mq.matches; };
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return FA[d]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var later = function (fn, ms) { return W.setTimeout(fn, ms); };
  var $ = function (s, el) { return (el || D).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || D).querySelectorAll(s)); };
  var STAGES = ["ریشه", "جوانه", "ساقه", "برگ", "گل"];
  var IO = "IntersectionObserver" in W;
  D.body.classList.add("ready");

  /* ───────── characters ───────── */
  var C = W.BazrCharacters;
  var chars = new Map();
  function seedOf(host) {
    if (!C || !host) return null;
    var r = chars.get(host);
    if (r) return r;
    var o = {};
    try { o = JSON.parse(host.getAttribute("data-seed") || "{}"); } catch (e) { o = {}; }
    var c = C.seed(host, { size: o.size || 120, expression: o.face || "happy", mood: o.mood, stage: "بذر" });
    r = { c: c, o: o, taps: 0, asleep: false, entered: false, paused: [] };
    chars.set(host, r);
    if (o.hold) { c.play(o.hold); r.asleep = true; }
    else if (o.still) c.still(o.still);
    if (host.hasAttribute("data-tap")) host.addEventListener("pointerdown", function () { tap(r); });
    return r;
  }
  function tap(r) {
    var c = r.c;
    if (r.wakeT) { W.clearTimeout(r.wakeT); r.wakeT = 0; }
    if (r.asleep) {
      // asleep, it wakes for a moment and dozes off again (the app's tap on a sleeping seed)
      r.asleep = false; c.stop(); c.setExpression("happy");
      r.wakeT = later(function () { r.wakeT = 0; c.setExpression("sleep", true); c.play(r.o.hold || "خوابیدن"); r.asleep = true; }, 1900);
      return;
    }
    act(r, r.o.still || r.o.beat || (r.taps++ % 2 ? "دوست داشتن" : "شاد بودن"));
  }
  // plays an action; a seed that rests in a key pose (a mood's tile) goes back to it afterwards
  function act(r, name) {
    return r.c.play(name).then(function (ok) { if (ok && r.o.still && !r.c.disposed) r.c.still(r.o.still); return ok; });
  }
  // a character's endless idle motion (its breathing) waits while it is off the screen
  function pauseHost(host, off) {
    var r = chars.get(host);
    if (!r || !host.getAnimations) return;
    if (off) {
      r.paused = host.getAnimations({ subtree: true }).filter(function (a) { return a.playState === "running"; });
      r.paused.forEach(function (a) { a.pause(); });
    } else {
      r.paused.forEach(function (a) { if (a.playState === "paused") a.play(); });
      r.paused = [];
    }
  }
  function enter(r) {
    if (r.entered) return;
    r.entered = true;
    if (RM()) return; // without motion the characters keep their resting faces until tapped
    var o = r.o;
    if (o.enter) later(function () { act(r, o.enter === "happy" ? "شاد بودن" : o.enter); }, 700);
    else if (o.beat || o.still) later(function () { act(r, o.still || o.beat); }, 500);
  }
  var hosts = $$("[data-seed]");
  if (C && IO) {
    var near = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { seedOf(e.target); near.unobserve(e.target); } });
    }, { rootMargin: "400px 0px" });
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var r = chars.get(e.target);
        if (!r) r = e.isIntersecting ? seedOf(e.target) : null;
        if (!r) return;
        pauseHost(e.target, !e.isIntersecting);
        if (e.isIntersecting && e.intersectionRatio >= 0.6) enter(r);
      });
    }, { threshold: [0, 0.6] });
    hosts.forEach(function (h) { near.observe(h); seen.observe(h); });
  } else if (C) hosts.forEach(seedOf);

  /* ───────── things that rise in as they come into view ───────── */
  var rvs = $$(".rv");
  if (IO) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rvs.forEach(function (el) { rio.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add("in"); });

  /* ───────── the growth story ───────── */
  var grow = $("#grow");
  // [progress through the section, stage (0 ریشه … 4 گل), day]: it holds at day ۱, ۲۹ and ۸۳
  var KF = [[0, 0, 1], [0.1, 0, 1], [0.24, 1, 15], [0.38, 2, 29], [0.5, 2, 29], [0.64, 3, 56], [0.78, 4, 83], [1, 4, 83]];
  var dayEl = grow && $("[data-day]", grow), barEl = grow && $("[data-bar]", grow), nameEl = grow && $("[data-stage-name]", grow);
  var plants = grow ? $$("[data-plant]", grow) : [];
  var growHost = grow && $("[data-grow-seed]", grow);
  var gStage = 0, gDay = 1, lastPop = 0, wormDone = false, ticking = false;
  function frameAt(p) {
    var i = 0;
    while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
    var a = KF[i], b = KF[i + 1], t = b[0] > a[0] ? clamp((p - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    return { s: a[1] + (b[1] - a[1]) * t, day: Math.round(a[2] + (b[2] - a[2]) * t) };
  }
  function growUpdate() {
    ticking = false;
    if (!grow || !root.classList.contains("live")) return;
    var r = grow.getBoundingClientRect(), total = r.height - W.innerHeight;
    var p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    var f = frameAt(p), st = Math.round(f.s);
    if (f.day !== gDay) { gDay = f.day; dayEl.textContent = fa(f.day); }
    barEl.style.transform = "scaleX(" + ((f.day - 1) / 82).toFixed(4) + ")";
    if (st !== gStage) {
      var up = st > gStage;
      gStage = st;
      plants.forEach(function (img, i) { img.classList.toggle("on", i === st); });
      nameEl.textContent = STAGES[st];
      if (up && !RM() && nameEl.animate) nameEl.animate([{ transform: "scale(.9)" }, { transform: "none" }], { duration: 360, easing: "cubic-bezier(.34,1.4,.64,1)" });
      var s = seedOf(growHost), now = Date.now();
      if (s && up && st === 4 && !wormDone) { s.c.play("شاد بودن"); later(wormVisit, 900); }
      else if (s && up && now - lastPop > 500) { lastPop = now; s.c.play("فشرده و کشیده شدن"); }
    }
  }
  // the earthworm: once, about three seconds, up out of a mound beside the flowering plant and back in
  function wormVisit() {
    if (wormDone || !C || RM() || !grow) return;
    var host = $("[data-worm]", grow), r = host.getBoundingClientRect();
    if (r.bottom < 0 || r.top > W.innerHeight) return; // only where it can be seen; it may come next time
    wormDone = true;
    var w = C.worm(host, { size: Math.max(80, Math.round(r.width)), fit: false, pose: "hidden" });
    w.play("emerge").then(function (ok) {
      if (!ok) return false;
      return new Promise(function (res) { later(res, 650); }).then(function () { return w.play("hide"); });
    }).then(function () {
      host.style.opacity = "0";
      later(function () { w.dispose(); host.style.opacity = ""; }, 340);
    });
  }
  function onScroll() { if (!ticking) { ticking = true; W.requestAnimationFrame(growUpdate); } }
  function setLive() {
    var live = !RM() && !!grow;
    root.classList.toggle("live", live);
    root.classList.toggle("anim", !RM());
    if (live) { gStage = -1; growUpdate(); }
  }
  setLive();
  W.addEventListener("scroll", onScroll, { passive: true });
  W.addEventListener("resize", onScroll, { passive: true });
  if (mq.addEventListener) mq.addEventListener("change", setLive);

  /* ───────── the carousel ───────── */
  var car = $("[data-car]");
  if (car) {
    var track = $("[data-track]", car), cards = $$(".card", track), dotsEl = $("[data-dots]", car);
    var prev = $("[data-prev]", car), next = $("[data-next]", car), active = -1, cTick = false, pages = [], dots = [];
    // the places the track can rest at: each card at its snap line, clamped to the scroll range, the same ones merged
    // (on a wide screen the last cards share the end), one dot for each
    var centred = function () { return (getComputedStyle(cards[0]).scrollSnapAlign || "").indexOf("center") >= 0; };
    var startPad = function () { return parseFloat(getComputedStyle(track).paddingRight) || 0; };
    var measure = function () {
      var tr = track.getBoundingClientRect(), mid = centred(), sl = track.scrollLeft;
      var span = track.scrollWidth - track.clientWidth, lo = -span, hi = 0; // RTL: scrollLeft runs from 0 to −span
      if (getComputedStyle(track).direction !== "rtl") { lo = 0; hi = span; }
      var list = [];
      cards.forEach(function (c) {
        var cr = c.getBoundingClientRect();
        var dx = mid ? cr.left + cr.width / 2 - (tr.left + tr.width / 2) : cr.right - (tr.right - startPad());
        var t = clamp(sl + dx, lo, hi);
        if (!list.length || Math.abs(list[list.length - 1] - t) > 4) list.push(t);
      });
      return list;
    };
    var build = function () {
      pages = measure();
      if (dots.length === pages.length) return;
      dotsEl.textContent = "";
      dots = pages.map(function (t, i) {
        var b = D.createElement("button");
        b.type = "button"; b.className = "dot";
        b.setAttribute("aria-label", "کارت " + fa(i + 1) + " از " + fa(pages.length));
        b.addEventListener("click", function () { go(i); });
        dotsEl.appendChild(b);
        return b;
      });
      active = -1;
    };
    var go = function (i) {
      track.scrollTo({ left: pages[clamp(i, 0, pages.length - 1)], behavior: RM() ? "auto" : "smooth" });
    };
    var setActive = function () {
      cTick = false;
      var sl = track.scrollLeft, i = 0, bd = Infinity;
      pages.forEach(function (t, k) { var d = Math.abs(t - sl); if (d < bd) { bd = d; i = k; } });
      if (i === active) return;
      active = i;
      dots.forEach(function (d, k) { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
      prev.disabled = i <= 0;
      next.disabled = i >= pages.length - 1;
    };
    prev.addEventListener("click", function () { go(active - 1); });
    next.addEventListener("click", function () { go(active + 1); });
    track.addEventListener("scroll", function () { if (!cTick) { cTick = true; W.requestAnimationFrame(setActive); } }, { passive: true });
    W.addEventListener("resize", function () { build(); active = -1; setActive(); }, { passive: true });
    build();
    setActive();

    // the moments: each plays once when its card is well in view
    var course = $('[data-card="course"]', track);
    var cgPlants = course ? $$("[data-cg]", course) : [], cgName = course && $("[data-cg-name]", course);
    var cgShow = function (k) { cgPlants.forEach(function (img, i) { img.classList.toggle("on", i === k); }); cgName.textContent = STAGES[k]; };
    if (course && !RM()) cgShow(0);
    var playCard = function (card) {
      if (card.classList.contains("played")) return;
      card.classList.add("played");
      var kind = card.getAttribute("data-card"), r = seedOf($("[data-moment-seed]", card));
      if (kind === "task" && r) later(function () { r.c.play("شاد بودن"); }, 640);
      if (kind === "vine" && r) later(function () { r.c.play("دوست داشتن").then(function (ok) { if (ok) r.c.look(-1); }); }, 620);
      if (kind === "course") {
        if (RM()) return cgShow(4);
        var k = 0;
        var step = function () { if (k < 4) { k++; cgShow(k); later(step, 720); } };
        later(step, 520);
      }
    };
    if (IO) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { playCard(e.target); cio.unobserve(e.target); } });
      }, { threshold: 0.6 });
      cards.forEach(function (c) { cio.observe(c); });
    } else cards.forEach(playCard);
  }

  /* ───────── «آب بدهید» ───────── */
  var wcard = $("[data-water]");
  if (wcard) {
    var btn = $("[data-water-btn]", wcard), streak = $("[data-streak]", wcard), chip = $("[data-wchip]", wcard);
    var live = $("[data-water-live]", wcard), wplants = $$("[data-wp]", wcard), dropsEl = $("[data-drops]", wcard);
    var wHost = $("[data-water-seed]", wcard), n = 0;
    var DROP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5s7 7.4 7 12.2a7 7 0 0 1-14 0C5 9.9 12 2.5 12 2.5z" fill="#5fbccb"/><path d="M12 2.5s7 7.4 7 12.2a7 7 0 0 1-3.2 5.9C17.6 17 16 11 12 2.5z" fill="#3f9fb0"/><ellipse cx="9.4" cy="13.4" rx="1.6" ry="2.6" fill="#bfe8ec" opacity=".9"/></svg>';
    var drops = [0, 1, 2].map(function (i) {
      var s = D.createElement("span");
      s.innerHTML = DROP;
      var svg = s.firstChild;
      svg.style.left = [38, 52, 45][i] + "%";
      svg.style.top = "46%";
      dropsEl.appendChild(svg);
      return svg;
    });
    var rain = function () {
      if (RM() || !drops[0].animate) return;
      var fall = Math.round(dropsEl.clientHeight * 0.42);
      drops.forEach(function (d, i) {
        d.animate([
          { opacity: 0, transform: "translateY(-26px) scale(.8)" },
          { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.25 },
          { opacity: 1, transform: "translateY(" + fall + "px) scale(.95)", offset: 0.82 },
          { opacity: 0, transform: "translateY(" + (fall + 10) + "px) scale(.7,.4)" },
        ], { duration: 620, delay: i * 90, easing: "cubic-bezier(.45,0,.75,.4)", fill: "both" });
      });
    };
    var render = function (watered) {
      streak.textContent = fa(n);
      wplants.forEach(function (img) { img.classList.toggle("on", +img.getAttribute("data-wp") === n); });
      if (n) { chip.textContent = STAGES[n - 1]; chip.removeAttribute("data-empty"); } else chip.setAttribute("data-empty", "");
      btn.textContent = n >= 5 ? "از اول" : "آب بدهید";
      live.textContent = fa(n) + " روز پشت هم" + (n ? "، " + STAGES[n - 1] : "");
      if (!watered) return;
      rain();
      var r = seedOf(wHost);
      if (r) later(function () { r.c.play(n >= 5 ? "دوست داشتن" : "شاد بودن"); }, RM() ? 0 : 260);
    };
    btn.addEventListener("click", function () {
      if (n >= 5) { n = 0; render(false); return; }
      n++;
      render(true);
    });
  }

  /* ───────── «متد بذر»: each sentence lights as it rises past the lower part of the screen, and dims below it ───────── */
  var voices = $("[data-voices]");
  if (voices && IO) {
    voices.setAttribute("data-live", "");
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle("lit", e.isIntersecting && e.intersectionRatio >= 0.8); });
    }, { rootMargin: "0px 0px -26% 0px", threshold: [0, 0.8, 1] });
    $$("li", voices).forEach(function (li) { vio.observe(li); });
  }

  /* ───────── the slow words: they drift only while they can be seen ───────── */
  var words = $("[data-words]");
  if (words && IO) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) words.removeAttribute("data-paused"); else words.setAttribute("data-paused", ""); });
    }).observe(words);
  }
})();
