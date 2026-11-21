# Running the site safely: what to set up once

**Backups.** Orders live in the D1 database `whisk-wonder-rewards`. Cloudflare D1 Time Travel lets you restore it to any minute in the last 30 days (7 on the free plan). Once a month also export a copy: `npx wrangler d1 export whisk-wonder-rewards --remote --output=backup.sql` and keep it somewhere private (it contains customer phone numbers).

**Monitoring and alerts.**
- Uptime: add the home page to UptimeRobot or Better Stack (free). Alert by email/WhatsApp.
- Cloudflare dashboard > Notifications: turn on alerts for Pages deployment failures.
- Logs: Pages project > Functions > Real-time logs. The function writes one JSON line per event (`order_created`, `order_paid`, `reward_issued`, `rate_limited`, `email_failed`, `ntfy_failed`) with no names, phones or addresses.
- If you see `email_failed` or `ntfy_failed` often, check the Brevo key / ntfy token. The order itself is always saved, and the customer also sends it on WhatsApp.

**Secret rotation.** Change `REWARDS_SECRET` (Pages > Settings > Variables and secrets, then redeploy) if it leaks. Old confirm and feedback links stop working, so only do it with no orders waiting for payment confirmation. Rotate `BREVO_API_KEY` and `NTFY_TOKEN` in their own dashboards, update them in Cloudflare, redeploy.

**Cache.** Images, video and fonts are cached by browsers for up to 30 days (fonts 1 year). If you replace a photo, save it under a new file name, or visitors may keep seeing the old one.

**Customer data.** Orders keep name, phone, optional email and address. Decide how long you need them (for example 12 months), and delete older orders from D1 on request or on a schedule. India's DPDP Act 2023 expects you to keep personal data only as long as needed.

**Limits to watch.** Cloudflare Pages Functions free plan: 100,000 requests/day. Brevo free: 300 emails/day. D1 free: 5 million reads/day.

**Security checks worth doing once.** Run an OWASP ZAP baseline scan against the pages.dev preview, and check securityheaders.com and ssllabs.com for the live domain.
