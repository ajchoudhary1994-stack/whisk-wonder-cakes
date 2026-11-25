# v15: backend hardening on top of v14 (frontend unchanged)

The look and content of the site (HTML, CSS, images, videos, copy) are exactly v14. Only these changed.

**Backend (`functions/api/rewards.js`)**
- Server recalculates every price; client totals are never trusted. Orders above Rs 2,00,000 are rejected (HTTP 400).
- Race-safe: 25 parallel feedback submits give 1 reward code; 25 parallel owner clicks send 1 payment email.
- Reward code is handed back if the order fails to save.
- Customer "order received" emails are capped at 3 per address per hour (stops using the form to mail-bomb someone).
- ntfy: without `NTFY_TOKEN` the signed confirm link is left out of the alert.
- Outbound calls (Brevo, ntfy) time out after 5 s and retry once; a hung provider cannot stall an order.
- Owner confirm links expire after 30 days for unpaid orders (`CONFIRM_TTL_DAYS` to change).
- Cross-site POSTs (Origin of another site) get 403. API responses are `noindex`.
- One JSON log line per event (`order_created`, `order_paid`, `reward_issued`, `rate_limited`, `email_failed`), no names/phones/addresses.
- Migrations `0001` (legacy) and `0002` (the `kv` table) and `wrangler.toml` are included.

**Headers (`site/_headers`, no visual effect)**
- CSP now allows all Google Analytics 4 hosts (`*.google-analytics.com`), which v14 partly blocked. Unused `images.unsplash.com` removed.

**One non-visual script change (`site/js/consent.js`)**
- Google Analytics no longer receives the query string, so the signed feedback token never reaches Google.

**Repo**: GitHub Actions test workflow, `.dev.vars.example`, `OPERATIONS.md` (backups, alerts, secret rotation), `.gitignore` for local secret files.

**Tests**: 36 backend + 8 site checks; real Chromium run with the final CSP: 0 violations, 0 JS errors.

## Not changed on purpose (frontend), worth a look later
1. `privacy.html` says "only the feedback form" collects data (orders also collect phone, email, address), says no tracking cookies while Google Analytics sets cookies after Accept, mentions an Unsplash photo that is not used, and omits Nominatim, Brevo and ntfy.
2. `terms.html` still has `[To confirm]` for advance payment, governing law and grievance officer.
3. FAQ names "chocolate truffle", which is not on the menu.

## Accepted risks
No Cloudflare Turnstile yet (needs a frontend change); carrier-shared IPs can hit per-IP limits; no professional penetration test.

## v15.2 (23 Nov 2026)
- Fixed: the 30-day owner-confirm-link expiry did not work on real data, because orders store `createdAt` as an ISO string, not milliseconds. It now accepts both. The test now uses the same ISO format as production.
