# Full audit: frontend, backend, security (pre-deploy)

## Automated checks, all passing
- Site checks: 6/6 (CSP, inline code, file references, Open Graph image, external files).
- Reward function checks: 24/24 (orders, pricing, reward codes, feedback, rate limits, errors).
- Browser audit (headless Chromium, desktop viewport):
  - No uncaught page errors. No broken images.
  - Cart: add, open, close with Escape. Lightbox: open and close.
  - All 9 in-page links point to existing sections.
  - Frontend and backend actions match: check, createOrder, feedbackInfo, feedbackSubmit.
  - GSAP warnings from a removed element fixed.

## Fixed in this audit
1. **Unauthenticated `redeem` action** could mark any reward code as used without proof. The current site does not use it,
   so it now returns a safe message. (Old browser copies must refresh.)
2. **Code guessing**: code checks were allowed 120 per IP per hour. Now 15 (`RATE_LIMIT_CHECK` to change).
3. **Unhandled errors**: a missing blob-store setup used to produce a raw 502. The function now returns a clear JSON
   message and logs only the error name.
4. **Broken GSAP tween** on a removed element (signature stage) removed.

## Checked, no problem found
- Secrets: none in the code; all read from environment variables.
- Output escaping: all customer data in emails and pages is escaped. Browser output uses textContent.
- Payment amounts: computed on the server from its own price list; the browser totals are only checked.
- Order tokens and confirm links: HMAC-signed, compared in constant time. IP addresses hashed before storage.
- Links: every target="_blank" has rel="noopener".
- Loops: the one site timer (reviews autoplay) is inside a guard and removed with its section.
  Animation loops (3D scenes, particle effects, gallery) run only while visible.

## Known and accepted
- The GSAP ticker drives Lenis smooth scroll, so roughly one animation frame callback runs per frame even while idle.
  This is the normal cost of smooth scrolling, not a leak.
- The Google Maps embed needs internet. It fails offline and does not break the page.

## Not tested here (no internet, no live credentials)
- Netlify Blobs storage, Brevo emails, ntfy alerts, and the live rewards flow.
  These must be tested after the batch deploy, with NETLIFY_API_TOKEN, SITE_ID, BREVO_API_KEY, NTFY_TOPIC set.
- Real phone performance (see REAL-DEVICE-CHECKLIST.md).
- Run `npm audit` on a machine with internet before deploy.
