#!/usr/bin/env node
/* Opens index.html in headless Chrome and checks the launch switches of BZR-138 behave (ADR-0019):
 * the app links follow <meta name="bazr-app-url">, content waiting on a decision (data-pending) stays off the page,
 * the contact column is there, and nothing scrolls sideways at phone width. tools/launch-check.py says what is
 * still open; this says the page does what the README promises once it is filled in.
 *
 *   node tools/render-check.cjs [screenshot folder]
 *
 * Needs playwright-core (default: the bazr-app checkout next to this repo; or set PLAYWRIGHT_CORE) and Chrome
 * (the installed one; or set CHROME to its path). Files are served from disk, and every request to another host
 * fails, as Google Fonts does from inside Iran. Exits 1 when a check fails. It changes nothing. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SHOTS = process.argv[2] ? path.resolve(process.argv[2]) : null;
const { chromium } = require(process.env.PLAYWRIGHT_CORE || path.join(ROOT, "..", "bazr-app", "node_modules", "playwright-core"));

const ORIGIN = "http://landing.test";
const SITE = "https://bazrlife.com/"; // ADR-0019
const TEST_APP = "https://app.example.test"; // only for the simulated run; never written into the page
const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".mp4": "video/mp4", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };
const META = /<meta name="bazr-app-url" content="[^"]*">/;

let failed = 0;
function check(label, ok, detail) {
  console.log((ok ? "ok   " : "FAIL ") + label + (ok || detail === undefined ? "" : "  " + JSON.stringify(detail)));
  if (!ok) failed++;
}

async function open(browser, { width = 1366, height = 900, lang, appUrl, phone = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("script: " + e.message));
  // A request to another host is failed on purpose and logs "Failed to load resource"; local files must all load.
  page.on("console", (m) => { if (m.type() === "error" && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const rel = decodeURIComponent(url.pathname).replace(/\/$/, "/index.html");
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: "" });
    let body = fs.readFileSync(file);
    if (rel === "/index.html" && appUrl !== undefined) body = Buffer.from(body.toString("utf8").replace(META, `<meta name="bazr-app-url" content="${appUrl}">`));
    return route.fulfill({ status: 200, body, contentType: TYPES[path.extname(file)] || "application/octet-stream" });
  });
  await page.goto(ORIGIN + "/" + (lang ? "#" + lang : ""), { waitUntil: "load" });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

const shown = (page, sel) => page.$$eval(sel, (els) => els.filter((e) => e.getClientRects().length > 0).length);

async function shot(page, sel, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.$eval(sel, (e) => e.scrollIntoView());
  await page.waitForTimeout(500);
  await page.locator(sel).first().screenshot({ path: path.join(SHOTS, name) });
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: "chrome" });

  // The page as committed.
  for (const lang of ["fa", "en"]) {
    const { ctx, page, errors } = await open(browser, { lang });
    const p = `${lang}: `;
    const head = await page.evaluate(() => ({
      robots: document.querySelector('meta[name="robots"]')?.content || "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content || "",
      appUrl: document.querySelector('meta[name="bazr-app-url"]')?.content.trim(),
      hasApp: document.documentElement.classList.contains("has-app"),
    }));
    if (lang === "fa") console.log(`info robots meta: "${head.robots || "(none)"}" · bazr-app-url: "${head.appUrl || "(empty)"}"`);
    check(p + "canonical and og:url are " + SITE, head.canonical === SITE && head.ogUrl === SITE, head);
    check(p + "og:image is on " + SITE, head.ogImage.startsWith(SITE), head.ogImage);
    check(p + "nothing waiting on a decision is on the page", (await shown(page, "[data-pending]")) === 0);
    check(p + "a card left alone in .pair takes the whole row",
      await page.$$eval(".pair", (ps) => ps.every((x) => !x.querySelector(":scope > [hidden]") || getComputedStyle(x).gridTemplateColumns.split(" ").length === 1)));
    const ctas = await shown(page, "a.btn[data-app-path]"), inPage = await shown(page, 'a.btn[href="#membership"]');
    if (head.hasApp) check(p + "app address set: «شروع» buttons instead of #membership", ctas === 3 && inPage === 0, { ctas, inPage });
    else check(p + "no app address: #membership buttons, no app links", ctas === 0 && inPage === 3 && (await shown(page, "[data-app-path]")) === 0, { ctas, inPage });
    check(p + "contact column with four labels", (await shown(page, `#contact dt .${lang}`)) === 4);
    check(p + "each fact is either filled in or drawn as a bar", await page.$$eval("#contact dd", (ds) => ds.length === 4 && ds.every((d) =>
      d.matches(":empty") ? getComputedStyle(d, "::before").content === '""' : d.textContent.trim().length > 0)));
    check(p + "e-Namad slot present", (await page.$$("#enamad")).length === 1);
    check(p + "loads without errors", errors.length === 0, errors);
    await shot(page, "footer", `footer-${lang}.png`);
    if (lang === "fa") await shot(page, "#inside", "inside-fa.png");
    await ctx.close();
  }

  // Phone width, both languages.
  for (const lang of ["fa", "en"]) {
    const { ctx, page, errors } = await open(browser, { width: 375, height: 812, phone: true, lang });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(`phone ${lang}: no sideways scroll`, w[0] <= w[1], w);
    check(`phone ${lang}: loads without errors`, errors.length === 0, errors);
    if (lang === "fa") await shot(page, "footer", "footer-fa-phone.png");
    await ctx.close();
  }

  // Simulated: what the page does once someone fills in the app's address.
  {
    const { ctx, page, errors } = await open(browser, { appUrl: TEST_APP + "/" });
    check("with app: three «شروع» buttons", JSON.stringify(await page.$$eval("a.btn[data-app-path]", (a) =>
      a.filter((e) => e.getClientRects().length).map((e) => e.querySelector(".fa").textContent))) === JSON.stringify(["شروع", "شروع", "شروع"]));
    const hrefs = await page.$$eval("a[data-app-path]", (a) => a.map((e) => [e.getAttribute("data-app-path"), e.getAttribute("href")]));
    check("with app: every app link is the address plus its own path, without a double slash",
      hrefs.length === 5 && hrefs.every(([p, h]) => h === TEST_APP + p), hrefs);
    check("with app: in-page #membership buttons gone", (await shown(page, 'a.btn[href="#membership"]')) === 0);
    check("with app: membership still linked from the footer", (await shown(page, 'footer a[href="#membership"]')) === 1);
    check("with app: terms and privacy links in the footer", (await shown(page, "footer li[data-app-only]")) === 2);
    check("with app: loads without errors", errors.length === 0, errors);
    await shot(page, ".vhero", "hero-fa-with-app.png");
    await shot(page, "footer", "footer-fa-with-app.png");
    await ctx.close();
  }
  for (const bad of ["http://app.example.test", "javascript:alert(1)", " "]) {
    const { ctx, page } = await open(browser, { appUrl: bad });
    check(`address ${JSON.stringify(bad)} does not switch the app links on`, !(await page.evaluate(() => document.documentElement.classList.contains("has-app"))));
    await ctx.close();
  }

  // robots.txt and sitemap.xml.
  {
    const { ctx, page } = await open(browser);
    const [robots, sitemap] = await page.evaluate(async () => Promise.all(["/robots.txt", "/sitemap.xml"].map(async (u) => (await fetch(u)).text())));
    check("robots.txt lets crawlers in and names the sitemap", /^User-agent: \*$/m.test(robots) && /^Allow: \/$/m.test(robots) && robots.includes("Sitemap: " + SITE + "sitemap.xml"));
    check("sitemap.xml lists " + SITE, sitemap.includes("<loc>" + SITE + "</loc>"));
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed" + (SHOTS ? ` · screenshots in ${SHOTS}` : ""));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
