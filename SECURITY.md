# Security review: Whisk & Wonder Cakes

Reviewed: published site (site/), the rewards Cloudflare Pages Function (functions/api/rewards.js), headers, and the motion/3D layer.

## Result
No hardcoded secrets. Secrets are read from environment variables only. Nothing secret is published.

## Checked and OK
- CSP: script-src and style-src are 'self' only. No inline script, no eval, no unsafe-inline.
- Frame protection: X-Frame-Options DENY and frame-ancestors none. HSTS set.
- Links: every target="_blank" has rel="noopener".
- No javascript: URLs and no inline event handlers in the markup.
- DOM output: user and server text is escaped with esc() or written with textContent. innerHTML is used only for static markup or escaped values.
- URL parameters (feedback links) are read with URLSearchParams and sent to the server only, never rendered as HTML.
- Function: tokens are HMAC-signed and compared in constant time. IP addresses are hashed before storage. Responses are no-store.
- Source folder (source/), netlify functions source and package.json are not published (netlify.toml publish = "site").

## Fixed in this review
- site/data/sale-pings.json contained invented buyer names and cities. It is now an empty list.
  Fake "recent purchase" notices are misleading to customers and can breach consumer-protection rules.
  Only real, consented purchase notices should be added later.
- Added headers: Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, X-Permitted-Cross-Domain-Policies.
- Added worker-src 'none' and manifest-src 'self' to the CSP.

## Open items (owner action or later)
- Prices in the cart are calculated in the browser. The owner confirms the final amount on WhatsApp, so this is a business risk,
  not a data leak. If online payment is ever added, prices must be checked on the server.
- Dependencies: run `npm audit` on a machine with internet before deploying, because the function uses @netlify/blobs.
- Rotate REWARDS_SECRET if they were ever pasted into chat or a shared file.
- Keep NTFY_TOKEN set so only the owner can read order alerts.
- Re-run the headless checks after every change (node test/site.test.js and the browser checks).
