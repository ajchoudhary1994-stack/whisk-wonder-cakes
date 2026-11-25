// Behaviour tests for functions/api/rewards.js (Cloudflare Pages Function). No network, no Cloudflare account needed:
// D1 is replaced by in-memory SQLite. Run: npm test (needs Node 22 or newer)
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { DatabaseSync } = require("node:sqlite");

// The function stores everything in Cloudflare D1. Here a real in-memory SQLite database stands in for D1:
// the same SQL runs, so the atomic etag checks are tested for real.
const sqlite = new DatabaseSync(":memory:");
const d1 = {
  prepare(sql) {
    const st = sqlite.prepare(sql);
    let args = [];
    const o = {
      bind(...a) { args = a; return o; },
      async run() { const r = st.run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
      async first() { return st.get(...args) || null; },
    };
    return o;
  },
};
const SECRET = "test-secret-0123456789012345678901234567890123";
// Real limits are per client per hour. The tests make many calls from one (unknown) client, so raise them here.
// The rate-limit behaviour itself is tested directly below with allowRequest().
const ENVV = { REWARDS_SECRET: SECRET, RATE_LIMIT_ORDERS: "1000", RATE_LIMIT_OTHER: "1000", DB: d1 };
let mod, handler, _pricing, _security;
const call = (ev) => handler(ev, ENVV);

const sign = (kind, id) => crypto.createHmac("sha256", SECRET).update(kind + ":" + id).digest("hex").slice(0, 24);
const post = (body) => call({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const parse = (r) => JSON.parse(r.body);
const get = (qs) => call({ httpMethod: "GET", queryStringParameters: qs });
const form = (f) => call({ httpMethod: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(f).toString() });
const stored = (k) => JSON.parse(sqlite.prepare("SELECT v FROM kv WHERE k = ?").get(k).v);
const exists = (k) => !!sqlite.prepare("SELECT 1 AS x FROM kv WHERE k = ?").get(k);

// Cart used by most tests: Red Velvet 1 lb (575) + Pineapple 2 lb (750) = 1325 for cakes
const CART = [
  { id: "red-velvet", size: "1 lb (500 g)", qty: 1 },
  { id: "pineapple", size: "2 lb (1 kg)", qty: 1 },
];
const seedCode = (code, orderId, amount = 50) =>
  sqlite.prepare("INSERT INTO kv (k, v, etag, t) VALUES (?, ?, 1, ?)").run("code:" + code, JSON.stringify({ status: "unused", orderId, amount }), Date.now());

let pass = 0;
const ok = (name) => { pass++; console.log("PASS", name); };

(async () => {
  const tmp = path.join(os.tmpdir(), "rewards-under-test-" + process.pid + ".mjs");
  fs.writeFileSync(tmp, fs.readFileSync(path.join(__dirname, "..", "functions", "api", "rewards.js"), "utf8"));
  mod = await import(pathToFileURL(tmp).href);
  ({ handler, _pricing, _security } = mod);
  fs.unlinkSync(tmp);
  await post({ action: "check", code: "RWD-ZZZZZZ" }); // creates the table, like the first real request does

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
  assert.strictEqual(exists("order:ORD-BBBBBB"), false);
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
  assert.strictEqual(exists("order:ORD-DDDDDD"), false);
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

  // Server-side order cap must be enforced even when the browser sends a matching total.
  r = parse(await post({ action: "createOrder", orderId: "ORD-CAPAAA", phone: "9459755408", items: [
    { id: "red-velvet", size: "10 lb (5 kg)", qty: 20 },
    { id: "red-velvet", size: "10 lb (5 kg)", qty: 20 },
  ], delivery: 0, total: 230000 }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(exists("order:ORD-CAPAAA"), false);
  ok("server rejects payable totals above MAX_TOTAL even when the client total matches");

  // ---- Reward rules ----
  seedCode("RWD-BBBBBB", "ORD-SEED01");
  r = parse(await post({ action: "createOrder", orderId: "ORD-KKKKKK", phone: "9459755408", items: CART, delivery: 0, total: 1275, rewardCode: "RWD-BBBBBB" }));
  assert.strictEqual(r.ok, true, r.message);
  r = parse(await post({ action: "createOrder", orderId: "ORD-LLLLLL", phone: "9459755408", items: CART, delivery: 0, total: 1275, rewardCode: "RWD-BBBBBB" }));
  assert.strictEqual(r.ok, false, "reused code must fail");
  assert.strictEqual(exists("order:ORD-LLLLLL"), false);
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
  assert.ok(res.body.includes(encodeURIComponent("https://www.whiskandwondercakes.in/?feedback=" + id + "&t=" + sign("feedback", id))), "WhatsApp message must carry the real signed feedback link");
  ok("owner button marks the order paid and shows the feedback WhatsApp link");
  assert.strictEqual(res.headers["Referrer-Policy"], "no-referrer");
  assert.ok(res.headers["Content-Security-Policy"].includes("frame-ancestors 'none'"));

  // Concurrent owner clicks must only transition pending -> paid once.
  await (await _security.store()).setJSON("order:ORD-PAYRAC", { id: "ORD-PAYRAC", status: "pending", name: "Race", phone: "9459755408", total: 575 });
  const payRace = await Promise.all([
    form({ do: "confirm", id: "ORD-PAYRAC", s: sign("confirm", "ORD-PAYRAC") }),
    form({ do: "confirm", id: "ORD-PAYRAC", s: sign("confirm", "ORD-PAYRAC") }),
  ]);
  assert.ok(payRace.every((x) => x.statusCode === 200));
  assert.strictEqual(stored("order:ORD-PAYRAC").status, "paid");
  ok("two simultaneous owner confirmations result in one atomic payment-state transition");

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

  // Concurrent feedback submissions must not issue two reward codes for one paid order.
  await (await _security.store()).setJSON("order:ORD-FBRACE", { id: "ORD-FBRACE", status: "paid", name: "Race", phone: "9459755408" });
  const fbRace = await Promise.all([
    post({ action: "feedbackSubmit", orderId: "ORD-FBRACE", token: sign("feedback", "ORD-FBRACE"), rating: 5, feedback: "First" }),
    post({ action: "feedbackSubmit", orderId: "ORD-FBRACE", token: sign("feedback", "ORD-FBRACE"), rating: 4, feedback: "Second" }),
  ]);
  const fbResults = fbRace.map(parse);
  assert.ok(fbResults.every((x) => x.ok), JSON.stringify(fbResults));
  assert.strictEqual(fbResults[0].code, fbResults[1].code, "both requests must return the same winning code");
  assert.strictEqual(sqlite.prepare("SELECT COUNT(*) AS n FROM kv WHERE k LIKE 'code:RWD-%' AND json_extract(v, '$.orderId') = 'ORD-FBRACE'").get().n, 1);
  ok("two simultaneous feedback submissions for one paid order issue exactly one reward code");

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
  _security.configure(ENVV);
  const ipA = await _security.clientKey({ headers: { "cf-connecting-ip": "203.0.113.7" } });
  const ipB = await _security.clientKey({ headers: { "cf-connecting-ip": "198.51.100.9" } });
  assert.strictEqual(ipA.length, 32);
  assert.ok(!ipA.includes("203.0.113.7"), "raw IP must not appear in the key");
  assert.notStrictEqual(ipA, ipB);
  const db = await _security.store();
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
    const res = await call({ httpMethod: "POST", headers: { "content-type": "application/json" }, body });
    assert.ok(res.statusCode < 500, "server error for input: " + body.slice(0, 60) + " -> " + res.statusCode);
    assert.ok(!/at .*\.js:\d+|Error:|stack/i.test(res.body), "stack trace leaked for: " + body.slice(0, 60));
  }
  const stripped = stored("order:ORD-YYYYYY").name;
  assert.ok(!/[\u0000-\u001f]/.test(stripped), "control characters must be removed from names");
  ok("8 hostile inputs (wrong types, prototype keys, huge numbers, HTML, control chars) return clean errors");

  // ---- Unknown action and wrong method ----
  assert.strictEqual((await call({ httpMethod: "PUT", body: "{}" })).statusCode, 405);
  assert.notStrictEqual(parse(await post({ action: "nope" })).ok, true);
  ok("unknown action and wrong method are handled");

  // redeem no longer changes any code (it had no proof of ownership)
  assert.notStrictEqual(parse(await post({ action: "redeem", code: "RWD-ABCDEF", orderId: "X" })).ok, true);
  ok("redeem is disabled");

  // ---- New for Cloudflare: two orders racing for one reward code, only one can win ----
  seedCode("RWD-FFFFFF", "ORD-SEED05");
  const mk = (oid) => post({ action: "createOrder", orderId: oid, phone: "9459755408", items: CART, delivery: 0, total: 1275, rewardCode: "RWD-FFFFFF" });
  const race = (await Promise.all([mk("ORD-RACEAA"), mk("ORD-RACEBB")])).map(parse);
  assert.strictEqual(race.filter((x) => x.ok).length, 1, "exactly one of two simultaneous orders may use the code: " + JSON.stringify(race));
  ok("two simultaneous orders with one reward code: exactly one wins (atomic etag check)");

  // ---- Address, slot, message and notes are saved (they used to go to Netlify Forms) ----
  r = parse(await post({ action: "createOrder", orderId: "ORD-RRRRRR", phone: "9459755408", items: [{ id: "red-velvet", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 575, address: "Near Concrete Plant Arla", slot: "4 PM to 8 PM", message: "Happy Birthday Mummy", notes: "Ring the bell" }));
  assert.strictEqual(r.ok, true, r.message);
  const so = stored("order:ORD-RRRRRR");
  assert.strictEqual(so.address, "Near Concrete Plant Arla");
  assert.strictEqual(so.message, "Happy Birthday Mummy");
  ok("address, time slot, cake message and notes are stored with the order");

  // ---- Owner alerts: ntfy and email carry the signed confirm link ----
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { calls.push({ url: String(url), opts }); return { ok: true, status: 200 }; };
  const ENVN = { ...ENVV, OWNER_EMAIL: "owner@example.in", BREVO_API_KEY: "k", BREVO_SENDER_EMAIL: "s@example.in", NTFY_TOPIC: "topic-123", NTFY_TOKEN: "tk_test" };
  try {
    r = parse(await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createOrder", orderId: "ORD-SSSSSS", phone: "9459755408", name: "Asha", items: [{ id: "vanilla", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 375, address: "Arla Palampur" }) }, ENVN));
  } finally { globalThis.fetch = realFetch; }
  assert.strictEqual(r.ok, true, r.message);
  const link = "https://www.whiskandwondercakes.in/api/rewards?action=confirm&id=ORD-SSSSSS&s=" + sign("confirm", "ORD-SSSSSS");
  const nt = calls.find((c) => c.url.includes("ntfy.sh"));
  assert.ok(nt && nt.opts.headers.Click === link, "ntfy alert must open the signed confirm link");
  const em = calls.find((c) => c.url.includes("brevo"));
  assert.ok(em && em.opts.body.includes("api/rewards?action=confirm") && em.opts.body.includes("Arla Palampur"), "owner email has the link and the address");
  assert.strictEqual(nt.opts.headers.Authorization, "Bearer tk_test");
  ok("owner gets an ntfy alert and an email with the signed confirm link and the delivery address");

  // ---- ntfy topic WITHOUT a token: the bearer confirm link must not be published to the topic ----
  {
    const nc = [];
    const rf2 = globalThis.fetch;
    globalThis.fetch = async (url, opts) => { nc.push({ url: String(url), opts }); return { ok: true, status: 200 }; };
    try {
      const res = parse(await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createOrder", orderId: "ORD-NTFYAA", phone: "9459755408", items: [{ id: "vanilla", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 375 }) }, { ...ENVV, NTFY_TOPIC: "topic-123" }));
      assert.strictEqual(res.ok, true, res.message);
    } finally { globalThis.fetch = rf2; }
    const n2 = nc.find((c) => c.url.includes("ntfy.sh"));
    assert.ok(n2, "alert is still sent");
    assert.ok(!n2.opts.headers.Click && !String(n2.opts.body).includes("s="), "no confirm link without NTFY_TOKEN");
    ok("ntfy without NTFY_TOKEN: alert is sent but the signed confirm link is left out");
  }

  // ---- Customer emails are capped per address, so the form cannot be used to mail-bomb someone ----
  {
    const mailCalls = [];
    const rf = globalThis.fetch;
    globalThis.fetch = async (url, opts) => { mailCalls.push({ url: String(url), opts }); return { ok: true, status: 200 }; };
    const ENVM = { ...ENVV, BREVO_API_KEY: "k", BREVO_SENDER_EMAIL: "s@example.in" };
    try {
      for (const oid of ["ORD-MAILA2", "ORD-MAILB2", "ORD-MAILC2", "ORD-MAILD2", "ORD-MAILE2"]) {
        const res = parse(await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createOrder", orderId: oid, phone: "9459755408", name: "Victim Test", email: "victim@example.in", items: [{ id: "vanilla", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 375 }) }, ENVM));
        assert.strictEqual(res.ok, true, res.message);
        assert.strictEqual(exists("order:" + oid), true, "the order is still saved when the email is skipped");
      }
    } finally { globalThis.fetch = rf; }
    const toVictim = mailCalls.filter((c) => c.opts && String(c.opts.body).includes("victim@example.in"));
    assert.strictEqual(toVictim.length, 3, "only 3 emails per address per hour: got " + toVictim.length);
    ok("order emails to one address are capped at 3 per hour; the orders themselves are still saved");
  }

  // ---- A hung email/alert service must not hold up an order: timeout, one retry, order still saved ----
  {
    const rf3 = globalThis.fetch;
    let hung = 0;
    globalThis.fetch = (url, opts) => new Promise((_, reject) => {
      hung++;
      opts.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
    const started = Date.now();
    let res;
    try {
      res = parse(await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createOrder", orderId: "ORD-HUNGAA", phone: "9459755408", items: [{ id: "vanilla", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 375 }) }, { ...ENVV, NTFY_TOPIC: "t", NTFY_TOKEN: "k", BREVO_API_KEY: "k", BREVO_SENDER_EMAIL: "s@example.in", OWNER_EMAIL: "o@example.in", FETCH_TIMEOUT_MS: "60" }));
    } finally { globalThis.fetch = rf3; }
    assert.strictEqual(res.ok, true, res.message);
    assert.ok(Date.now() - started < 3000, "order must return quickly even if third parties hang");
    assert.ok(hung >= 2, "each outbound call is retried once: " + hung);
    assert.strictEqual(exists("order:ORD-HUNGAA"), true, "the order is saved");
    ok("hung ntfy/Brevo calls time out and retry once; the order is still saved and returned quickly");
  }

  // ---- Cloudflare entry point: real Request and Response objects ----
  const viaCf = async (method, body, env = ENVV) => mod.onRequest({ request: new Request("https://example.in/api/rewards", { method, body, headers: { "content-type": "application/json" } }), env });
  let cf = await viaCf("POST", JSON.stringify({ action: "check", code: "RWD-NOPE22" }));
  assert.strictEqual(cf.status, 200);
  assert.strictEqual((await cf.json()).valid, false);
  cf = await viaCf("POST", "x".repeat(70000));
  assert.strictEqual(cf.status, 413, "oversized body must be refused");
  cf = await mod.onRequest({ request: new Request("https://example.in/api/rewards"), env: ENVV });
  assert.strictEqual(cf.status, 404);
  cf = await viaCf("POST", JSON.stringify({ action: "check", code: "RWD-AAAAAA" }), { REWARDS_SECRET: SECRET });
  assert.strictEqual(cf.status, 500);
  const msg = await cf.text();
  assert.ok(/Something went wrong/.test(msg) && !/DB binding|at .*\.js/.test(msg), "missing database gives a clean message, no internals");
  cf = await viaCf("POST", JSON.stringify({ action: "check", code: "RWD-AAAAAA" }), { DB: d1 });
  assert.strictEqual(cf.status, 500, "missing REWARDS_SECRET is refused");
  const wrongType = await mod.onRequest({ request: new Request("https://example.com/api/rewards", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }), env: ENVV });
  assert.strictEqual(wrongType.status, 415);
  const unicodeTooLarge = await mod.onRequest({ request: new Request("https://example.com/api/rewards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ x: "क".repeat(30000) }) }), env: ENVV });
  assert.strictEqual(unicodeTooLarge.status, 413);
  ok("Cloudflare entry point: normal call, byte-based 413, content-type enforcement, 404 for bare GET, clean 500 for missing DB or secret");

  // ---- Cross-site POSTs are refused; same-site and no-Origin calls still work ----
  {
    const post = (origin) => mod.onRequest({ request: new Request("https://shop.example.in/api/rewards", { method: "POST", body: JSON.stringify({ action: "check", code: "RWD-NOPE22" }), headers: Object.assign({ "content-type": "application/json" }, origin ? { origin } : {}) }), env: ENVV });
    assert.strictEqual((await post("https://evil.example.com")).status, 403, "other site must be refused");
    assert.strictEqual((await post("null")).status, 403, "opaque origin must be refused");
    assert.strictEqual((await post("https://shop.example.in")).status, 200, "same origin works");
    assert.strictEqual((await post(undefined)).status, 200, "calls without Origin (server tools) still work");
    const res = await post(undefined);
    assert.ok(/noindex/.test(res.headers.get("x-robots-tag") || ""), "API responses are noindex");
    ok("cross-site and opaque-origin POSTs get 403; same-origin and no-Origin work; API is noindex");
  }

  // ---- Unpaid orders: the owner confirm link expires after 30 days ----
  {
    const id = "ORD-OLDAAA";
    const r = parse(await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createOrder", orderId: id, phone: "9459755408", items: [{ id: "vanilla", size: "1 lb (500 g)", qty: 1 }], delivery: 0, total: 375 }) }, ENVV));
    assert.strictEqual(r.ok, true, r.message);
    const getc = (q) => handler({ httpMethod: "GET", headers: {}, queryStringParameters: q }, ENVV);
    assert.strictEqual((await getc({ action: "confirm", id, s: sign("confirm", id) })).statusCode, 200, "fresh link works");
    const o = stored("order:" + id); assert.strictEqual(typeof o.createdAt, "string", "stored createdAt is an ISO string"); o.createdAt = new Date(Date.now() - 31 * 86400000).toISOString();
    sqlite.prepare("UPDATE kv SET v = ? WHERE k = ?").run(JSON.stringify(o), "order:" + id);
    assert.strictEqual((await getc({ action: "confirm", id, s: sign("confirm", id) })).statusCode, 410, "31-day-old unpaid link is expired (page)");
    const post = await handler({ httpMethod: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ do: "confirm", id, s: sign("confirm", id) }).toString() }, ENVV);
    assert.strictEqual(post.statusCode, 410, "expired link cannot confirm payment");
    assert.strictEqual(stored("order:" + id).status === "paid", false, "order stays unpaid");
    ok("owner confirm links expire after 30 days for unpaid orders (page and button)");
  }

  console.log(`\nAll ${pass} checks passed.`);
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
