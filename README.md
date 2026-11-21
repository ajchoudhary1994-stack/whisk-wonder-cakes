# Whisk & Wonder Cakes website

Hosted on **Cloudflare Pages** (free). The site is plain files in `site/`. One server file handles orders and rewards.

- `site/` is the website that visitors get. Cloudflare publishes only this folder.
- `functions/api/rewards.js` is the only server code: orders, owner payment confirmation, feedback and reward codes.
  It runs at `/api/rewards` and keeps data in a Cloudflare D1 database. The `kv` table is created automatically on first use; migration `0002_create_kv_store.sql` is also provided for managed schema setup.
- `test/` has the automated checks. Run `npm test` (needs Node 22 or newer).
- `source/` holds the unminified motion/3D scripts. The `build.sh` mentioned in older notes is not in this ZIP, so edit `site/js/` directly. Not needed to deploy.

Setup steps are in **CLOUDFLARE-DEPLOY.md**.

## Settings (Cloudflare > Workers & Pages > your project > Settings)

| Name | Needed | What it is |
|---|---|---|
| D1 binding `DB` | yes | Bindings > Add > D1 database. The variable name must be `DB`. |
| `REWARDS_SECRET` | yes | Secret. Long random text, 40+ characters. |
| `NTFY_TOPIC` | no | ntfy topic for phone alerts. Use a long random name. |
| `NTFY_TOKEN` | no | ntfy access token, so only you can read the topic. |
| `REWARD_AMOUNT` | no | Rupees off per reward code. Default 50. |
| `SITE_URL` | no | Default `https://www.whiskandwondercakes.in` |
| `OWNER_EMAIL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | no | Email alerts for the owner and customers. |

## Owner payment confirmation

1. A new order sends an ntfy alert (and an email if set up) with a signed link.
2. The link only shows the order. Opening it changes nothing.
3. Pressing "Mark payment received" marks the order paid. Then the page offers a WhatsApp message with the customer's feedback link.
4. After feedback the customer gets a reward code (one per paid order).

## Notes

- Orders, feedback and reward codes stay in D1 with no end date. Decide how long to keep them.
- Rate limits are per client IP per hour, stored in D1. Cloudflare's free bot and rate protection can sit in front for more.
- Set `NTFY_TOKEN` whenever `NTFY_TOPIC` is enabled. Without it, anyone who knows the topic name may be able to read alerts containing owner confirmation links.
- Address, time slot, cake message and notes are now saved with the order on the server and shown on the owner page and email. (They used to go to Netlify Forms.)
