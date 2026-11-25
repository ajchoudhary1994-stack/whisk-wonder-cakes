// Static checks for the website files. No browser needed. Run: npm test
// Guards the strict Content-Security-Policy: no inline scripts, styles, event handlers, or data: images.
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const SITE = path.join(__dirname, "..", "site");
const read = (f) => fs.readFileSync(path.join(SITE, f), "utf8");
const pages = ["index.html", "privacy.html"];
let pass = 0;
const ok = (name) => { pass++; console.log("PASS", name); };

// 1. The CSP in _headers is strict
const headers = read("_headers");
const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)[1];
const directive = (name) => (csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ")) || "");
assert.ok(!/unsafe-inline/.test(csp), "CSP must not contain unsafe-inline");
assert.ok(!/unsafe-eval/.test(csp), "CSP must not contain unsafe-eval");
assert.strictEqual(directive("script-src"), "script-src 'self' https://www.googletagmanager.com", "script-src: self plus Google Analytics loader only");
assert.strictEqual(directive("style-src"), "style-src 'self'");
assert.ok(!/data:/.test(directive("img-src")), "img-src must not allow data: URIs");
assert.ok(!/googleapis|gstatic/.test(csp), "no Google font hosts in the CSP");
ok("CSP: script-src and style-src are 'self' only; no unsafe-inline, unsafe-eval, or data: images");

for (const page of pages) {
  const html = read(page);

  // 2. No inline scripts (JSON-LD is data, not executed, so it is allowed)
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/g)].filter((m) => !/\bsrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1]));
  assert.strictEqual(inlineScripts.length, 0, page + ": inline <script> found");

  // 3. No inline styles: no <style> blocks, no style= attributes
  assert.strictEqual((html.match(/<style\b/g) || []).length, 0, page + ": <style> block found");
  assert.strictEqual((html.match(/\sstyle=/g) || []).length, 0, page + ": style= attribute found");

  // 4. No inline event handlers (onclick, onerror, ...)
  assert.deepStrictEqual(html.match(/\son[a-z]+=/gi) || [], [], page + ": inline event handler found");

  // 5. No javascript: URLs and no base64 images
  assert.ok(!/javascript:/i.test(html), page + ": javascript: URL found");
  assert.strictEqual((html.match(/data:image\//g) || []).length, 0, page + ": base64 image found");

  // 6. Every local file the page references exists
  const refs = [...html.matchAll(/\s(?:src|href)="([^"#?:]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith("/api") && !r.startsWith("mailto") && !r.startsWith("tel"));
  for (const ref of refs) {
    // Cloudflare serves /privacy from privacy.html and /folder/ from folder/index.html
    const rel = ref.replace(/^\//, "");
    const target = rel === "" ? "index.html" : rel.endsWith("/") ? rel + "index.html" : (/\.[a-z0-9]+$/i.test(rel) ? rel : rel + ".html");
    assert.ok(fs.existsSync(path.join(SITE, target)), page + ": missing local file " + ref);
  }
  ok(`${page}: no inline script, style, handler, javascript: URL, or base64 image; all local files exist (${refs.length} refs)`);
}

// 6b. Link previews: og:image points at a real 1200x630 file on the site
{
  const { execFileSync } = require("child_process");
  const imgPath = path.join(SITE, "og-image.jpg");
  assert.ok(fs.existsSync(imgPath), "og-image.jpg missing");
  const size = execFileSync("python3", ["-c", "from PIL import Image; print(*Image.open('" + imgPath + "').size)"]).toString().trim().split(" ").map(Number);
  assert.deepStrictEqual(size, [1200, 630], "og-image must be 1200x630");
  for (const page of pages) {
    const h = read(page);
    const ogImg = /<meta property="og:image" content="([^"]+)"/.exec(h);
    assert.ok(ogImg, page + ": og:image missing");
    assert.ok(ogImg[1].endsWith("/og-image.jpg"), page + ": og:image must point at og-image.jpg");
  }
  ok("Open Graph: og-image.jpg is 1200x630 and both pages point to it");
}

// 6c. terms.html and 404.html are served under the same strict CSP, so they must not use inline styles or scripts either
for (const page of ["terms.html", "404.html"]) {
  const html = read(page);
  assert.strictEqual((html.match(/<style\b/g) || []).length, 0, page + ": <style> block found");
  assert.strictEqual((html.match(/\sstyle=/g) || []).length, 0, page + ": style= attribute found");
  assert.deepStrictEqual(html.match(/\son[a-z]+=/gi) || [], [], page + ": inline event handler found");
  assert.strictEqual([...html.matchAll(/<script\b([^>]*)>/g)].filter((m) => !/\bsrc=/.test(m[1])).length, 0, page + ": inline <script> found");
}
ok("terms.html and 404.html: no inline script, style or handler");

// 6d. CSP hosts match what the site really uses; the referrer policy never leaks full URLs to other sites
{
  assert.ok(!/unsplash/i.test(csp), "CSP must not allow Unsplash: no page uses it");
  assert.ok(directive("connect-src").includes("https://*.google-analytics.com"), "GA4 sends data to regional hosts too");
  assert.ok(directive("img-src").includes("https://*.google-analytics.com"), "GA4 beacons may load as images");
  const rp = /Referrer-Policy:\s*(\S+)/i.exec(headers)[1];
  assert.ok(["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin", "origin", "origin-when-cross-origin"].includes(rp), "Referrer-Policy must not send full URLs cross-site: " + rp);
  const consent = read("js/consent.js");
  assert.ok(/page_location:\s*window\.location\.origin \+ window\.location\.pathname/.test(consent), "GA must not receive the feedback token in the query string");
  ok("CSP: GA4 regional hosts allowed, unused Unsplash removed; referrer policy safe; GA never sees the feedback token");
}

// 6e. Legal text matches the site (no draft markers, no unused services, no "no cookies" claim)
{
  const privacy = read("privacy.html"), terms = read("terms.html"), home = read("index.html");
  assert.ok(!/\[To confirm\]/i.test(terms) && !/class="confirm"/.test(terms), "terms.html still has a draft marker");
  assert.ok(!/unsplash/i.test(privacy), "privacy.html mentions Unsplash, which the site does not use");
  assert.ok(!/do not use advertising or tracking cookies/i.test(privacy), "privacy.html must not say there are no tracking cookies");
  for (const word of ["Nominatim", "Brevo", "ntfy", "delivery address"]) assert.ok(privacy.includes(word), "privacy.html should mention " + word);
  assert.ok(!/chocolate truffle/i.test(home), "FAQ names a flavour that is not on the menu");
  ok("privacy and terms text match the site; no draft markers; FAQ only names real flavours");
}

// 6f. Service landing pages: one H1 "<Service> in <Area>", title/description lengths, canonical, sitemap, CSP-safe markup, links resolve
{
  const slugs = fs.readdirSync(SITE).filter((d) => fs.existsSync(path.join(SITE, d, "index.html")));
  assert.ok(slugs.length >= 7, "expected the 7 service pages, found " + slugs.length);
  const sitemap = read("sitemap.xml");
  const home = read("index.html");
  for (const slug of slugs) {
    const html = read(slug + "/index.html");
    const title = /<title>([^<]+)<\/title>/.exec(html)[1].replace(/&amp;/g, "&");
    const h1s = [...html.matchAll(/<h1>([^<]+)<\/h1>/g)].map((m) => m[1]);
    const desc = /<meta name="description" content="([^"]+)"/.exec(html)[1];
    assert.strictEqual(h1s.length, 1, slug + ": exactly one H1");
    assert.ok(/ in (Palampur|Arla)$/.test(h1s[0]), slug + ": H1 must read '<Service> in <Area>': " + h1s[0]);
    assert.strictEqual(title, h1s[0] + " | Whisk & Wonder Cakes", slug + ": title = H1 + brand");
    assert.ok(title.length <= 62, slug + ": title too long (" + title.length + ")");
    assert.ok(desc.length >= 70 && desc.length <= 160, slug + ": meta description length " + desc.length);
    assert.ok(html.includes('rel="canonical" href="https://www.whiskandwondercakes.in/' + slug + '/"'), slug + ": canonical");
    assert.ok(sitemap.includes("https://www.whiskandwondercakes.in/" + slug + "/"), slug + ": listed in sitemap.xml");
    assert.ok(home.includes('href="/' + slug + '/"'), "home links to " + slug);
    assert.strictEqual((html.match(/\sstyle=/g) || []).length, 0, slug + ": style= attribute");
    assert.deepStrictEqual(html.match(/\son[a-z]+=/gi) || [], [], slug + ": inline handler");
    assert.strictEqual([...html.matchAll(/<script\b([^>]*)>/g)].filter((m) => !/\bsrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1])).length, 0, slug + ": inline script");
    for (const m of html.matchAll(/\s(?:src|href)="(\/[^"#?]*)"/g)) {
      const ref = m[1];
      if (ref === "/" || ref.startsWith("/api")) continue;
      const target = ref.endsWith("/") ? path.join(ref, "index.html") : (/\.[a-z0-9]+$/i.test(ref) ? ref : ref + ".html");
      assert.ok(fs.existsSync(path.join(SITE, target)), slug + ": broken link " + ref);
    }
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
  }
  const robots = read("robots.txt");
  assert.ok(/User-agent: \*\s*\nAllow: \//.test(robots) && /Sitemap: https:\/\/www\.whiskandwondercakes\.in\/sitemap\.xml/.test(robots), "robots.txt: User-agent * + Allow / + Sitemap");
  assert.strictEqual((home.match(/<h1\b/g) || []).length, 1, "home: exactly one H1");
  ok(slugs.length + " service pages OK (H1/title/description, canonical, sitemap, links, JSON-LD); robots.txt OK");
}

// 6g. Clean legal URLs (Cloudflare 308-redirects /page.html to /page) and home FAQPage schema
{
  for (const f of ["index.html", "privacy.html", "terms.html", "sitemap.xml", "llms.txt", "js/consent.js"]) {
    assert.ok(!/whiskandwondercakes\.in\/(privacy|terms)\.html/.test(read(f)), f + ": uses the .html address of a legal page");
    assert.ok(!/href="\/?(privacy|terms)\.html"/.test(read(f)), f + ": links to a .html legal page");
  }
  const home = read("index.html");
  const ld = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faq = ld.find((x) => x["@type"] === "FAQPage");
  assert.ok(faq && faq.mainEntity.length >= 4, "home page needs FAQPage schema");
  assert.strictEqual(faq.mainEntity.length, (home.match(/class="faq-q"/g) || []).length, "FAQ schema covers every visible FAQ item");
  ok("legal pages use clean URLs everywhere; home FAQPage schema matches the visible FAQ");
}

// 6h. Speed: heavy media must not start loading before the page is usable; assets are cacheable
{
  const home = read("index.html");
  for (const m of home.matchAll(/<video\b[^>]*>/g)) assert.ok(!/\bautoplay\b/.test(m[0]) && /preload="none"/.test(m[0]), "video must not autoplay or preload: " + m[0].slice(0, 60));
  assert.ok(!/type="module" src="js\/buddy\.js"/.test(home) && /js\/perf\.js/.test(home), "mascot loads lazily via perf.js");
  assert.ok(/\/assets\/\*\s*\n\s*Cache-Control:/.test(read("_headers")), "assets have a cache header");
  ok("speed: videos start after load / in view; mascot loads after the page; assets cached");
}

// 6i. Phone UX: compact consent banner, mascot sits low-left, order-confirmed screen has no dead "Done" button
{
  const css = read("css/v26.css"), consent = read("js/consent.js"), buddy = read("js/buddy.js"), home = read("index.html"), s2 = read("js/site-2.js");
  assert.ok(/@media \(max-width: 640px\)\s*\{\s*\.cc-banner/.test(css), "compact consent banner on phones");
  assert.ok(/max-width: 640px[\s\S]*scrollY > 250/.test(consent), "banner on phones waits for a little scrolling");
  assert.ok(/setTimeout\(function \(\) \{ if \(banner && !banner\.hidden\) hideBanner\(\); \}, 30000\)/.test(consent) && /ww_cc_seen/.test(consent), "banner on phones hides itself after 30 s and is not shown again in the same visit");
  assert.ok(/Allow analytics cookies\?/.test(consent) && /flex-wrap: nowrap/.test(css), "one-line banner on phones");
  assert.ok(/addEventListener\('resize', \(\) => \{ if \(innerWidth <= 640 && !docked\) \{ glide\(0, 0, 450\)/.test(buddy), "mascot slides back down when the banner goes away");
  assert.ok(/innerWidth <= 640 \? 6 : 14/.test(buddy) && /innerWidth <= 640\) \{ const h = home\(\)/.test(buddy), "mascot stays low in the bottom-left on phones");
  assert.ok(/@media \(max-width:640px\)\{\s*\.ww-buddy \.bub\{position:absolute/.test(read("css/buddy.css")), "speech bubble does not push the avatar off screen on phones");
  assert.ok(!/>Done</.test(home) && /id="doneCopy"/.test(home) && /id="doneClose"/.test(home), "success screen: Copy Order Details + Continue Browsing");
  assert.ok(/doneCopy'\)\.addEventListener/.test(s2), "copy button is wired up");
  ok("phone UX: compact banner, lower mascot, useful order-confirmed buttons");
}

// 7. The external JS and CSS files parse / are present
for (const f of ["js/img-fallback.js", "js/site-1.js", "js/site-2.js", "css/site.css", "css/privacy.css", "fonts/fonts.css"]) {
  assert.ok(fs.existsSync(path.join(SITE, f)), "missing " + f);
}
ok("external JS and CSS files are present");

// 8. Photos referenced by the pages are used, and none are left as base64 in the JS
const js = ["js/site-1.js", "js/site-2.js", "js/img-fallback.js"].map(read).join("\n");
assert.strictEqual((js.match(/data:image\//g) || []).length, 0, "base64 image in JS");
ok("no base64 images in JavaScript");

console.log(`\nAll ${pass} site checks passed.`);
