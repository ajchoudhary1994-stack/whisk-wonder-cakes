"""Real-browser interaction test with the production CSP: weight picker, + button, cart, totals."""
import re, sys, threading, http.server, socketserver, os
from playwright.sync_api import sync_playwright
SITE = sys.argv[1]
headers_txt = open(os.path.join(SITE, "_headers"), encoding="utf-8").read()
csp = re.search(r"Content-Security-Policy:\s*(.+)", headers_txt).group(1).strip()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=SITE, **k)
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_address[1]}"
fails, passes = [], []
def check(name, cond, detail=""):
    (passes if cond else fails).append(name + (f"  [{detail}]" if detail and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    csp_v, js_err = [], []
    pg.on("pageerror", lambda e: js_err.append(str(e)))
    pg.on("console", lambda m: js_err.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text and "404" not in m.text else None)
    pg.add_init_script("""document.addEventListener('securitypolicyviolation', e => { (window.__csp = window.__csp || []).push(e.violatedDirective); });""")
    def route(r, q):
        if not q.url.startswith(base): return r.abort()
        resp = r.fetch(); h = dict(resp.headers); h["content-security-policy"] = csp
        r.fulfill(response=resp, headers=h)
    pg.route("**/*", route)
    pg.goto(base + "/index.html", wait_until="load"); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('#shop').scrollIntoView()"); pg.wait_for_timeout(800)

    card = pg.locator(".shop-card[data-id='red-velvet']")
    check("shop shows 6 cakes", pg.locator(".shop-card").count() == 6, str(pg.locator(".shop-card").count()))
    check("default weight 1 lb shows Rs 575", card.locator(".shop-price").inner_text().strip() == "₹575", card.locator(".shop-price").inner_text())
    card.locator(".size-pill", has_text="2 lb").click()
    check("select 2 lb -> Rs 1,150", card.locator(".shop-price").inner_text().strip() == "₹1,150", card.locator(".shop-price").inner_text())
    card.locator(".size-plus").click(); pg.wait_for_timeout(200)
    card = pg.locator(".shop-card[data-id='red-velvet']")
    check("+ adds 4 lb and selects it", card.locator(".shop-price").inner_text().strip() == "₹2,300", card.locator(".shop-price").inner_text())
    check("+ button creates 4 weight pills", card.locator(".size-pill").count() == 4, str(card.locator(".size-pill").count()))
    card.locator(".add-btn").click(); pg.wait_for_timeout(400)
    check("add to cart updates the cart count", pg.locator("#cartCount").inner_text().strip() == "1", pg.locator("#cartCount").inner_text())
    lines = pg.locator("#cartLines").inner_text()
    check("cart line shows 4 lb and the correct price", "4 lb" in lines and "2,300" in lines, lines[:120])
    pg.locator("#cartBtn").click(); pg.wait_for_timeout(500)
    check("cart drawer opens", pg.locator("#cartDrawer").get_attribute("aria-hidden") in (None, "false"), "aria-hidden")
    check("cart subtotal shows Rs 2,300", "2,300" in pg.locator("#cartSubtotal").inner_text(), pg.locator("#cartSubtotal").inner_text())

    pg.locator("#cartClose").click(); pg.wait_for_timeout(500)

    # Feedback form is hidden until the feedback link opens it (was inline display:none)
    pg.evaluate("document.querySelector('#celebForm') && document.querySelector('#celebForm').scrollIntoView()")
    check("feedback form starts hidden", pg.evaluate("getComputedStyle(document.getElementById('celebForm')).display") == "none", "")
    check("feedback lock message is visible", pg.evaluate("getComputedStyle(document.getElementById('celebLocked')).display") != "none", "")

    # Gallery lightbox: open a card and check the image shows
    pg.evaluate("document.querySelector('#gallery').scrollIntoView()"); pg.wait_for_timeout(500)
    pg.locator(".gallery-item[data-name='Vanilla']").click(); pg.wait_for_timeout(700)
    lb_op = pg.evaluate("getComputedStyle(document.getElementById('lightboxImg')).opacity")
    check("gallery lightbox image is visible", float(lb_op) > 0.9, lb_op)

    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)

    # Checkout view opens from the cart; delivery/pickup switch toggles address fields (CSSOM style changes)
    pg.locator("#cartBtn").click(); pg.wait_for_timeout(400)
    pg.locator("#goCheckout").click(); pg.wait_for_timeout(500)
    check("checkout view opens", pg.locator("#viewCheckout").get_attribute("class").find("active") >= 0, pg.locator("#viewCheckout").get_attribute("class"))
    check("checkout summary lists the cake", "Red Velvet" in pg.locator("#coSummary").inner_text(), pg.locator("#coSummary").inner_text()[:80])
    pg.locator("#coMode").select_option("pickup"); pg.wait_for_timeout(200)
    check("pickup hides the delivery address block", pg.evaluate("getComputedStyle(document.getElementById('coDelWrap')).display") == "none", "")
    pg.locator("#coMode").select_option("delivery"); pg.wait_for_timeout(200)
    check("delivery shows the address block again", pg.evaluate("getComputedStyle(document.getElementById('coDelWrap')).display") != "none", "")

    csp_list = pg.evaluate("window.__csp || []")
    check("no CSP violations during the whole flow", len(csp_list) == 0, str(csp_list))
    check("no JavaScript errors", len(js_err) == 0, str(js_err[:3]))
    b.close()
srv.shutdown()
print("PASS:", len(passes)); [print("  ok  ", x) for x in passes]
print("FAIL:", len(fails)); [print("  FAIL", x) for x in fails]
