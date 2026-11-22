// Whisk & Wonder Cakes: orders, payment confirmation, feedback and reward codes.
// One function file. The browser calls it with POST { action, ... } (JSON).
//
// Owner payment confirmation:
//   1. Owner gets an email (and optional ntfy alert) with a signed link.
//   2. The link opens a page that only SHOWS the order. Nothing changes on GET.
//   3. Owner presses "Mark payment received" (a POST). Only then the order becomes paid.
//
// Runs on Cloudflare Pages Functions at /api/rewards. Orders and reward codes live in a D1 database.
//
// Settings (Cloudflare dashboard > Workers & Pages > your project > Settings):
//   Bindings:   D1 database, variable name  DB
//   Variables and secrets:
//     REWARDS_SECRET   required (Secret). Long random text (40+ characters). Keep it secret.
//     NTFY_TOPIC       optional. ntfy topic for phone alerts. Use a long random name.
//     NTFY_TOKEN       optional. ntfy access token, so only you can read the topic.
//     REWARD_AMOUNT    optional. Rupees off per reward code (default 50).
//     SITE_URL         optional. Default https://www.whiskandwondercakes.in
//     OWNER_EMAIL, BREVO_API_KEY, BREVO_SENDER_EMAIL   optional. Email alerts.

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
// Settings are read from the request's environment (see configure below)
let ENV = {};
let AMOUNT = 50;
let SITE = "https://www.whiskandwondercakes.in";
let SECRET = "";
let RL_ORDERS = 20;   // orders per IP per hour
let RL_OTHER = 120;   // other API calls per IP per hour
let RL_CHECK = 15;    // reward code checks per IP per hour (stops guessing)
const RL_MAIL = 3;    // customer emails per email address per hour
function configure(env) {
  ENV = env || {};
  const configuredAmount = Number(ENV.REWARD_AMOUNT || 50);
  AMOUNT = Number.isSafeInteger(configuredAmount) && configuredAmount > 0 && configuredAmount <= MAX_TOTAL ? configuredAmount : 50;
  SITE = (ENV.SITE_URL || "https://www.whiskandwondercakes.in").replace(/\/$/, "");
  SECRET = ENV.REWARDS_SECRET || "";
  const limit = (value, fallback) => Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10000 ? Number(value) : fallback;
  RL_ORDERS = limit(ENV.RATE_LIMIT_ORDERS, 20);
  RL_OTHER = limit(ENV.RATE_LIMIT_OTHER, 120);
  RL_CHECK = limit(ENV.RATE_LIMIT_CHECK, 15);
}
const ORDER_RE = /^ORD-[A-Z2-9]{6}$/;
const CODE_RE = /^RWD-[A-Z2-9]{6}$/;
const MAX_TOTAL = 200000; // rupees: sanity cap for one order

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
const PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // The confirmation page contains only inline presentation styles and a same-origin POST form.
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
const json = (statusCode, body) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) });
const page = (statusCode, body) => ({ statusCode, headers: PAGE_HEADERS, body });

// Storage: one D1 table (k, v, etag, t). The table is created on first use.
// setJSON keeps the old options: onlyIfNew and onlyIfMatch (etag). Both are single SQL statements, so two
// requests can never both win (one reward code cannot be used twice, rate limits cannot be skipped).
const ready = new WeakSet();
async function store() {
  const d = ENV.DB;
  if (!d) throw new Error("DB binding missing");
  if (!ready.has(d)) {
    await d.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, etag INTEGER NOT NULL DEFAULT 1, t INTEGER NOT NULL)").run();
    ready.add(d);
  }
  const changed = (r) => !!(r && r.meta && r.meta.changes > 0);
  return {
    async get(k) {
      const r = await d.prepare("SELECT v FROM kv WHERE k = ?").bind(k).first();
      return r ? JSON.parse(r.v) : null;
    },
    async getWithMetadata(k) {
      const r = await d.prepare("SELECT v, etag FROM kv WHERE k = ?").bind(k).first();
      return r ? { data: JSON.parse(r.v), etag: r.etag } : null;
    },
    async setJSON(k, val, opts) {
      const v = JSON.stringify(val), t = Date.now();
      if (opts && opts.onlyIfNew) {
        return { modified: changed(await d.prepare("INSERT OR IGNORE INTO kv (k, v, etag, t) VALUES (?, ?, 1, ?)").bind(k, v, t).run()) };
      }
      if (opts && opts.onlyIfMatch !== undefined) {
        return { modified: changed(await d.prepare("UPDATE kv SET v = ?, etag = etag + 1, t = ? WHERE k = ? AND etag = ?").bind(v, t, k, Number(opts.onlyIfMatch)).run()) };
      }
      await d.prepare("INSERT INTO kv (k, v, etag, t) VALUES (?, ?, 1, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, etag = kv.etag + 1, t = excluded.t").bind(k, v, t).run();
      return { modified: true };
    },
    async delete(k) {
      return changed(await d.prepare("DELETE FROM kv WHERE k = ?").bind(k).run());
    },
    async purgeRateLimits(olderThanMs) {
      await d.prepare("DELETE FROM kv WHERE k LIKE 'rl:%' AND t < ?").bind(Date.now() - olderThanMs).run();
    },
  };
}
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
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < 6; i++) s += CHARS[bytes[i] & 31]; // 32 characters, so every value is equally likely
  return "RWD-" + s;
}

async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const sameText = (a, b) => { // constant time for equal lengths
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// Signed tokens: confirm (owner only) and feedback (sent to the customer with the order)
async function sign(kind, id) {
  return (await hmacHex(SECRET, kind + ":" + id)).slice(0, 24);
}
async function tokenOk(kind, id, token) {
  return sameText(String(token || ""), await sign(kind, id));
}
const feedbackUrl = async (id) => `${SITE}/?feedback=${id}&t=${await sign("feedback", id)}`;
const confirmUrl = async (id) => `${SITE}/api/rewards?action=confirm&id=${id}&s=${await sign("confirm", id)}`;

// Outbound calls (Brevo, ntfy) must never hold up an order: 5 s timeout, one retry after a short pause on a network error or a 5xx.
async function fetchWithRetry(url, opts) {
  const ms = Math.max(50, Number(ENV.FETCH_TIMEOUT_MS) || 5000);
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { ...opts, signal: ctl.signal });
      if (res.status < 500 || attempt === 1) return res;
    } catch (e) {
      if (attempt === 1) throw e;
    } finally { clearTimeout(timer); }
    await new Promise((r) => setTimeout(r, 300));
  }
}

// One JSON line per business event, with no names, phones, emails or addresses (safe to keep in Cloudflare logs).
const logEvent = (evt, data) => console.log(JSON.stringify({ evt, ...data }));

async function sendEmail(to, name, subject, html) {
  if (!to || !ENV.BREVO_API_KEY || !ENV.BREVO_SENDER_EMAIL) return;
  try {
    const res = await fetchWithRetry("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": ENV.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: ENV.BREVO_SENDER_EMAIL, name: "Whisk & Wonder Cakes" },
        to: [{ email: to, name: name || "" }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) logEvent("email_failed", { status: res.status }); // no body or address in logs
    else console.log("BREVO OK", subject);
  } catch (e) { logEvent("email_failed", { error: e && e.name }); }
}

function ownerOrderEmail(order, link) {
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
${order.address ? `<li><b>Address:</b> ${esc(order.address)}</li>` : ""}
${order.slot ? `<li><b>Time slot:</b> ${esc(order.slot)}</li>` : ""}
${order.message ? `<li><b>Cake message:</b> ${esc(order.message)}</li>` : ""}
${order.notes ? `<li><b>Notes:</b> ${esc(order.notes)}</li>` : ""}
</ul>
<p><a href="${esc(link)}" style="display:inline-block;background:#c9a441;color:#2a1d18;padding:.7rem 1rem;border-radius:999px;text-decoration:none;font-weight:600">Open order and confirm payment</a></p>
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
async function notifyOwner(order, link) {
  if (!ENV.NTFY_TOPIC) return;
  // The confirm link is a bearer credential. Without NTFY_TOKEN the topic is readable by anyone who learns its name,
  // so the link is NOT put in the alert. The owner email still carries it.
  const headers = { Title: "New order " + order.id, Priority: "high" };
  let hint = "Open the alert to review and confirm payment.";
  if (ENV.NTFY_TOKEN) {
    headers.Authorization = "Bearer " + ENV.NTFY_TOKEN;
    headers.Click = link;
  } else {
    hint = "Confirm link is in the owner email. Set NTFY_TOKEN to get it here.";
    console.warn("NTFY_TOPIC is set without NTFY_TOKEN: confirm link left out of the ntfy alert");
  }
  try {
    await fetchWithRetry(`https://ntfy.sh/${encodeURIComponent(ENV.NTFY_TOPIC)}`, {
      method: "POST",
      headers,
      body: `Order ${order.id} | Rs ${order.total} | ${order.date || "-"}\n${order.cakes || ""}\n${hint}`,
    });
  } catch (e) { logEvent("ntfy_failed", { error: e && e.name }); /* alert failed, the order is still saved */ }
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
${order.address ? `<li><b>Address:</b> ${esc(order.address)}</li>` : ""}
${order.slot ? `<li><b>Time slot:</b> ${esc(order.slot)}</li>` : ""}
${order.message ? `<li><b>Cake message:</b> ${esc(order.message)}</li>` : ""}
${order.notes ? `<li><b>Notes:</b> ${esc(order.notes)}</li>` : ""}
${order.feedback && order.rewardCode ? `<li><b>Feedback done, code:</b> ${esc(order.rewardCode)}</li>` : ""}
</ul>`;
}

async function confirmPageHtml(id, s, order, justConfirmed) {
  if (order.status !== "paid") {
    return pageShell("Confirm order " + id, `<h2 style="margin-bottom:.2rem">Order ${esc(id)}</h2>
<p style="margin-top:0;color:#6b5a52">Not confirmed yet. Check your UPI app or bank alert for the payment, then press the button.</p>
${orderDetails(order)}
<form method="POST" action="/api/rewards">
<input type="hidden" name="do" value="confirm"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="s" value="${esc(s)}">
<button type="submit" style="${BTN}">Mark payment received</button>
</form>
<p style="font-size:.85rem;color:#6b5a52">Opening this page does not confirm anything. Only the button does.</p>`);
  }
  const msg = `Hi ${order.name || ""}, thank you for your order ${id} from Whisk & Wonder Cakes! Your payment is confirmed. Please share your celebration feedback here (takes 1 minute) and get a reward code for your next order: ${await feedbackUrl(id)}`;
  const waLink = `https://wa.me/91${order.phone}?text=${encodeURIComponent(msg)}`;
  return pageShell("Confirmed order " + id, `<h2 style="margin-bottom:.2rem">Order ${esc(id)}</h2>
<p style="margin-top:0;color:${justConfirmed ? "#2f6b3a" : "#6b5a52"}">${justConfirmed ? "Payment marked as confirmed." : "Already confirmed earlier."}</p>
${orderDetails(order)}
<p><a href="${waLink}" style="${BTN}">Send feedback link to customer on WhatsApp</a></p>
<p style="font-size:.85rem;color:#6b5a52">The link opens the feedback form for this order only. The customer gets a reward code after submitting it. Do not share this page.</p>`);
}

// GET: show the order. Changes nothing, so link scanners and previews are safe.
// A confirm link is a bearer credential. For an order that is still unpaid it stops working after CONFIRM_TTL_DAYS (default 30).
const linkExpired = (order) => order.status !== "paid" && Number(order.createdAt) > 0 &&
  Date.now() - Number(order.createdAt) > (Math.max(1, Number(ENV.CONFIRM_TTL_DAYS) || 30)) * 86400000;
const expiredPage = () => page(410, pageShell("Link expired", "<p>This confirm link has expired. Open the order in your records and confirm it on WhatsApp.</p>"));

async function confirmPage(q) {
  const id = normOrder(q.id);
  const s = String(q.s || "");
  if (!ORDER_RE.test(id) || !(await tokenOk("confirm", id, s))) {
    return page(403, pageShell("Link not valid", "<p>This confirm link is not valid.</p>"));
  }
  const order = await (await store()).get("order:" + id);
  if (!order) return page(404, pageShell("Not found", "<p>Order not found.</p>"));
  if (linkExpired(order)) return expiredPage();
  return page(200, await confirmPageHtml(id, s, order, false));
}

// POST (button press): mark the order paid, once.
async function confirmSubmit(idRaw, s) {
  const id = normOrder(idRaw);
  if (!ORDER_RE.test(id) || !(await tokenOk("confirm", id, s))) {
    return page(403, pageShell("Link not valid", "<p>This confirm link is not valid.</p>"));
  }
  const db = await store();
  const found = await db.getWithMetadata("order:" + id);
  if (!found) return page(404, pageShell("Not found", "<p>Order not found.</p>"));

  if (linkExpired(found.data)) return expiredPage();
  let order = found.data;
  let justConfirmed = false;
  if (order.status !== "paid") {
    const paidOrder = { ...order, status: "paid", paidAt: now() };
    const saved = await db.setJSON("order:" + id, paidOrder, { onlyIfMatch: found.etag });
    if (saved && saved.modified) {
      order = paidOrder;
      logEvent("order_paid", { id });
      justConfirmed = true;
      await sendEmail(order.email, order.name, "Payment received for order " + id, paymentConfirmedEmail(order));
    } else {
      // Another click won the race. Reload and never send a second payment-confirmation email.
      order = await db.get("order:" + id);
      if (!order || order.status !== "paid") {
        return page(409, pageShell("Please retry", "<p>This order changed while you were confirming it. Please reload this page.</p>"));
      }
    }
  }
  return page(200, await confirmPageHtml(id, s, order, justConfirmed));
}

// ---------- API ----------

// ---------- Rate limiting (per client IP, per hour) ----------
// The IP is hashed with the secret before it is stored, so no raw IP addresses are kept.
async function clientKey(event) {
  const h = event.headers || {};
  // CF-Connecting-IP is set by Cloudflare at the edge. Do not trust client-controlled X-Forwarded-For.
  const ip = String(h["cf-connecting-ip"] || h["CF-Connecting-IP"] || "unknown").trim().slice(0, 64);
  return (await hmacHex(SECRET, ip)).slice(0, 32);
}

// Returns true if this request is allowed. The etag check makes sure two requests cannot both slip past the limit.
async function allowRequest(db, bucket, max, clientId) {
  const hour = Math.floor(Date.now() / 3600000);
  const key = "rl:" + bucket + ":" + clientId + ":" + hour;
  const found = await db.getWithMetadata(key);
  const count = found && found.data ? Number(found.data.count) || 0 : 0;
  if (count >= max) return false;
  const next = { count: count + 1 };
  const res = found
    ? await db.setJSON(key, next, { onlyIfMatch: found.etag })
    : await db.setJSON(key, next, { onlyIfNew: true });
  if (Math.random() < 0.02) await db.purgeRateLimits(3 * 3600000); // tidy old counters now and then
  return !(res && res.modified === false);
}

// Email must look like an address and be short. Anything else is stored without an email, so nothing is sent.
function cleanEmail(v) {
  const e = clean(v, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

const handle = async (event) => {
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
    const form = new URLSearchParams(event.body || "");
    if (form.get("do") === "confirm") return confirmSubmit(form.get("id"), form.get("s"));
    return page(400, pageShell("Bad request", "<p>Bad request.</p>"));
  }

  const b = parseBody(event);
  if (!b || typeof b !== "object") return json(400, { ok: false, message: "Bad request" });
  const db = await store();

  const clientId = await clientKey(event);
  const limit = b.action === "createOrder" ? ["orders", RL_ORDERS]
    : b.action === "check" ? ["check", RL_CHECK]
    : ["api", RL_OTHER];
  const allowed = await allowRequest(db, limit[0], limit[1], clientId);
  if (!allowed) {
    logEvent("rate_limited", { bucket: limit[0] });
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

      const existing = await db.get("order:" + id);
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
        codeFound = await db.getWithMetadata(codeKey);
        if (!codeFound || !codeFound.data) return json(200, { ok: false, message: "This reward code is not valid." });
        if (codeFound.data.status !== "unused" && codeFound.data.orderId !== id) {
          return json(200, { ok: false, message: "This reward code has already been used." });
        }
        discount = Math.min(money(codeFound.data.amount) || AMOUNT, cakeTotal);
      }

      const payable = Math.max(0, cakeTotal - discount) + delivery;
      if (!Number.isSafeInteger(payable) || payable > MAX_TOTAL) {
        return json(400, { ok: false, message: "This order is above the online order limit. Please contact us on WhatsApp." });
      }
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
        address: clean(b.address, 300), slot: clean(b.slot, 60), message: clean(b.message, 120), notes: clean(b.notes, 300),
      };
      try {
        await db.setJSON("order:" + id, order);
      } catch (err) {
        // The order was not saved, so give the reward code back (only if this request had just used it).
        if (codeFound && codeFound.data.status === "unused") {
          try {
            const cur = await db.getWithMetadata(codeKey);
            if (cur && cur.data && cur.data.status === "used" && cur.data.orderId === id) {
              await db.setJSON(codeKey, { ...codeFound.data }, { onlyIfMatch: cur.etag });
            }
          } catch (e) { /* best effort */ }
        }
        throw err;
      }
      logEvent("order_created", { id, total: payable, discount, items: order.items ? order.items.length : undefined });
      const link = await confirmUrl(id);
      await notifyOwner(order, link);
      await sendEmail(ENV.OWNER_EMAIL, "Owner", "New order " + id + " from " + order.name, ownerOrderEmail(order, link));
      // The customer email goes to whatever address was typed, so cap it per address. Otherwise the order form
      // could be used to send unwanted mail to someone else's inbox. The order itself is saved either way.
      if (order.email) {
        const mailKey = (await hmacHex(SECRET, "mail:" + order.email.toLowerCase())).slice(0, 32);
        if (await allowRequest(db, "mail", RL_MAIL, mailKey)) {
          await sendEmail(order.email, order.name, "Order " + id + " received", orderReceivedEmail(order));
        }
      }
      return json(200, { ok: true, total: payable, discount });
    }

    /* Feedback page asks: is this link valid, and is the order paid? */
    case "feedbackInfo": {
      const id = normOrder(b.orderId);
      if (!ORDER_RE.test(id) || !(await tokenOk("feedback", id, b.token))) return json(200, { ok: false, message: "This feedback link is not valid." });
      const order = await db.get("order:" + id);
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
      if (!ORDER_RE.test(id) || !(await tokenOk("feedback", id, b.token))) return json(200, { ok: false, message: "This feedback link is not valid." });
      const found = await db.getWithMetadata("order:" + id);
      if (!found || found.data.status !== "paid") return json(200, { ok: false, message: "Your order is not confirmed yet." });
      if (found.data.rewardCode) return json(200, { ok: true, code: found.data.rewardCode, existing: true });

      const rating = Number(b.rating);
      if (!(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return json(200, { ok: false, message: "Please select a star rating." });

      // Reserve a unique code, then atomically claim the order using its etag.
      // If another request wins, discard this unused code and return the winner's code.
      let code = "", reserved = false;
      for (let attempt = 0; attempt < 5 && !reserved; attempt++) {
        code = makeCode();
        const reservation = await db.setJSON("code:" + code, { status: "unused", orderId: id, phone: found.data.phone, amount: AMOUNT, createdAt: now() }, { onlyIfNew: true });
        reserved = !!(reservation && reservation.modified);
      }
      if (!reserved) return json(503, { ok: false, message: "We could not issue your reward right now. Please try again." });

      const order = found.data;
      const updatedOrder = {
        ...order,
        rewardCode: code,
        feedback: {
          rating, text: clean(b.feedback, 1000), occasion: clean(b.occasion, 80), date: clean(b.date, 20),
          recipient: clean(b.recipient, 60), relation: clean(b.relation, 60), submittedAt: now(),
        },
      };
      const saved = await db.setJSON("order:" + id, updatedOrder, { onlyIfMatch: found.etag });
      if (!saved || !saved.modified) {
        await db.delete("code:" + code);
        const latest = await db.get("order:" + id);
        if (latest && latest.rewardCode) return json(200, { ok: true, code: latest.rewardCode, existing: true });
        return json(409, { ok: false, message: "Your order changed while submitting feedback. Please try again." });
      }

      await sendEmail(ENV.OWNER_EMAIL, "Owner", "Feedback for order " + id + " (" + rating + " stars)",
        `<div style="font-family:Arial,sans-serif;color:#3b2a24;line-height:1.5"><h2 style="margin:0 0 .4rem">Feedback for order ${esc(id)}</h2><ul><li><b>Name:</b> ${esc(order.name)}</li><li><b>Rating:</b> ${esc(rating)} of 5</li><li><b>Occasion:</b> ${esc(clean(b.occasion, 80) || "-")}</li><li><b>Feedback:</b> ${esc(clean(b.feedback, 1000) || "-")}</li><li><b>Reward code issued:</b> ${esc(code)}</li></ul></div>`);
      logEvent("reward_issued", { id });
      return json(200, { ok: true, code });
    }
    /* Checkout: is this reward code usable? (read only) */
    case "check": {
      const code = normCode(b.code);
      if (!CODE_RE.test(code)) return json(200, { valid: false, message: "This code is not valid." });
      const rec = await db.get("code:" + code);
      if (!rec) return json(200, { valid: false, message: "This code is not valid." });
      if (rec.status !== "unused") return json(200, { valid: false, message: "This code has already been used." });
      return json(200, { valid: true, amount: rec.amount || AMOUNT });
    }

    /* Removed: this action could mark any reward code as used without proof of ownership.
       Old browser copies get a clear message; the current checkout uses createOrder. */
    case "redeem":
      return json(200, { ok: false, message: "Please refresh the page to use the latest version of the site." });

    default:
      return json(400, { ok: false, message: "Unknown action" });
  }
};

// Exposed for tests only
export const _security = { cleanEmail, clientKey, allowRequest, configure, store };
export const _pricing = { priceCart, CAKE_PER_LB, CAKE_NAMES, QUOTE_ITEMS, QUOTE_NAMES, MAX_LB, MAX_QTY, lbKey };

// Safety net: any unexpected error (for example, the D1 database not being bound) returns a clear JSON
// message instead of a raw 500. Only the error name is logged, never secrets or customer data.
export async function handler(event, env) {
  configure(env);
  try {
    return await handle(event);
  } catch (err) {
    console.error("rewards: unexpected error", err && err.name);
    return json(500, { ok: false, message: "Something went wrong on our side. Please try again, or message us on WhatsApp." });
  }
}

const MAX_BODY = 65536; // bytes. An order is a few KB.

async function readBodyLimited(request, maxBytes) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  let body = "";
  if (request.method === "POST") {
    const origin = headers["origin"];
    if (origin) {
      // A browser always sends Origin on a cross-site POST. Only our own site may call this API.
      let sameSite = false;
      try { sameSite = new URL(origin).host === url.host; } catch (e) { /* bad Origin header */ }
      if (!sameSite) return new Response('{"ok":false,"message":"Forbidden"}', { status: 403, headers: JSON_HEADERS });
    }
    if (Number(headers["content-length"] || 0) > MAX_BODY) return new Response('{"ok":false,"message":"Request too large"}', { status: 413, headers: JSON_HEADERS });
    const contentType = String(headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("application/json") && !contentType.includes("application/x-www-form-urlencoded")) {
      return new Response('{"ok":false,"message":"Unsupported content type"}', { status: 415, headers: JSON_HEADERS });
    }
    try {
      body = await readBodyLimited(request, MAX_BODY);
    } catch (err) {
      if (err && err.message === "REQUEST_BODY_TOO_LARGE") return new Response('{"ok":false,"message":"Request too large"}', { status: 413, headers: JSON_HEADERS });
      throw err;
    }
  }
  const res = await handler({ httpMethod: request.method, headers, body, queryStringParameters: Object.fromEntries(url.searchParams) }, env);
  return new Response(res.body, { status: res.statusCode, headers: res.headers });
}
