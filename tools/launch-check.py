#!/usr/bin/env python3
"""What index.html still needs before it goes public at https://bazrlife.com/ (BZR-138, ADR-0019).

Run:  python3 tools/launch-check.py [path/to/index.html]
Prints one line per open item, with the decision or issue it waits on, and exits 1 while anything is open.
It only reads the page; it changes nothing.
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

PAGE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "index.html"
SITE = "https://bazrlife.com/"   # the landing's address, ADR-0019
# The same rule as the first script in index.html: https:// and a host, nothing after it.
APP_ORIGIN = re.compile(r"https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*(:[0-9]{1,5})?/?")

FACTS = {
    "owner": "business owner's name (decision B1, BZR-67)",
    "address": "address registered with e-Namad (BZR-67)",
    "phone": "phone number (BZR-67)",
    "email": "email address (BZR-67)",
}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.noindex = False
        self.app_url = None
        self.canonical = None
        self.og_url = None
        self.og_image = None
        self.facts = {}          # data-fact -> text inside it
        self.fact_stack = []     # open data-fact elements: [name, depth]
        self.depth = 0
        self.enamad = False
        self.pending = []        # data-pending values of elements still on the page
        self.preview_note = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            if a.get("name") == "robots" and "noindex" in (a.get("content") or ""):
                self.noindex = True
            if a.get("name") == "bazr-app-url":
                self.app_url = (a.get("content") or "").strip()
            if a.get("property") == "og:url":
                self.og_url = a.get("content")
            if a.get("property") == "og:image":
                self.og_image = a.get("content") or ""
            return
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href")
            return
        if tag in ("img", "a") and "enamad.ir" in (a.get("src") or a.get("href") or ""):
            self.enamad = True
        if "data-pending" in a:
            self.pending.append(a["data-pending"])
        if tag in ("br", "img", "input", "link", "meta", "source", "hr", "wbr"):
            return
        self.depth += 1
        if "data-fact" in a:
            self.fact_stack.append([a["data-fact"], self.depth])
            self.facts.setdefault(a["data-fact"], "")

    def handle_endtag(self, tag):
        if self.fact_stack and self.fact_stack[-1][1] == self.depth:
            self.fact_stack.pop()
        self.depth -= 1

    def handle_data(self, data):
        for name, _ in self.fact_stack:
            self.facts[name] += data
        if "پیش‌نمایش داخلی تیم" in data:
            self.preview_note = True


def main():
    p = Page()
    p.feed(PAGE.read_text(encoding="utf-8"))
    todo = []
    if p.noindex:
        todo.append("robots meta still says noindex: Owner پروژه decides which design ships and when (BZR-139)")
    if p.canonical != SITE or p.og_url != SITE:
        todo.append(f"canonical link and og:url must both be {SITE} (ADR-0019)")
    if not (p.og_image or "").startswith(SITE):
        todo.append(f"og:image must be an absolute address under {SITE} (ADR-0019)")
    if not p.app_url:
        todo.append("meta bazr-app-url is empty: the «شروع» buttons and the terms/privacy links stay hidden "
                    "until the app opens to the public (ADR-0019); /privacy must exist in the app first (BZR-74)")
    elif not APP_ORIGIN.fullmatch(p.app_url):
        todo.append(f"meta bazr-app-url is {p.app_url!r}, which the page ignores: write https:// and the host only, "
                    "with no path, query or fragment (ADR-0019)")
    robots = PAGE.parent / "robots.txt"
    if not robots.is_file() or any(l.split("#")[0].strip().lower().replace(" ", "") == "disallow:/"
                                   for l in robots.read_text(encoding="utf-8").splitlines()):
        todo.append("robots.txt is missing or blocks the site: crawlers must be able to read the page (BZR-138)")
    if not (PAGE.parent / "sitemap.xml").is_file():
        todo.append("sitemap.xml is missing (BZR-138)")
    for name, label in FACTS.items():
        if not p.facts.get(name, "").strip():
            todo.append(f"footer fact '{name}' is empty: {label}")
    if not p.enamad:
        todo.append("no e-Namad trust seal in #enamad (BZR-67)")
    for d in sorted(set(p.pending)):
        todo.append(f"content waiting on decision {d} is hidden on the page (data-pending=\"{d}\")")
    if p.preview_note:
        todo.append("footer still says «پیش‌نمایش داخلی تیم»: remove it together with noindex (BZR-139)")
    for line in todo:
        print("open:", line)
    if not todo:
        print("Nothing open.")
    return 1 if todo else 0


if __name__ == "__main__":
    sys.exit(main())
