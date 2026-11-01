// Behaviour tests for netlify/functions/rewards.js. No network, no Netlify account needed:
// @netlify/blobs is replaced by an in-memory store. Run: npm test
const Module = require("module");
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const mem = new Map();
let etagN = 0;
const mockBlobs = {
  getStore() {
    return {
      async get(k) { const r = mem.get(k); return r ? JSON.parse(r.raw) : null; },
      async getWithMetadata(k) { const r = mem.get(k); return r ? { data: JSON.parse(r.raw), etag: r.etag } : null; },
      async setJSON(k, v, opts) {
        const cur = mem.get(k);
        if (opts && opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
        if (opts && opts.onlyIfNew && cur) return { modified: false };
        mem.set(k, { raw: JSON.stringify(v), etag: "e" + (++etagN) });
        return { modified: true };
      },
    };
  },
};
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === "@netlify/blobs") return mockBlobs;
  return origLoad.call(this, req, ...rest);
};

process.env.REWARDS_SECRET = "test-secret-0123456789012345678901234567890123";
// Real limits are per client per hour. The tests make many calls from one (unknown) client, so raise them here.
// The rate-limit behaviour itself is tested directly below with allowRequest().
process.env.RATE_LIMIT_ORDERS = "1000";
process.env.RATE_LIMIT_OTHER = "1000";
const { handler, _pricing, _security } = require("../netlify/functions/rewards.js");

const sign = (kind, id) => crypto.createHmac("sha256", process.env.REWARDS_SECRET).update(kind + ":" + id).digest("hex").slice(0, 24);
const post = (body) => handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const parse = (r) => JSON.parse(r.body);
const get = (qs) => handler({ httpMethod: "GET", queryStringParameters: qs });
const form = (f) => handler({ httpMethod: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(f).toString() });
const stored = (k) => JSON.parse(mem.get(k).raw);

// Cart used by most tests: Red Velvet 1 lb (575) + Pineapple 2 lb (750) = 1325 for cakes
const CART = [
  { id: "red-velvet", size: "1 lb (500 g)", qty: 1 },
  { id: "pineapple", size: "2 lb (1 kg)", qty: 1 },
];
const seedCode = (code, orderId, amount = 50) =>
  mem.set("code:" + code, { raw: JSON.stringify({ status: "unused", orderId, amount }), etag: "seed-" + code });

let pass = 0;
const ok = (name) => { pass++; console.log("PASS", name); };

(async () => {
  // ---- Pricing sync with the site catalog ----
  // The catalog lives in the site's external JS (inline scripts were moved out for the strict CSP)
  const html = fs.readdirSync(path.join(__dirname, "..", "site", "js"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(path.join(__dirname, "..", "site", "js", f), "utf8"))
    .find((t) => t.indexOf("var CATALOG = {") !== -1);
  const st = html.indexOf("var CATALOG = {") + "var CATALOG = ".length;
  const catalog = JSON.parse(html.slice(st, html.indexOf("\n};", st) + 2));
  for (const p of catalog.products) {
    if (p.kind === "cake") {
      assert.strictEqual(_pricing.CAKE_PER_LB[p.id], p.perLb, "rate mismatch for " + p.id);
      assert.strictEqual(_pricing.CAKE_NAMES[p.id], p.name, "name mismatch for " + p.id);
    } else {
      assert.deepStrictEqual(_pricing.QUOTE_ITEMS[p.id], Object.keys(p.sizes), "sizes mismatch for " + p.id);
    }
  }
  assert.strictEqual(Object.keys(_pricing.CAKE_PER_LB).length, catalog.products.filter((p) => p.kind === "cake").length);
  ok("server price list matches the site catalog (rates, names, party and bundle sizes)");

  // ---- Valid order: server prices the cart ----
  seedCode("RWD-AAAAAA", "ORD-SEED00");
  let r = parse(await post({ action: "createOrder", orderId: "ORD-AAAAAA", phone: "9459755408", name: "Test", items: CART, delivery: 20, total: 1295, rewardCode: "RWD-AAAAAA", payment: "50%" }));
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(r.discount, 50);
  assert.strictEqual(r.total, 1295);
  assert.strictEqual(stored("order:ORD-AAAAAA").total, 1295);
  assert.strictEqual(stored("code:RWD-AAAAAA").status, "used");
  ok("valid cart: server computes 575 + 750 - 50 reward + 20 delivery = 1295, code burned once");

  // ---- Browser total is checked, not trusted ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-BBBBBB", phone: "9459755408", items: CART, delivery: 20, total: 10 }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(mem.get("order:ORD-BBBBBB"), undefined);
  ok("wrong total from the browser is rejected, no order saved");

  // ---- Client cannot send prices: extra price fields are ignored ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-CCCCCC", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1, amount: 1, perLb: 1 }], delivery: 0, total: 575 }));
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(stored("order:ORD-CCCCCC").total, 575);
  ok("price fields sent by the browser are ignored (line priced 575, not 1)");

  // ---- Tampered quantity and weight are rejected ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-DDDDDD", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 0 }], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false);
  r = parse(await post({ action: "createOrder", orderId: "ORD-DDDDDD", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 21 }], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false);
  r = parse(await post({ action: "createOrder", orderId: "ORD-DDDDDD", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1.5 }], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false);
  r = parse(await post({ action: "createOrder", orderId: "ORD-DDDDDD", phone: "9459755408", items: [{ id: "red-velvet", size: "4 lb (1 kg)", qty: 1 }], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false, "wrong grams for the weight must be rejected");
  r = parse(await post({ action: "createOrder", orderId: "ORD-DDDDDD", phone: "9459755408", items: [{ id: "red-velvet", size: "11 lb (5.5 kg)", qty: 1 }], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false, "above 10 lb must be rejected");
  assert.strictEqual(mem.get("order:ORD-DDDDDD"), undefined);
  ok("quantity 0, 21, 1.5, wrong grams and 11 lb are all rejected");

  // ---- Unknown product is rejected ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-EEEEEE", phone: "9459755408", items: [{ id: "free-cake", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false);
  ok("unknown product id is rejected");

  // ---- 4 lb and 10 lb priced by the + button rule ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-FFFFFF", phone: "9459755408", items: [{ id: "red-velvet", size: "4 lb (2 kg)", qty: 1 }], delivery: 0, total: 2300 }));
  assert.strictEqual(r.ok, true, r.message);
  r = parse(await post({ action: "createOrder", orderId: "ORD-GGGGGG", phone: "9459755408", items: [{ id: "vanilla", size: "10 lb (5 kg)", qty: 2 }], delivery: 0, total: 7500 }));
  assert.strictEqual(r.ok, true, r.message);
  ok("4 lb Red Velvet = 2300; 10 lb Vanilla x2 = 7500 (375 per lb)");

  // ---- Quote items (party and bundles) add 0 and are kept as text ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-HHHHHH", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1 }, { id: "candles", size: "Pack of 12", qty: 2, opt: "" }], delivery: 0, total: 575 }));
  assert.strictEqual(r.ok, true, r.message);
  assert.match(stored("order:ORD-HHHHHH").extras, /Candles \(Pack of 12\) x2/);
  ok("party item priced on WhatsApp: adds 0 to the payable total, shows in the order text");

  // ---- Delivery range ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-IIIIII", phone: "9459755408", items: CART, delivery: 500, total: 1825 }));
  assert.strictEqual(r.ok, false);
  r = parse(await post({ action: "createOrder", orderId: "ORD-IIIIII", phone: "9459755408", items: CART, delivery: -5, total: 1320 }));
  assert.strictEqual(r.ok, false);
  ok("delivery above Rs 110 or negative is rejected");

  // ---- Cart empty or too large ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-JJJJJJ", phone: "9459755408", items: [], delivery: 0, total: 0 }));
  assert.strictEqual(r.ok, false);
  ok("empty cart is rejected");

  // ---- Reward rules ----
  seedCode("RWD-BBBBBB", "ORD-SEED01");
  r = parse(await post({ action: "createOrder", orderId: "ORD-KKKKKK", phone: "9459755408", items: CART, delivery: 0, total: 1275, rewardCode: "RWD-BBBBBB" }));
  assert.strictEqual(r.ok, true, r.message);
  r = parse(await post({ action: "createOrder", orderId: "ORD-LLLLLL", phone: "9459755408", items: CART, delivery: 0, total: 1275, rewardCode: "RWD-BBBBBB" }));
  assert.strictEqual(r.ok, false, "reused code must fail");
  assert.strictEqual(mem.get("order:ORD-LLLLLL"), undefined);
  ok("a reward code works once; the second order with it is rejected");

  seedCode("RWD-CCCCCC", "ORD-SEED02", 500);
  r = parse(await post({ action: "createOrder", orderId: "ORD-MMMMMM", phone: "9459755408", items: [{ id: "vanilla", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 0, rewardCode: "RWD-CCCCCC" }));
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(r.discount, 375, "discount cannot exceed the cake total (Vanilla 1 lb = 375)");
  assert.strictEqual(r.total, 0);
  assert.strictEqual(stored("code:RWD-CCCCCC").status, "used");
  ok("a reward larger than the cakes is capped at the cake total (375 off, payable 0)");

  seedCode("RWD-DDDDDD", "ORD-SEED03");
  r = parse(await post({ action: "createOrder", orderId: "ORD-PPPPPP", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 525, rewardCode: "RWD-DDDDDD" }));
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(r.discount, 50);
  ok("Red Velvet 1 lb with a Rs 50 code = 525 payable");

  // Tampered total with a code: code must NOT be burned
  seedCode("RWD-EEEEEE", "ORD-SEED04");
  r = parse(await post({ action: "createOrder", orderId: "ORD-OOOOOO", phone: "9459755408", items: CART, delivery: 0, total: 999, rewardCode: "RWD-EEEEEE" }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(stored("code:RWD-EEEEEE").status, "unused");
  ok("a rejected order does not burn the reward code");

  // Retry of an order that already saved: same order id returns ok
  r = parse(await post({ action: "createOrder", orderId: "ORD-AAAAAA", phone: "9459755408", items: CART, delivery: 20, total: 1295, rewardCode: "RWD-AAAAAA" }));
  assert.strictEqual(r.ok, true);
  ok("retry of a saved order returns ok without a second burn");

  // ---- Owner confirm: GET shows, only POST marks paid ----
  const id = "ORD-AAAAAA";
  const q = { action: "confirm", id, s: sign("confirm", id) };
  let res = await get(q);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(stored("order:" + id).status, "pending");
  assert.ok(res.body.includes('name="do" value="confirm"'));
  assert.ok(!res.body.includes("wa.me"));
  ok("GET confirm link shows the order and changes nothing");

  res = await form({ do: "confirm", id, s: "deadbeef" });
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(stored("order:" + id).status, "pending");
  ok("POST with a forged token is rejected");

  res = await form({ do: "confirm", id, s: sign("confirm", id) });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(stored("order:" + id).status, "paid");
  assert.ok(res.body.includes("wa.me/919459755408"));
  ok("owner button marks the order paid and shows the feedback WhatsApp link");

  // ---- Feedback: one code per paid order ----
  const fbT = sign("feedback", id);
  r = parse(await post({ action: "feedbackInfo", orderId: id, token: fbT }));
  assert.strictEqual(r.ok, true);
  r = parse(await post({ action: "feedbackSubmit", orderId: id, token: fbT, rating: 5, feedback: "Great cake" }));
  assert.strictEqual(r.ok, true);
  assert.match(r.code, /^RWD-[A-Z2-9]{6}$/);
  r = parse(await post({ action: "feedbackSubmit", orderId: id, token: fbT, rating: 5 }));
  assert.strictEqual(r.existing, true);
  ok("feedback issues exactly one reward code per paid order");

  // ---- Email validation: bad addresses are stored without an email, so nothing is sent ----
  assert.strictEqual(_security.cleanEmail("a@b.co"), "a@b.co");
  assert.strictEqual(_security.cleanEmail("victim@x"), "");
  assert.strictEqual(_security.cleanEmail("a@b.c\r\nBcc: spam@evil.com"), "");
  assert.strictEqual(_security.cleanEmail("x".repeat(130) + "@a.com"), "");
  r = parse(await post({ action: "createOrder", orderId: "ORD-QQQQQQ", phone: "9459755408", email: "not an email", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 575 }));
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(stored("order:ORD-QQQQQQ").email, "");
  ok("invalid or header-injection email is not stored, so no email is sent");

  // ---- Rate limit: allowRequest stops after the limit, per client; client ids are hashed ----
  const ipA = _security.clientKey({ headers: { "x-nf-client-connection-ip": "203.0.113.7" } });
  const ipB = _security.clientKey({ headers: { "x-nf-client-connection-ip": "198.51.100.9" } });
  assert.strictEqual(ipA.length, 32);
  assert.ok(!ipA.includes("203.0.113.7"), "raw IP must not appear in the key");
  assert.notStrictEqual(ipA, ipB);
  const db = mockBlobs.getStore();
  assert.strictEqual(await _security.allowRequest(db, "test", 2, ipA), true);
  assert.strictEqual(await _security.allowRequest(db, "test", 2, ipA), true);
  assert.strictEqual(await _security.allowRequest(db, "test", 2, ipA), false, "third request in the window must be refused");
  assert.strictEqual(await _security.allowRequest(db, "test", 2, ipB), true, "another client is not affected");
  ok("rate limit refuses the 3rd request from one client; other clients are unaffected; raw IP is never stored");

  // ---- Attacker-style inputs: nothing crashes, nothing leaks a stack trace ----
  const weird = [
    "null", "[]", "42", '"text"', "{}",
    JSON.stringify({ action: ["createOrder"] }),
    JSON.stringify({ action: "createOrder", orderId: ["ORD-AAAAAA"], phone: { x: 1 }, items: "not-a-list", total: "abc" }),
    JSON.stringify({ action: "createOrder", orderId: "ORD-ZZZZZZ", phone: "9459755408", items: [{ id: "__proto__", size: "constructor", qty: 1 }], total: 0 }),
    JSON.stringify({ action: "createOrder", orderId: "ORD-ZZZZZZ", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1e308 }], total: 0 }),
    JSON.stringify({ action: "check", code: { toString() { return "x"; } } }),
    JSON.stringify({ action: "feedbackSubmit", orderId: "ORD-ZZZZZZ", token: "x", rating: "5<script>" }),
    JSON.stringify({ action: "createOrder", orderId: "ORD-YYYYYY", phone: "9459755408", name: "<img src=x onerror=alert(1)>\u0000\u0007", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 575 }),
  ];
  for (const body of weird) {
    const res = await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body });
    assert.ok(res.statusCode < 500, "server error for input: " + body.slice(0, 60) + " -> " + res.statusCode);
    assert.ok(!/at .*\.js:\d+|Error:|stack/i.test(res.body), "stack trace leaked for: " + body.slice(0, 60));
  }
  const stripped = stored("order:ORD-YYYYYY").name;
  assert.ok(!/[\u0000-\u001f]/.test(stripped), "control characters must be removed from names");
  ok("8 hostile inputs (wrong types, prototype keys, huge numbers, HTML, control chars) return clean errors");

  // ---- Unknown action and wrong method ----
  assert.strictEqual((await handler({ httpMethod: "PUT", body: "{}" })).statusCode, 405);
  assert.notStrictEqual(parse(await post({ action: "nope" })).ok, true);
  ok("unknown action and wrong method are handled");

  console.log(`\nAll ${pass} checks passed.`);
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
