# Changes in this round

## Fixed

1. **Reward code could be burned without an order.** The code was marked used before the order was
   saved, and a failed order save was silently ignored. Now the server saves the order and applies the
   reward in one request. If anything fails, the customer gets an error and the code is not used.
   Retrying the same order does not burn the code twice.
2. **Discount and total came from the browser.** The server now computes the reward discount from its
   own code record and rejects any order whose total does not match.
3. **Owner confirm link changed payment status on GET.** Email and chat link previews open links
   automatically, which could mark an order paid by mistake. Now GET only shows the order, and a
   POST button marks it paid. A forged token is rejected.
4. **Customer details in the phone alert.** The ntfy alert had the customer's name and phone number
   and a working confirm link. It now has only the order ID, amount, date and cakes. Set `NTFY_TOKEN`
   and keep the topic private.
5. **Source code and package files were published with the site.** Only `site/` is published now
   (`netlify.toml`).

## Added

- `npm test`: 11 behaviour checks for the reward and confirm flows (in-memory store, no account needed).
- `.gitignore` (keeps `.env` and `node_modules` out of git), `engines` in `package.json`.

## Not changed yet (listed in README "Known limits")

- Inline scripts and styles in the Content Security Policy.
- Rate limiting on the order endpoint.
- Browser-side prices (needs a server price list).
- `package-lock.json` is not in the repo. Run `npm install` once and commit it.
- `index.html` requests `/catalog.json`, which is not in this repo. The page falls back to its built-in menu,
  so nothing breaks, but the file should be added if the menu is meant to be edited without code changes.

## Testing status

- Backend: 11 automated checks pass (mock store). Not yet tested against real Netlify Blobs.
- Front-end: JavaScript syntax checked. Not yet tested in a browser on a live deploy.
  Please place one test order and one reward-code order after deploying.

## Cake weight: + button above 3 lb

- Cake weight picker starts at 1 lb, 2 lb, 3 lb. The + button adds 1 lb each click (4 lb, 5 lb, ... up to 10 lb).
- Price = price per 1 lb x pounds, for every weight. Example: Red Velvet 4 lb = Rs 2,300.
- Grams label: 1 lb = 500 g, then 2 lb = 1 kg, 3 lb = 1.5 kg, 4 lb = 2 kg, and so on.
- Cart accepts any weight from 1 to 10 lb. Existing cart lines keep working.
- Maximum 10 lb per cake. Bigger cakes go through WhatsApp.

## Fonts: self-hosted (no Google Fonts requests)

- Fraunces (headings): variable WOFF2 roman and italic, from the Fraunces project archive.
- Manrope (body): variable WOFF, from the Manrope archive.
- Google Fonts links and preconnects removed from `index.html` and `privacy.html`.
- CSP: `style-src` and `font-src` no longer list Google hosts.
- License files included: `site/fonts/OFL-Fraunces.txt`, `site/fonts/OFL-Manrope.txt`.

## Server-side price validation (critical fix)

- The server now has its own price list (`CAKE_PER_LB`, party and bundle sizes) in `netlify/functions/rewards.js`.
- The browser sends only the cart lines: item ID, weight, quantity, and flavour. It no longer sends prices or cake totals.
- The server prices every line, applies the reward code, adds the delivery charge, and saves that total.
- If the browser's total does not match the server's total, the order is rejected with "Prices have changed. Please refresh."
- Limits enforced by the server: 1 to 10 lb per cake, 1 to 20 per line, up to 30 lines, delivery Rs 0 to 110.
- The order record stores the server's item list, cake text, party text, and total. Owner emails and alerts use these values.
- `test/rewards.test.js` checks that the server price list matches `site/index.html` CATALOG (rates, names, party and bundle sizes).

Limit: delivery charge is still set by the browser's distance check (the server does not know the customer's location). It is capped at Rs 110, and the owner confirms the total on WhatsApp.

## Strict Content-Security-Policy (no unsafe-inline, no base64 images)

- CSP is now `script-src 'self'`, `style-src 'self'`, `img-src 'self' https://images.unsplash.com`. No `unsafe-inline`, no `data:` images.
- Photos: all base64 images moved to `site/assets/` as files (with width/height and lazy loading; header logos stay eager). The favicon is `assets/favicon.webp` and the Apple icon is `assets/apple-touch-icon.png`. The UPI QR is `assets/upi-qr.jpg`.
- Inline `onerror` handlers replaced by `js/img-fallback.js`. It hides a broken product photo and restores it when a photo loads. Empty-source images (the lightbox before it opens) are left alone.
- Inline scripts moved to `js/site-1.js` and `js/site-2.js` (loaded with `defer`, same order).
- Inline `<style>` blocks moved to `css/site.css` and `css/privacy.css`.
- All 24 `style=` attributes (HTML and inside JS templates) became CSS classes. The celebration feedback form starts hidden with `is-hidden-init` and is shown by JS.
- Pages look the same: computed styles and box positions were compared before and after in Chromium at 390 px width. The only differences are timing noise from the continuously moving ticker.

## Tests

- `npm test` runs 20 backend checks (pricing, rewards, owner confirm) and 5 static checks on the site (no inline script, style, handler, base64, or javascript: URL; every local file exists).
- `test/browser/` has two optional Chromium checks (see its README). With the strict CSP, the full flow runs with 0 violations and 0 JavaScript errors: 18 checks pass.

## Known

- `index.html` still tries to fetch `/catalog.json` (not in the repo). It returns 404 and the built-in menu is used, so the page works. Remove that fetch if the menu will only come from code.

## Security review (attacker view) and fixes

Checked: secrets in the repo (none), every place user input becomes HTML (escaped), security headers (strong),
external links (rel=noopener, no http://), the order and reward API, the owner confirm and feedback links,
email sending, and localStorage input.

Fixed:
- Per-IP rate limit on the API (20 orders per hour; 120 other calls per hour). IPs are hashed with the
  secret before storage, so no raw IP is kept. Limits are set with RATE_LIMIT_ORDERS and RATE_LIMIT_OTHER.
  This stops order spam (owner email/ntfy flood, email quota) and reward-code guessing.
- Email must look like an address and be under 120 characters. Anything else is stored without an email,
  so the site cannot be used to email arbitrary addresses (email bombing) or inject mail headers.
- REWARDS_SECRET must be at least 32 characters, or the function refuses to run.
- Cart quantity is shown as a number (no HTML from localStorage).
- Hostile-input tests: wrong types, prototype keys, huge numbers, HTML in names, control characters. All return
  clean errors, with no stack traces.

Still open (needs your setting or decision):
- Rate limiting is per client in Netlify Blobs. A determined attacker with many IPs can still get past it. For
  stronger protection, use Netlify's bot/rate protection or Cloudflare in front of the site.
- The order form on the site (Netlify Forms) accepts spam with only a honeypot. In Netlify: Forms > Form
  settings, turn on spam filtering / reCAPTCHA.
- The WhatsApp feedback link for an order can be used by anyone who gets it. It gives one reward code per order,
  so only the first submitter gets the code. Keep those links private.
- Orders are kept in Netlify Blobs with no end date. Decide how long to keep them (for example 12 months), and
  say so on the privacy page.
- Run `npm install` and then `npm audit` once. There is no package-lock.json yet, and the audit needs internet.
- The Blobs `onlyIfNew` option is used by the rate limiter. The tests use an in-memory mock, so verify on Netlify.
- Turn on two-factor authentication for Netlify, GitHub, Brevo, and ntfy.

## Hero reveal animation

- Headline: 7 words, each slides up 20px and fades in, 80ms apart (done by 0.88s).
- Subheadline fades in at 0.88s.
- "Order on WhatsApp" button pops in with a soft bounce at 1.18s (done by 1.48s). Secondary buttons fade in with it.
- Badges and proof points fade in just after (1.2s and 1.25s).
- Only transform and opacity are animated. Base styles are visible, so the page works without JavaScript and button hover still works.
- With prefers-reduced-motion, all hero content shows immediately with no movement.

## Sale pings, Us vs Others table, and order success animation

**Sale pings toast (bottom-left)**
- Entries are in `site/data/sale-pings.json`. Edit the array: name, city, product, time (`at`, ISO format with +05:30), and `sample`.
- A new toast appears every 6 to 9 seconds at random. It slides in, stays 4 seconds, and slides out. The close button hides it for the browser session.
- Samples are hidden by default (`data-show-samples="false"` on `#pingToast` in index.html). Only real entries are shown. Set `sample` to `false` only for orders with the customer's permission (first name and city only). Do not show invented purchases, because that is misleading advertising.

**Us vs Others (section above FAQ)**
- Six rows reveal one by one on scroll. Red ✕ marks shake and green ✓ marks pop. Our column has a glow.
- The competitor column describes a "usual local bakery", not any named shop. Check every claim is true before you publish it.

**Success animation (Place Order button)**
- The button shows a spinner while the order is saved on the server. Then it shows a green check, plays confetti (80 particles, 1.2s), and shows "Order placed! We will confirm on WhatsApp."
- It plays only after the server confirms the order. If the server refuses, the button returns to normal and the error is shown.

**Performance and accessibility**
- Only transform and opacity are animated. The new JavaScript is about 2.8 KB and the CSS about 1.8 KB (gzipped).
- With prefers-reduced-motion, the toast only fades, the rows show at once, and the confetti is skipped.
- The toast is a live region. The button is a real button, so Enter and Space work.

## Performance pass

Measured in Chromium at 390 px width, 2x density (local files only):
- Local page weight: 1111 KB before, 603 KB after (about 46% less).
- Fonts: about 440 KB before, about 190 KB after. Latin subset, Fraunces SOFT and WONK pinned to the site's look, weights 400 to 700 (roman) and 400 to 500 (italic). Manrope 200 to 800, Latin subset.
- Photos over 800 px were resized to 800 px. The two small PNG icons became WebP (24 KB and 28 KB became 3 KB each). The UPI QR stays as the original JPEG, so it still scans.
- Hero image: smaller request (w=900, q=75), fetchpriority high, decoding async. The image host is preconnected. Fonts used above the fold are preloaded.
- The /catalog.json fetch was removed. The site had no such file, so every visit made a 404. Prices come only from the built-in catalog, which the server checks too.

Not measured here: the hero image comes from Unsplash, and this sandbox has no internet. To cut the last external request, download that photo, resize it to 900 px, save it as assets/hero.webp, and point the hero img at it.
