// Whisk & Wonder Cakes: orders, payment confirmation, feedback and reward codes.
// One function file. The browser calls it with POST { action, ... } (JSON).
//
// Owner payment confirmation:
//   1. Owner gets an email (and optional ntfy alert) with a signed link.
//   2. The link opens a page that only SHOWS the order. Nothing changes on GET.
//   3. Owner presses "Mark payment received" (a POST). Only then the order becomes paid.
//
// Environment variables (Netlify > Site settings > Environment variables):
//   REWARDS_SECRET   required. Long random text (40+ characters). Keep it secret.
//   NTFY_TOPIC       optional. ntfy topic for phone alerts. Use a long random name.
//   NTFY_TOKEN       optional. ntfy access token, so only you can read the topic.
//   REWARD_AMOUNT    optional. Rupees off per reward code (default 50).
//   SITE_URL         optional. Default https://www.whiskandwondercakes.in
//   OWNER_EMAIL, BREVO_API_KEY, BREVO_SENDER_EMAIL   optional. Email alerts.
//   SITE_ID, NETLIFY_API_TOKEN   optional. Only if Blobs config is not injected.

const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
const AMOUNT = Number(process.env.REWARD_AMOUNT || 50);
const SITE = (process.env.SITE_URL || "https://www.whiskandwondercakes.in").replace(/\/$/, "");
const SECRET = process.env.REWARDS_SECRET || "";
const ORDER_RE = /^ORD-[A-Z2-9]{6}$/;
const CODE_RE = /^RWD-[A-Z2-9]{6}$/;
const MAX_TOTAL = 200000; // rupees: sanity cap for one order

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (statusCode, body) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) });
const page = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  body,
});

// Uses SITE_ID + NETLIFY_API_TOKEN when set (fallback if Netlify does not inject Blobs config)
const store = () =>
  getStore(
    process.env.SITE_ID && process.env.NETLIFY_API_TOKEN
      ? { name: "rewards", siteID: process.env.SITE_ID, token: process.env.NETLIFY_API_TOKEN }
      : { name: "rewards" }
  );
const now = () => new Date().toISOString();
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normCode = (v) => String(v || "").trim().toUpperCase();
const normOrder = (v) => String(v || "").trim().toUpperCase();
const normPhone = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : ""; };
const money = (n) => Math.round(Number(n) || 0);


// ---------- Server price list ----------
// The browser sends only what the customer picked (item, weight, quantity).
// The server prices every line from this list, so changing prices in DevTools has no effect.
// Keep in sync with site/index.html CATALOG. test/rewards.test.js checks that both lists match.
const CAKE_PER_LB = {
  "black-forest": 525,
  "pineapple": 375,
  "strawberry": 425,
  "butterscotch": 425,
  "red-velvet": 575,
  "vanilla": 375,
};
const CAKE_NAMES = {
  "black-forest": "Black Forest",
  "pineapple": "Pineapple",
  "strawberry": "Strawberry",
  "butterscotch": "Butterscotch",
  "red-velvet": "Red Velvet",
  "vanilla": "Vanilla",
};
const QUOTE_ITEMS = {
  "metallic-balloons": ["Pack of 5", "Pack of 10"],
  "pastel-balloons": ["Pack of 20", "Pack of 50"],
  "candles": ["Pack of 12", "Pack of 24"],
  "banners": ["Single banner", "Banner + bunting"],
  "party-caps": ["Pack of 6", "Pack of 12"],
  "poppers": ["Popper + confetti set", "Party pack"],
  "bundle-birthday": ["Bundle"],
  "bundle-kids": ["Bundle"],
  "bundle-anniversary": ["Bundle"],
  "bundle-grand": ["Bundle"],
};
const QUOTE_NAMES = {
  "metallic-balloons": "Metallic Balloons",
  "pastel-balloons": "Pastel Balloons",
  "candles": "Candles",
  "banners": "Banners & Bunting",
  "party-caps": "Party Caps & Hats",
  "poppers": "Popper, Confetti & More",
  "bundle-birthday": "Birthday Starter",
  "bundle-kids": "Kids Party Pack",
  "bundle-anniversary": "Glam Anniversary",
  "bundle-grand": "Grand Celebration",
};

const MAX_LB = 10;          // heaviest cake on the picker (5 kg)
const MAX_QTY = 20;         // per cart line, as on the site
const MAX_LINES = 30;
const MAX_DELIVERY = 110;   // rupees; the site's delivery table tops out at 10 km = Rs 110

const lbKey = (n) => n + " lb (" + (n === 1 ? "500 g" : (n / 2) + " kg") + ")";
const lbOf = (key) => { const m = /^(\d+) lb \(/.exec(String(key || "")); return m ? parseInt(m[1], 10) : 0; };

// Returns { cakeTotal, lines, cakesText, extrasText }. Throws Error with a customer message if invalid.
function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    throw new Error("Your cart is empty or too large. Please refresh the page and try again.");
  }
  let cakeTotal = 0;
  const lines = [];
  const cakeParts = [];
  const extraParts = [];
  for (const it of items) {
    const id = String((it && it.id) || "");
    const size = String((it && it.size) || "");
    const qty = Number(it && it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new Error("A quantity in your cart is not valid. Please refresh the page and try again.");
    }
    const opt = clean(it.opt, 60);
    if (Object.prototype.hasOwnProperty.call(CAKE_PER_LB, id)) {
      const n = lbOf(size);
      if (!(n >= 1 && n <= MAX_LB) || lbKey(n) !== size) {
        throw new Error("A cake weight in your cart is not valid. Please refresh the page and try again.");
      }
      const amount = CAKE_PER_LB[id] * n * qty;
      cakeTotal += amount;
      lines.push({ id, size, qty, opt, amount });
      cakeParts.push(CAKE_NAMES[id] + " " + size + " x" + qty);
    } else if (Object.prototype.hasOwnProperty.call(QUOTE_ITEMS, id) && QUOTE_ITEMS[id].indexOf(size) !== -1) {
      lines.push({ id, size, qty, opt, amount: 0 });
      extraParts.push(QUOTE_NAMES[id] + " (" + size + ") x" + qty + (opt ? " - " + opt : ""));
    } else {
      throw new Error("An item in your cart is no longer available. Please refresh the page and try again.");
    }
  }
  return { cakeTotal, lines, cakesText: cakeParts.join(", "), extrasText: extraParts.join(", ") };
}

function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); } catch (e) { return null; }
}

function makeCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CHARS[crypto.randomInt(CHARS.length)];
  return "RWD-" + s;
}

// Signed tokens: confirm (owner only) and feedback (sent to the customer with the order)
function sign(kind, id) {
  return crypto.createHmac("sha256", SECRET).update(kind + ":" + id).digest("hex").slice(0, 24);
}
function tokenOk(kind, id, token) {
  const want = sign(kind, id);
  const got = String(token || "");
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
const confirmUrl = (id) => `${SITE}/.netlify/functions/rewards?action=confirm&id=${id}&s=${sign("confirm", id)}`;
const feedbackUrl = (id) => `${SITE}/?feedback=${id}&t=${sign("feedback", id)}`;

async function sendEmail(to, name, subject, html) {
  if (!to || !process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) return;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_SENDER_EMAIL, name: "Whisk & Wonder Cakes" },
        to: [{ email: to, name: name || "" }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) console.log("BREVO ERROR status", res.status); // no body or address in logs
    else console.log("BREVO OK", subject);
  } catch (e) { console.log("BREVO EXCEPTION", e && e.name); }
}

function ownerOrderEmail(order) {
  return `<div style="font-family:Arial,sans-serif;color:#3b2a24;line-height:1.5">
<h2 style="margin:0 0 .4rem">New order ${esc(order.id)}</h2>
<ul>
<li><b>Name:</b> ${esc(order.name)}</li>
<li><b>Phone:</b> ${esc(order.phone)}</li>
<li><b>Email:</b> ${esc(order.email || "-")}</li>
<li><b>Cakes:</b> ${esc(order.cakes || "-")}</li>
<li><b>Bundles / party:</b> ${esc(order.extras || "-")}</li>
<li><b>Date:</b> ${esc(order.date || "-")}</li>
<li><b>Total:</b> Rs ${esc(order.total)}${order.discount ? " (reward Rs " + esc(order.discount) + " applied)" : ""}</li>
<li><b>Payment:</b> ${esc(order.payment || "-")}</li>
</ul>
<p><a href="${confirmUrl(order.id)}" style="display:inline-block;background:#c9a441;color:#2a1d18;padding:.7rem 1rem;border-radius:999px;text-decoration:none;font-weight:600">Open order and confirm payment</a></p>
<p style="font-size:.85rem;color:#6b5a52">Check the payment in your UPI app or bank alert before you confirm.</p>
</div>`;
}

function orderReceivedEmail(order) {
  const half = /50%/.test(order.payment || "");
  const advance = half ? Math.ceil(order.total / 2) : order.total;
  const balance = order.total - advance;
  return `<div style="font-family:Arial,sans-serif;color:#3b2a24;line-height:1.5">
<h2 style="margin:0 0 .4rem">Thank you, ${esc(order.name)}!</h2>
<p>We have received your order <b>${esc(order.id)}</b> from Whisk &amp; Wonder Cakes.</p>
<ul>
<li><b>Cakes:</b> ${esc(order.cakes || "-")}</li>
${order.extras ? `<li><b>Bundles / party items:</b> ${esc(order.extras)} (confirmed on WhatsApp)</li>` : ""}
<li><b>Date:</b> ${esc(order.date || "-")}</li>
<li><b>Total:</b> Rs ${esc(order.total)}${order.discount ? " (reward Rs " + esc(order.discount) + " applied)" : ""}</li>
</ul>
${half
  ? `<p><b>Payment:</b> Please pay the 50% advance of <b>Rs ${advance}</b> by UPI now, and send the payment screenshot with your order ID on WhatsApp. The remaining <b>Rs ${balance}</b> is paid on delivery or pickup.</p>
<p>Your order is confirmed once we see the advance payment.</p>`
  : `<p><b>Payment:</b> Please pay <b>Rs ${advance}</b> by UPI, and send the payment screenshot with your order ID on WhatsApp.</p>
<p>Your order is confirmed once we see the payment.</p>`}
<p>Dhanyavaad,<br>Whisk &amp; Wonder Cakes</p>
</div>`;
}

function paymentConfirmedEmail(order) {
  const balance = /50%/.test(order.payment || "") ? order.total - Math.ceil(order.total / 2) : 0;
  return `<div style="font-family:Arial,sans-serif;color:#3b2a24;line-height:1.5">
<h2 style="margin:0 0 .4rem">Payment received, ${esc(order.name)}</h2>
<p>Your order <b>${esc(order.id)}</b> is confirmed. We will be in touch on WhatsApp about delivery or pickup.</p>
${balance > 0 ? `<p>The remaining <b>Rs ${balance}</b> is paid on delivery or pickup.</p>` : ""}
<p>Dhanyavaad,<br>Whisk &amp; Wonder Cakes</p>
</div>`;
}

// The ntfy alert has no customer name or phone. Those are only in the owner email.
async function notifyOwner(order) {
  if (!process.env.NTFY_TOPIC) return;
  const headers = { Title: "New order " + order.id, Priority: "high", Click: confirmUrl(order.id) };
  if (process.env.NTFY_TOKEN) headers.Authorization = "Bearer " + process.env.NTFY_TOKEN;
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(process.env.NTFY_TOPIC)}`, {
      method: "POST",
      headers,
      body: `Order ${order.id} | Rs ${order.total} | ${order.date || "-"}\n${order.cakes || ""}\nOpen the alert to review and confirm payment.`,
    });
  } catch (e) { /* alert failed, the order is still saved */ }
}

// ---------- Owner confirm pages ----------

const BTN = "display:inline-block;background:#c9a441;color:#2a1d18;padding:.8rem 1.1rem;border-radius:999px;text-decoration:none;font-weight:600;border:0;font-size:1rem;cursor:pointer";

function pageShell(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:2rem auto;padding:0 1rem;color:#3b2a24;line-height:1.5">${inner}</body></html>`;
}

function orderDetails(order) {
  return `<ul>
<li><b>Name:</b> ${esc(order.name)}</li>
<li><b>Phone:</b> ${esc(order.phone)}</li>
<li><b>Cakes:</b> ${esc(order.cakes || "-")}</li>
<li><b>Bundles / party:</b> ${esc(order.extras || "-")}</li>
<li><b>Date:</b> ${esc(order.date || "-")}</li>
<li><b>Payable:</b> Rs ${esc(order.total)}${order.discount ? " (reward Rs " + esc(order.discount) + " applied)" : ""}</li>
<li><b>Payment:</b> ${esc(order.payment || "-")}</li>
${order.feedback && order.rewardCode ? `<li><b>Feedback done, code:</b> ${esc(order.rewardCode)}</li>` : ""}
</ul>`;
}

function confirmPageHtml(id, s, order, justConfirmed) {
  if (order.status !== "paid") {
    return pageShell("Confirm order " + id, `<h2 style="margin-bottom:.2rem">Order ${esc(id)}</h2>
<p style="margin-top:0;color:#6b5a52">Not confirmed yet. Check your UPI app or bank alert for the payment, then press the button.</p>
${orderDetails(order)}
<form method="POST" action="/.netlify/functions/rewards">
<input type="hidden" name="do" value="confirm"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="s" value="${esc(s)}">
<button type="submit" style="${BTN}">Mark payment received</button>
</form>
<p style="font-size:.85rem;color:#6b5a52">Opening this page does not confirm anything. Only the button does.</p>`);
  }
  const msg = `Hi ${order.name || ""}, thank you for your order ${id} from Whisk & Wonder Cakes! Your payment is confirmed. Please share your celebration feedback here (takes 1 minute) and get a reward code for your next order: ${feedbackUrl(id)}`;
  const waLink = `https://wa.me/91${order.phone}?text=${encodeURIComponent(msg)}`;
  return pageShell("Confirmed order " + id, `<h2 style="margin-bottom:.2rem">Order ${esc(id)}</h2>
<p style="margin-top:0;color:${justConfirmed ? "#2f6b3a" : "#6b5a52"}">${justConfirmed ? "Payment marked as confirmed." : "Already confirmed earlier."}</p>
${orderDetails(order)}
<p><a href="${waLink}" style="${BTN}">Send feedback link to customer on WhatsApp</a></p>
<p style="font-size:.85rem;color:#6b5a52">The link opens the feedback form for this order only. The customer gets a reward code after submitting it. Do not share this page.</p>`);
}

// GET: show the order. Changes nothing, so link scanners and previews are safe.
async function confirmPage(q) {
  const id = normOrder(q.id);
  const s = String(q.s || "");
  if (!ORDER_RE.test(id) || !tokenOk("confirm", id, s)) {
    return page(403, pageShell("Link not valid", "<p>This confirm link is not valid.</p>"));
  }
  const order = await store().get("order:" + id, { type: "json" });
  if (!order) return page(404, pageShell("Not found", "<p>Order not found.</p>"));
  return page(200, confirmPageHtml(id, s, order, false));
}

// POST (button press): mark the order paid, once.
async function confirmSubmit(idRaw, s) {
  const id = normOrder(idRaw);
  if (!ORDER_RE.test(id) || !tokenOk("confirm", id, s)) {
    return page(403, pageShell("Link not valid", "<p>This confirm link is not valid.</p>"));
  }
  const db = store();
  const order = await db.get("order:" + id, { type: "json" });
  if (!order) return page(404, pageShell("Not found", "<p>Order not found.</p>"));

  let justConfirmed = false;
  if (order.status !== "paid") {
    order.status = "paid";
    order.paidAt = now();
    await db.setJSON("order:" + id, order);
    justConfirmed = true;
    await sendEmail(order.email, order.name, "Payment received for order " + id, paymentConfirmedEmail(order));
  }
  return page(200, confirmPageHtml(id, s, order, justConfirmed));
}

// ---------- API ----------

// ---------- Rate limiting (per client IP, per hour) ----------
// The IP is hashed with the secret before it is stored, so no raw IP addresses are kept.
const RL_ORDERS = Number(process.env.RATE_LIMIT_ORDERS || 20);   // orders per IP per hour
const RL_OTHER = Number(process.env.RATE_LIMIT_OTHER || 120);    // other API calls per IP per hour

function clientKey(event) {
  const h = event.headers || {};
  const ip = String(h["x-nf-client-connection-ip"] || h["client-ip"] || "unknown").slice(0, 64);
  return crypto.createHmac("sha256", SECRET).update(ip).digest("hex").slice(0, 32);
}

// Returns true if this request is allowed. Uses an etag so two requests cannot both slip past the limit.
async function allowRequest(db, bucket, max, clientId) {
  const hour = Math.floor(Date.now() / 3600000);
  const key = "rl:" + bucket + ":" + clientId + ":" + hour;
  const found = await db.getWithMetadata(key, { type: "json" });
  const count = found && found.data ? Number(found.data.count) || 0 : 0;
  if (count >= max) return false;
  const next = { count: count + 1 };
  const res = found
    ? await db.setJSON(key, next, { onlyIfMatch: found.etag })
    : await db.setJSON(key, next, { onlyIfNew: true });
  return !(res && res.modified === false);
}

// Email must look like an address and be short. Anything else is stored without an email, so nothing is sent.
function cleanEmail(v) {
  const e = clean(v, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

exports.handler = async (event) => {
  if (!SECRET || SECRET.length < 32) {
    return event.httpMethod === "GET" || event.httpMethod === "POST"
      ? page(500, pageShell("Not configured", "<p>Server not configured (REWARDS_SECRET missing).</p>"))
      : json(500, { ok: false, message: "Server not configured." });
  }

  if (event.httpMethod === "GET") {
    const q = event.queryStringParameters || {};
    if (q.action === "confirm") return confirmPage(q);
    return page(404, pageShell("Not found", "<p>Not found.</p>"));
  }

  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed" });

  // Form POST from the owner's confirm page (the "Mark payment received" button)
  const headers = event.headers || {};
  const ct = String(headers["content-type"] || headers["Content-Type"] || "");
  if (ct.includes("application/x-www-form-urlencoded")) {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "");
    const form = new URLSearchParams(raw);
    if (form.get("do") === "confirm") return confirmSubmit(form.get("id"), form.get("s"));
    return page(400, pageShell("Bad request", "<p>Bad request.</p>"));
  }

  const b = parseBody(event);
  if (!b || typeof b !== "object") return json(400, { ok: false, message: "Bad request" });
  const db = store();

  const clientId = clientKey(event);
  const allowed = await allowRequest(db, b.action === "createOrder" ? "orders" : "api", b.action === "createOrder" ? RL_ORDERS : RL_OTHER, clientId);
  if (!allowed) {
    return json(429, { ok: false, message: "Too many requests. Please wait a while and try again, or message us on WhatsApp." });
  }

  switch (b.action) {
    /* Called when the customer places an order.
       The server decides the reward discount, marks the reward code used (once, with this order),
       and checks the total. An order that cannot be saved returns ok:false, so the customer knows. */
    case "createOrder": {
      const id = normOrder(b.orderId);
      const phone = normPhone(b.phone);
      if (!ORDER_RE.test(id) || !phone) return json(400, { ok: false, message: "Invalid order" });

      const existing = await db.get("order:" + id, { type: "json" });
      if (existing) return json(200, { ok: true, existing: true, total: existing.total, discount: existing.discount });

      // Every price comes from the server list. The browser's totals are only checked, never used.
      let priced;
      try { priced = priceCart(b.items); } catch (e) { return json(200, { ok: false, message: e.message }); }
      const delivery = Number(b.delivery);
      if (!Number.isInteger(delivery) || delivery < 0 || delivery > MAX_DELIVERY) {
        return json(200, { ok: false, message: "Delivery charge is not valid. Please refresh the page and try again." });
      }
      const cakeTotal = priced.cakeTotal;

      // Reward: read the code first, so nothing is burned if the total check below fails
      const rewardCode = normCode(b.rewardCode);
      let discount = 0;
      let codeKey = null;
      let codeFound = null;
      if (rewardCode) {
        if (!CODE_RE.test(rewardCode)) return json(200, { ok: false, message: "This reward code is not valid." });
        codeKey = "code:" + rewardCode;
        codeFound = await db.getWithMetadata(codeKey, { type: "json" });
        if (!codeFound || !codeFound.data) return json(200, { ok: false, message: "This reward code is not valid." });
        if (codeFound.data.status !== "unused" && codeFound.data.orderId !== id) {
          return json(200, { ok: false, message: "This reward code has already been used." });
        }
        discount = Math.min(money(codeFound.data.amount) || AMOUNT, cakeTotal);
      }

      const payable = Math.max(0, cakeTotal - discount) + delivery;
      if (payable !== money(b.total)) {
        return json(200, { ok: false, message: "Prices have changed or the total did not match. Please refresh the page and try again." });
      }

      // Mark the reward used, once. Etag stops two orders using the same code at the same moment.
      if (codeFound && codeFound.data.status === "unused") {
        const res = await db.setJSON(
          codeKey,
          { ...codeFound.data, status: "used", usedAt: now(), orderId: id },
          { onlyIfMatch: codeFound.etag }
        );
        if (res && res.modified === false) {
          return json(200, { ok: false, message: "This reward code was just used by another order." });
        }
      }

      const order = {
        id, status: "pending", name: clean(b.name, 60), email: cleanEmail(b.email), phone,
        total: payable, discount, usedRewardCode: rewardCode, delivery,
        cakes: priced.cakesText, extras: priced.extrasText, items: priced.lines,
        date: clean(b.date, 20), payment: clean(b.payment, 80), createdAt: now(),
      };
      await db.setJSON("order:" + id, order);
      await notifyOwner(order);
      await sendEmail(process.env.OWNER_EMAIL, "Owner", "New order " + id + " from " + order.name, ownerOrderEmail(order));
      await sendEmail(order.email, order.name, "Order " + id + " received", orderReceivedEmail(order));
      return json(200, { ok: true, total: payable, discount });
    }

    /* Feedback page asks: is this link valid, and is the order paid? */
    case "feedbackInfo": {
      const id = normOrder(b.orderId);
      if (!ORDER_RE.test(id) || !tokenOk("feedback", id, b.token)) return json(200, { ok: false, message: "This feedback link is not valid." });
      const order = await db.get("order:" + id, { type: "json" });
      if (!order) return json(200, { ok: false, message: "This feedback link is not valid." });
      if (order.status !== "paid") {
        return json(200, { ok: false, message: "Your order is not confirmed yet. We will send you the feedback link on WhatsApp once payment is confirmed." });
      }
      if (order.rewardCode) return json(200, { ok: true, done: true, code: order.rewardCode });
      return json(200, { ok: true, name: order.name });
    }

    /* Customer submits feedback: one reward code per paid order */
    case "feedbackSubmit": {
      const id = normOrder(b.orderId);
      if (!ORDER_RE.test(id) || !tokenOk("feedback", id, b.token)) return json(200, { ok: false, message: "This feedback link is not valid." });
      const order = await db.get("order:" + id, { type: "json" });
      if (!order || order.status !== "paid") return json(200, { ok: false, message: "Your order is not confirmed yet." });
      if (order.rewardCode) return json(200, { ok: true, code: order.rewardCode, existing: true });

      const rating = Number(b.rating);
      if (!(rating >= 1 && rating <= 5)) return json(200, { ok: false, message: "Please select a star rating." });

      const code = makeCode();
      await db.setJSON("code:" + code, { status: "unused", orderId: id, phone: order.phone, amount: AMOUNT, createdAt: now() });
      await db.setJSON("order:" + id, {
        ...order,
        rewardCode: code,
        feedback: {
          rating, text: clean(b.feedback, 1000), occasion: clean(b.occasion, 80), date: clean(b.date, 20),
          recipient: clean(b.recipient, 60), relation: clean(b.relation, 60), submittedAt: now(),
        },
      });
      return json(200, { ok: true, code });
    }

    /* Checkout: is this reward code usable? (read only) */
    case "check": {
      const code = normCode(b.code);
      if (!CODE_RE.test(code)) return json(200, { valid: false, message: "This code is not valid." });
      const rec = await db.get("code:" + code, { type: "json" });
      if (!rec) return json(200, { valid: false, message: "This code is not valid." });
      if (rec.status !== "unused") return json(200, { valid: false, message: "This code has already been used." });
      return json(200, { valid: true, amount: rec.amount || AMOUNT });
    }

    /* Kept for older browser copies. The current checkout uses createOrder instead. */
    case "redeem": {
      const code = normCode(b.code);
      if (!CODE_RE.test(code)) return json(200, { ok: false, message: "This code is not valid." });
      const key = "code:" + code;
      const found = await db.getWithMetadata(key, { type: "json" });
      if (!found || !found.data) return json(200, { ok: false, message: "This code is not valid." });
      if (found.data.status !== "unused") return json(200, { ok: false, message: "This code has already been used." });
      const res = await db.setJSON(
        key,
        { ...found.data, status: "used", usedAt: now(), orderId: normOrder(b.orderId).slice(0, 40) },
        { onlyIfMatch: found.etag }
      );
      if (res && res.modified === false) return json(200, { ok: false, message: "This code was just used by another order." });
      return json(200, { ok: true, amount: found.data.amount || AMOUNT });
    }

    default:
      return json(400, { ok: false, message: "Unknown action" });
  }
};

// Exposed for tests only
exports._security = { cleanEmail, clientKey, allowRequest };
exports._pricing = { priceCart, CAKE_PER_LB, CAKE_NAMES, QUOTE_ITEMS, QUOTE_NAMES, MAX_LB, MAX_QTY, lbKey };
