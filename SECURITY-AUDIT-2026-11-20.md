# Security review — Whisk & Wonder Cakes

Last reviewed: 20 November 2026  
Scope: uploaded repository ZIP, static source review, local automated tests. This is not a live penetration test.

## Current status

The code-level issues found in this review have been patched in this working copy. Automated tests pass: 31 backend checks and 7 site checks. No live website, DNS record, Cloudflare setting, D1 production data, GitHub branch, or deployment was changed.

## Controls verified in source

- Order prices are recomputed from a server-side catalog; browser-supplied line prices are ignored.
- D1 queries use bound parameters.
- Owner confirmation and feedback links use HMAC-SHA256 tokens; comparisons are constant-time for equal-length tokens.
- GET on the owner confirmation link is read-only; the state change requires a signed POST.
- Reward-code redemption is no longer exposed as an unauthenticated action.
- API body limits, IP-keyed rate limits, input length limits, HTML escaping, and no-store responses are present.
- Static site CSP disallows inline scripts, inline styles, `eval`, and data images. New-tab links use `rel="noopener"` in checked markup.
- No live API key, Brevo key, NTFY token, REWARDS_SECRET, or `.env` file was found in the ZIP. The test suite contains a clearly test-only secret.

## Issues found and fixed in this working copy

1. **High — signed feedback token could be sent to Google Analytics.** The feedback URL carries a bearer token in its query string. GA4's default page location includes the current URL. Analytics now receives only `origin + pathname` (`site/js/consent.js:24-25`); the site also uses `Referrer-Policy: no-referrer` (`site/_headers:8`). Regression checks added.
2. **High — concurrent feedback submissions could issue multiple reward codes.** The prior read-then-write flow was not atomic. Reward issuance now reserves a unique code and claims the order with an etag compare-and-swap (`functions/api/rewards.js:567-607`); losing requests delete their unused code and return the winner's code. Concurrent regression test added.
3. **Medium — concurrent owner confirmations could both mark the order paid and send duplicate messages.** Payment state now changes through an etag compare-and-swap (`functions/api/rewards.js:383-410`); only the winning request sends the confirmation email. Concurrent regression test added.
4. **Medium — `MAX_TOTAL` was declared but not enforced.** The server now rejects a payable total above ₹2,00,000 (`functions/api/rewards.js:519-522`) before saving the order or consuming a reward.
5. **Medium — dynamic owner-confirmation HTML did not receive the static site's security headers.** Function responses now set no-store, no-referrer, noindex, nosniff, frame denial, HSTS, and a restrictive page-specific CSP (`functions/api/rewards.js:45-65`).
6. **Low — fallback to client-controlled `X-Forwarded-For` could permit IP-key spoofing outside normal Cloudflare traffic.** Rate limiting now uses Cloudflare's `CF-Connecting-IP` only, falling back to a shared unknown bucket.
7. **Low — body limit was measured as JavaScript characters rather than UTF-8 bytes, and arbitrary POST content types were accepted.** The Pages entry point now enforces a streaming UTF-8 byte limit and accepts only JSON or URL-encoded form posts (`functions/api/rewards.js:645-688`).
8. **Low — migration file did not describe the table used by the function.** Added migration `0002_create_kv_store.sql`; old tables from migration 0001 are retained and documented as legacy rather than destructively dropped.

## Remaining operational risks / owner actions

- **Set `NTFY_TOKEN` if `NTFY_TOPIC` is enabled.** The code now leaves the confirm link out of the ntfy alert when no token is set (the owner email still has it).
- **Treat confirmation links as passwords.** They are bearer links and currently do not expire. Do not forward them or post screenshots of them. If one is exposed, rotate `REWARDS_SECRET` (this invalidates all outstanding owner and feedback links).
- **Data retention:** order records contain customer name, phone, optional email, address, date, slot, cake message, notes, and feedback. They remain in D1 until manually deleted. The privacy policy says customers can request deletion; ensure requests are actually handled in D1 and backups/exports. The policy's statement that there are no tracking cookies should be reviewed for accuracy because GA4 may set analytics cookies after consent.
- **Third-party processing:** Google Analytics is loaded only after consent. The signed feedback query is now excluded from GA page location. Recheck this if analytics code is replaced.
- **Dependencies:** `package.json` declares no npm dependencies and no lockfile is present. The site vendors GSAP, ScrollTrigger and Lenis as local files; their version/update status was not independently vulnerability-scanned.
- **Environment configuration:** production secrets and bindings were not accessible from the ZIP. Verify `REWARDS_SECRET` is at least 32 characters, `DB` points to the correct D1 database, and Brevo variables are configured only as server-side secrets/variables.

## Test results

- `npm test`: PASS — 31 backend checks and 7 static-site checks.
- Tests include pricing, reward redemption, concurrent reward use, concurrent feedback, concurrent owner confirmation, body-size/content-type enforcement, CSP and GA query-token exclusion.
- Browser/Chromium checks were attempted but could not run in this environment: Playwright's bundled browser was absent and the system Chromium launch was blocked by the execution environment. Therefore no claim is made that real-browser checks passed.
- No live HTTP fuzzing, authenticated testing, D1 production inspection, Brevo delivery test, ntfy delivery test, or Cloudflare configuration review was performed.

## Deployment caution

This working copy is prepared for review only. Do not deploy until you have reviewed the patch, applied the D1 migration if desired, confirmed environment bindings/secrets, and tested the production flow in a staging or controlled window. Preserve the existing WhatsApp handoff and test it after deployment.

## Second-pass review, 21 November 2026

Everything in the first pass was re-checked in the code and the 31 + 7 tests were re-run. The first-pass security fixes hold. Further problems found and fixed:

1. **CSP blocked part of Google Analytics.** GA4 also sends data to regional hosts (`*.google-analytics.com`), not only `www.`. `connect-src` and `img-src` now allow `https://*.google-analytics.com`. The unused `images.unsplash.com` host was removed from `img-src`.
2. **Order form could be used to mail-bomb a third party.** Anyone could type a victim's address as the customer email and trigger "order received" mails. Customer emails are now capped at 3 per address per hour (`RL_MAIL`). The order is still saved. Test added.
3. **Reward code lost if the order failed to save.** The code was marked used before the order was written. If the write failed, the customer lost the code. It is now handed back.
4. **Privacy policy did not match the site.** It said only the feedback form collects data (orders also collect phone, email, address, notes), said "no tracking cookies" and "a photo from Unsplash" (no such photo), and omitted Nominatim, Brevo and ntfy. Rewritten to match.
5. **Terms page** said advance payment was "[To confirm]" although checkout already takes 50% by UPI. Filled in. Two items still need the owner: governing law / court, and grievance officer name (left as [To confirm]; they are legal choices, not code).
6. **Smaller:** FAQ named "chocolate truffle", which is not on the menu; `.gitignore` now excludes `.dev.vars` and `.wrangler/`; `robots.txt` disallows `/api/`; sitemap dates refreshed; README no longer points to a `build.sh` that is not in the ZIP; terms.html and 404.html are now covered by the CSP tests.

Still open (owner decisions): add Cloudflare Turnstile on checkout for stronger bot protection; carrier-shared IPs (Jio/Airtel) can hit the per-IP limits; confirm links never expire; customer delivery charge is chosen in the browser and confirmed on WhatsApp.

Test result after this pass: 32 backend checks and 9 site checks pass.

### Re-check of five issues from a ChatGPT audit screenshot (21 Nov 2026)

Stress-tested on the current code (25 parallel requests each): feedback race gives 1 code; owner-confirm race sends 1 email; a Rs 34.5 lakh order is rejected (HTTP 400); a fresh database works with no migration. Not fixed in the first pass and now fixed: **ntfy without `NTFY_TOKEN` no longer publishes the signed confirm link** (a test covers it). Migration 0001 is now labelled LEGACY so the `kv` table is the clear source of truth.

### 107-point backend checklist pass (21 Nov 2026)
Added: 5 s timeout + one retry on Brevo and ntfy calls (a hung provider no longer stalls an order; tested), PII-free JSON event logs, GitHub Actions workflow that runs the tests on every push/PR, `.dev.vars.example`, and `OPERATIONS.md` (backups, alerts, secret rotation, cache, data retention). Accepted risks, unchanged: owner confirm links do not expire; no 2FA or user accounts exist (so login, password, session, SSO and RBAC items do not apply); no professional penetration test yet.
