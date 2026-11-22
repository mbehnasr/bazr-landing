"""BZR-208: two landing previews shaped like the app («باغ زنده»), made from /garden/ (v2, BZR-169) with its copy unchanged.

  /hill/    the app's garden screen: the Owner's painting full-bleed, the page's title on a glass card where the app
            writes «باغ بذر», the four course places as the app's glass course pills on the painting, and every section a
            glass card over the painting, which stays behind the page as you read.
  /places/  the app's course pages: an app-width column on cream; the first view is a painted header that fades into the
            page (the app's PlaceTop), and every section is a card that opens on its own painted crop (the app's course
            card), with a glass pill of section links at the foot, within a thumb's reach.

ADR-0006 holds: no app screens, only the app's illustration and its visual language (colours, glass, pills, buttons);
ADR-0032 (product shots) is still Aynaz's to decide (BZR-199). Both are noindex previews, as every preview is.
Run: python3 build.py <bazr-landing checkout>"""
import pathlib, re, sys

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/home/mmb/workstation/bazr-landing-appshape")
SRC = (ROOT / "garden/index.html").read_text(encoding="utf-8")

def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:80])
    return s.replace(a, b)

def hero_of(s):
    i = s.index('<section class="hero" id="top">'); j = s.index("</section>", i) + len("</section>")
    return i, j

# the four places on the painting (public/art/garden/scene.json in bazr-app: cards in 720 × 1280 scene units)
CARDS = {"food": (106, 313, 242), "sleep": (467, 411, 223), "move": (48, 683, 242), "care": (468, 733, 229)}
NAMES = re.findall(r'<div class="pill" style="--c:var\(--c-(\w+)\)">.*?<b>([^<]+)</b>', SRC, re.S)
ICONS = dict(re.findall(r'<div class="pill" style="--c:var\(--c-(\w+)\)"><span class="ic" aria-hidden="true">(.*?)</span><b>', SRC, re.S))
assert len(NAMES) == 4, NAMES
# the hero's title alone (the glass card on the painting) and the rest (under it): split, never reworded
H1 = re.search(r'<h1 class="h1">.*?</h1>', SRC, re.S).group(0)
SEED = re.search(r'<span class="seed" id="seed"[^>]*>(?:<img[^>]*>\s*)+</span>', SRC).group(0)
HERO_TEXT = re.search(r'<div class="hero-text">(.*?)</div>\s*<figure class="hero-art">', SRC, re.S).group(1)
PAINT = ('<img class="paint" src="../assets/looks/garden/hero-day-780.webp" srcset="../assets/looks/garden/hero-day-780.webp 780w, '
         '../assets/looks/garden/hero-day-1120.webp 1120w" sizes="100vw" width="1120" height="1991" '
         'alt="باغ بذر: نقاشی باغی پلکانی با سفره‌خانه، تخت زیر ماه، حیاط ورزش و آینه‌ی میان گل‌ها، و دروازه‌ی سنگی با فانوس‌ها" fetchpriority="high">')

def pills(cls):
    out = []
    for zone, name in NAMES:
        x, y, w = CARDS[zone]
        # a card in the painting's right half keeps its right edge, so it grows toward the middle, as in the app
        side = f"right:{(720 - x - w) / 720 * 100:.2f}%" if x + w / 2 > 360 else f"left:{x / 720 * 100:.2f}%"
        out.append(f'<li class="{cls}" style="{side};--y:{y / 1280 * 100:.2f}%">'
                   f'<a class="pill" href="#grow" style="--c:var(--c-{zone})"><span class="ic" aria-hidden="true">{ICONS.get(zone, "")}</span><b>{name}</b><span class="bar" aria-hidden="true"><i></i></span></a></li>')
    return "\n".join(out)

COMMON_CSS = """
/* ════ BZR-208: shaped like the app («باغ زنده»). The tokens are the app's own (above); what follows is its shapes. ════ */
.btn{ border-radius:999px; box-shadow:0 1px 0 rgb(255 255 255 / .22) inset, 0 6px 16px -10px rgb(70 44 20 / .28); }
.btn:active{ transform:scale(.97); }
.btn-line{ background:var(--glass); box-shadow:0 0 0 1px var(--glass-edge) inset, 0 6px 16px -12px rgb(70 44 20 / .28); }
.pill{ border-radius:999px; background:var(--glass); box-shadow:0 0 0 1px var(--glass-edge) inset, 0 2px 6px -2px rgb(96 64 32 / .12), 0 14px 30px -16px rgb(70 44 20 / .28); }
"""

# ═══════════════════════════════════ /hill/ ═══════════════════════════════════
def hill():
    s = SRC
    i, j = hero_of(s)
    hero = f'''<section class="hero hill" id="top">
  <div class="hill-stage">
    {PAINT}
    {SEED}
    <div class="hill-head">{H1}</div>
    <ul class="hill-places" aria-label="دوره‌ها، هر کدام جایی در باغ بذر">
{pills("hill-place")}
    </ul>
  </div>
  <div class="hill-intro">{HERO_TEXT.replace(H1, "")}</div>
</section>'''
    s = s[:i] + hero + s[j:]
    css = COMMON_CSS + """
/* the first view: the painting full-bleed, as the app's باغ بذر opens */
.hill{ padding:0; }
.hill-stage{ position:relative; width:min(100%, calc(100svh * 1120 / 1991 * 1.15)); margin-inline:auto; aspect-ratio:1120 / 1991; max-height:none; overflow:hidden; }
@media (min-width:700px){ .hill-stage{ width:min(100%, 760px); border-radius:0 0 40px 40px; box-shadow:var(--frame-shadow); } }
.hill-stage .paint{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.hill-head{ position:absolute; inset-inline-start:16px; max-width:min(78%, 30rem); top:calc(var(--top, 64px) + 8px); padding:14px 18px; border-radius:24px; background:var(--glass); box-shadow:0 0 0 1px var(--glass-edge) inset, var(--shadow); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); }
.hill-head .h1{ font-size:clamp(1.15rem, .95rem + 1.2vw, 1.75rem); line-height:1.6; margin:0; }
/* under the painting, rising over its foot: the lead, «شروع» and the way down (the app's cream card over a picture) */
.hill-intro{ position:relative; display:grid; gap:14px; width:min(100% - 32px, 40rem); margin:-56px auto 0; padding:22px; border-radius:28px; background:var(--card); box-shadow:0 0 0 1px var(--glass-edge) inset, var(--shadow); }
.hill-intro .logo{ width:56px; height:auto; }
.hill-places{ list-style:none; margin:0; padding:0; }
/* scene.json measures from the painting's left edge, so the places do too (not inset-inline, which is the right in RTL) */
.hill-place{ position:absolute; top:calc(var(--y) + 6%); max-width:72%; }
.hill-place .pill{ display:flex; text-decoration:none; color:var(--ink); white-space:nowrap; }
/* on a phone, the app's compact cards: smaller words and colour circle, no bar */
@media (max-width:699px){ .hill-place .pill .bar{ display:none; } .hill-place .pill{ padding-block:5px; gap:8px; font-size:.86rem; } .hill-place .pill .ic{ width:30px; height:30px; } }
/* the rest of the page: glass cards over the painting, which stays behind as you read */
body::before{ content:""; position:fixed; inset:0; z-index:-1; background:linear-gradient(rgb(246 239 230 / .72), rgb(246 239 230 / .86)), center / cover no-repeat url("../assets/looks/garden/hero-day-780.webp"); }
main > .sec:not(.hill):not(.end) > .wrap{ background:var(--glass); border-radius:32px; padding-block:28px; box-shadow:0 0 0 1px var(--glass-edge) inset, var(--shadow); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }
@media (min-width:700px){ main > .sec:not(.hill):not(.end) > .wrap{ padding:44px 48px; } }
main > .sec{ padding-block:20px; }
.band, .pricing{ background:transparent; }
"""
    s = rep(s, "</style>", css + "</style>")
    s = rep(s, "<!-- ── First view: the Owner's whole painting, framed, and the title", "<!-- ── /hill/ (BZR-208): the app's garden screen as the first view; below, glass cards over the painting. The rest is /garden/'s, word for word.\n     ── First view (/garden/ v2's note): the Owner's whole painting, framed, and the title")
    return s

# ═══════════════════════════════════ /places/ ═══════════════════════════════════
# each section opens on a painted crop, as a course card opens on its place
CROPS = {"signal": "crop-stairs", "gap": "crop-lotus", "what": "place-food-780", "path": "crop-bridge", "your-path": "place-move-780",
         "method": "place-care-780", "inside": "place-sleep-780", "membership": "crop-lotus", "faq": "crop-bridge", "story": "crop-stairs"}
NAV = [("what", "بذر چیست؟"), ("path", "مسیر"), ("inside", "داخل بذر"), ("membership", "عضویت بذر"), ("faq", "سؤال‌ها")]

def places():
    s = SRC
    i, j = hero_of(s)
    hero = f'''<section class="hero place-top" id="top">
  <div class="place-art">{PAINT}{SEED}</div>
  <div class="place-words">{HERO_TEXT}</div>
</section>'''
    s = s[:i] + hero + s[j:]
    navs = "".join(f'<a href="#{a}">{t}</a>' for a, t in NAV)
    s = rep(s, "</main>", f'</main>\n<nav class="dock" aria-label="بخش‌های صفحه، پایین صفحه">{navs}</nav>')
    crops = "\n".join(f'#{sec} > .wrap::before{{ background-image:url("../assets/looks/garden/{img}.webp"); }}' for sec, img in CROPS.items())
    css = COMMON_CSS + """
/* the page as the app's column: cream, about a phone and a half wide */
main{ max-width:44rem; margin-inline:auto; padding-bottom:96px; }
.top .wrap, .foot .wrap{ max-width:44rem; }
/* the first view: a painted header that fades into the page (the app's PlaceTop), the words under it */
.place-top{ padding:0; }
.place-art{ position:relative; height:min(62svh, 520px); overflow:hidden; -webkit-mask-image:linear-gradient(#000 62%, transparent); mask-image:linear-gradient(#000 62%, transparent); }
.place-art .seed{ display:none; }
.place-art .paint{ width:100%; height:100%; object-fit:cover; object-position:50% 72%; }
.place-words{ display:grid; gap:12px; margin-top:-64px; position:relative; padding-inline:16px; }
.place-words .logo{ width:64px; height:auto; }
.place-words .h1{ font-size:clamp(1.4rem, 1.1rem + 1.4vw, 2rem); line-height:1.55; }
/* every section a card that opens on its own painted crop (the app's course card) */
main > .sec:not(.place-top):not(.end){ padding-block:14px; }
main > .sec:not(.place-top):not(.end) > .wrap{ display:block; padding:0 0 28px; overflow:hidden; border-radius:28px; background:var(--card); box-shadow:0 0 0 1px var(--glass-edge) inset, var(--shadow); }
main > .sec:not(.place-top):not(.end) > .wrap > *{ margin-inline:20px; }
main > .sec:not(.place-top):not(.end) > .wrap::before{ content:""; display:block; height:9.5rem; margin-bottom:8px; background:center 60% / cover no-repeat; -webkit-mask-image:linear-gradient(#000 58%, transparent); mask-image:linear-gradient(#000 58%, transparent); }
.band, .pricing{ background:transparent; }
.grid{ display:block; }
/* the section's own painted crop opens its card, so /garden/'s small decorative crop in it would be a second picture */
main > .sec .frame-sm{ display:none; }
""" + crops + """
/* the section links at the foot, on a glass pill within a thumb's reach (the app's tab bar's place, not its tabs) */
.dock{ position:fixed; inset-inline:12px; bottom:max(12px, env(safe-area-inset-bottom)); z-index:30; display:flex; gap:4px; justify-content:space-between; max-width:40rem; margin-inline:auto; padding:6px; border-radius:999px; background:var(--glass); box-shadow:0 0 0 1px var(--glass-edge) inset, 0 14px 30px -12px rgb(70 44 20 / .35); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); overflow-x:auto; }
.dock a{ flex:1 0 auto; min-height:44px; display:grid; place-items:center; padding-inline:12px; border-radius:999px; color:var(--ink); font-weight:700; font-size:.88rem; text-decoration:none; white-space:nowrap; }
.dock a:active{ background:var(--stone); }
"""
    s = rep(s, "</style>", css + "</style>")
    s = rep(s, "<!-- ── First view: the Owner's whole painting, framed, and the title", "<!-- ── /places/ (BZR-208): the app's course pages, an app-width column, each section a card on its own painted crop. The rest is /garden/'s, word for word.\n     ── First view (/garden/ v2's note): the Owner's whole painting, framed, and the title")
    return s

for name, page in [("hill", hill()), ("places", places())]:
    out = ROOT / name / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print("wrote", out, len(page.encode()))
