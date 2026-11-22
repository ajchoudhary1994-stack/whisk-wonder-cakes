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
    assert.ok(fs.existsSync(path.join(SITE, ref)), page + ": missing local file " + ref);
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
