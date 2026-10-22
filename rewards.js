// Whisk & Wonder Cakes: orders, payment confirmation, feedback and reward codes.
// One function file. Browser calls it with POST { action, ... }.
// Owner confirms payment through a signed link (GET ?action=confirm&id=..&s=..).
//
// Environment variables (Netlify > Site settings > Environment variables):
//   REWARDS_SECRET   long random text, keep secret (e.g. 40+ random characters)
//   NTFY_TOPIC       your ntfy topic, for phone alerts
//   REWARD_AMOUNT    optional, rupees off per reward code (default 50)
//   SITE_URL         optional, default https://www.whiskandwondercakes.in
//   OWNER_NAME       optional, shown on the confirm page
const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
const AMOUNT = Number(process.env.REWARD_AMOUNT || 50);
const SITE = (process.env.SITE_URL || "https://www.whiskandwondercakes.in").replace(/\/$/, "");
const SECRET = process.env.REWARDS_SECRET || "";
const ORDER_RE = /^ORD-[A-Z2-9]{6}$/;
const CODE_RE = /^RWD-[A-Z2-9]{6}$/;

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (statusCode, body) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) });
const page = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  body,
});

const store = () => getStore("rewards");
const now = () => new Date().toISOString();
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normCode = (v) => String(v || "").trim().toUpperCase();
const normOrder = (v) => String(v || "").trim().toUpperCase();
const normPhone = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : ""; };

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

async function notifyOwner(order) {
  if (!process.env.NTFY_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: "POST",
      headers: { Title: "New order " + order.id, Priority: "high", Click: confirmUrl(order.id) },
      body: `${order.name} | ${order.phone} | Rs ${order.total} | ${order.date}\n${order.cakes}\nTap to confirm payment`,
    });
  } catch (e) { /* alert failed, the order is still saved */ }
}

exports.handler = async (event) => {
  if (!SECRET) {
    return event.httpMethod === "GET"
      ? page(500, "<p>Server not configured (REWARDS_SECRET missing).</p>")
      : json(500, { ok: false, message: "Server not configured." });
  }

  // Owner confirm link
  if (event.httpMethod === "GET") {
    const q = event.queryStringParameters || {};
    if (q.action === "confirm") return confirmPage(q);
    return page(404, "<p>Not found.</p>");
  }
  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed" });

  const b = parseBody(event);
  if (!b) return json(400, { ok: false, message: "Bad request" });
  const db = store();

  switch (b.action) {
    /* Called when the customer places an order. Order starts as "pending". */
    case "createOrder": {
      const id = normOrder(b.orderId);
      const phone = normPhone(b.phone);
      if (!ORDER_RE.test(id) || !phone) return json(400, { ok: false, message: "Invalid order" });
      if (await db.get("order:" + id, { type: "json" })) return json(200, { ok: true });
      const order = {
        id, status: "pending", name: clean(b.name, 60), phone,
        total: Math.max(0, Number(b.total) || 0), discount: Math.max(0, Number(b.discount) || 0),
        cakes: clean(b.cakes, 300), extras: clean(b.extras, 300), date: clean(b.date, 20),
        payment: clean(b.payment, 80), createdAt: now(),
      };
      await db.setJSON("order:" + id, order);
      await notifyOwner(order);
      return json(200, { ok: true });
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

    /* Checkout: mark code used, once. Etag stops two orders using it at the same time. */
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

/* Owner taps this from ntfy/phone: marks order paid and gives the WhatsApp link to send the customer */
async function confirmPage(q) {
  const id = normOrder(q.id);
  if (!ORDER_RE.test(id) || !tokenOk("confirm", id, q.s)) {
    return page(403, "<p style='font-family:sans-serif'>This confirm link is not valid.</p>");
  }
  const db = store();
  const order = await db.get("order:" + id, { type: "json" });
  if (!order) return page(404, "<p style='font-family:sans-serif'>Order not found.</p>");

  let justConfirmed = false;
  if (order.status !== "paid") {
    order.status = "paid";
    order.paidAt = now();
    await db.setJSON("order:" + id, order);
    justConfirmed = true;
  }

  const msg = `Hi ${order.name || ""}, thank you for your order ${id} from Whisk & Wonder Cakes! Your payment is confirmed. Please share your celebration feedback here (takes 1 minute) and get a reward code for your next order: ${feedbackUrl(id)}`;
  const waLink = `https://wa.me/91${order.phone}?text=${encodeURIComponent(msg)}`;

  return page(200, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Confirm order ${esc(id)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:2rem auto;padding:0 1rem;color:#3b2a24;line-height:1.5">
<h2 style="margin-bottom:.2rem">Order ${esc(id)}</h2>
<p style="margin-top:0;color:${justConfirmed ? "#2f6b3a" : "#6b5a52"}">${justConfirmed ? "Payment marked as confirmed." : "Already confirmed earlier."}</p>
<ul>
<li><b>Name:</b> ${esc(order.name)}</li>
<li><b>Phone:</b> ${esc(order.phone)}</li>
<li><b>Cakes:</b> ${esc(order.cakes || "-")}</li>
<li><b>Bundles / party:</b> ${esc(order.extras || "-")}</li>
<li><b>Date:</b> ${esc(order.date || "-")}</li>
<li><b>Payable:</b> Rs ${esc(order.total)}${order.discount ? " (reward Rs " + esc(order.discount) + " applied)" : ""}</li>
<li><b>Payment:</b> ${esc(order.payment || "-")}</li>
${order.rewardCode ? `<li><b>Feedback done, code:</b> ${esc(order.rewardCode)}</li>` : ""}
</ul>
<p><a href="${waLink}" style="display:inline-block;background:#c9a441;color:#2a1d18;padding:.8rem 1.1rem;border-radius:999px;text-decoration:none;font-weight:600">Send feedback link to customer on WhatsApp</a></p>
<p style="font-size:.85rem;color:#6b5a52">The link opens the feedback form for this order only. The customer gets a reward code after submitting it. Do not share this page.</p>
</body></html>`);
}
