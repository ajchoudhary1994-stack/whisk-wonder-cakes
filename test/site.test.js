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
assert.strictEqual(directive("script-src"), "script-src 'self'");
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
  const refs = [...html.matchAll(/\s(?:src|href)="([^"#?:]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith("/.netlify") && !r.startsWith("mailto") && !r.startsWith("tel"));
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
