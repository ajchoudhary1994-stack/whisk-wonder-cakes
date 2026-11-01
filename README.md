# Whisk & Wonder Cakes website

Home bakery website: eggless cakes, party store, delivery check, orders via UPI or
cash on delivery, and celebration feedback that gives a reward code.

## Layout

- `site/` is the published website (index, privacy page, images, `_headers` for security headers).
- `netlify/functions/rewards.js` is the only server code: orders, owner payment confirmation,
  feedback and reward codes.
- `netlify.toml` publishes only `site/`, so the function source and package files are not public.
- `test/rewards.test.js` checks the function (`npm test`). It uses an in-memory store, so no account is needed.

## Environment variables (Netlify > Site settings > Environment variables)

| Name | Required | Purpose |
| --- | --- | --- |
| `REWARDS_SECRET` | yes | Signs owner and feedback links. 40+ random characters. |
| `NTFY_TOPIC` | no | Phone alert topic. Use a long random name. |
| `NTFY_TOKEN` | no | ntfy access token. Set it if the topic is protected, so only you can read alerts. |
| `OWNER_EMAIL` | no | Gets an email for each new order. |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | no | Email to the owner and customers. |
| `REWARD_AMOUNT` | no | Rupees off per reward code (default 50). |
| `SITE_URL` | no | Default `https://www.whiskandwondercakes.in`. |
| `SITE_ID`, `NETLIFY_API_TOKEN` | no | Only if Blobs config is not injected automatically. Use a token with the smallest scope you can. |

## Order and payment flow

1. Customer places an order. The server checks any reward code, applies the discount itself,
   marks the code used (once), and saves the order. If saving fails, the customer sees an error
   and nothing is burned.
2. Owner gets an email (and an ntfy alert). The link opens the order details. It changes nothing.
3. Owner checks the UPI payment and presses **Mark payment received**. Only this button marks the
   order paid, and the customer then gets the WhatsApp feedback link.
4. Customer submits feedback and receives one reward code.

## Known limits

- Cake prices are still read from the browser catalog. The server applies reward discounts
  and checks totals, but it has no price list of its own. Owner confirms each payment manually.
- Content Security Policy still allows inline scripts and styles, because `index.html` uses them.
  Moving them to files or hashes is the next hardening step.
- No rate limiting on the order endpoint yet. Netlify rate limiting or a bot check should be added
  if order spam appears.
