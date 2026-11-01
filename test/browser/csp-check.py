"""Load the site in real Chromium with the CSP from _headers, report CSP violations and JS errors."""
import re, sys, json, threading, http.server, socketserver, functools, os
from playwright.sync_api import sync_playwright

SITE = sys.argv[1]           # path to the site/ folder
PAGES = sys.argv[2:] or ["index.html", "privacy.html"]

headers_txt = open(os.path.join(SITE, "_headers"), encoding="utf-8").read()
csp = re.search(r"Content-Security-Policy:\s*(.+)", headers_txt).group(1).strip()

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
class Quiet(Handler.func if False else http.server.SimpleHTTPRequestHandler):
    pass
def make_handler():
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=SITE, **k)
        def log_message(self, *a): pass
    return H
srv = socketserver.TCPServer(("127.0.0.1", 0), make_handler())
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{port}"

results = {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for page_name in PAGES:
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        violations, errors = [], []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
        # Apply the production CSP like Netlify does
        def add_headers(route, request):
            if not request.url.startswith(base):
                route.abort()          # no internet in sandbox; external hosts are not needed for layout checks
                return
            resp = route.fetch()
            hdrs = dict(resp.headers)
            hdrs["content-security-policy"] = csp
            route.fulfill(response=resp, headers=hdrs)
        page.route("**/*", add_headers)
        page.add_init_script("""
          document.addEventListener('securitypolicyviolation', function (e) {
            window.__csp = window.__csp || []; window.__csp.push(e.violatedDirective + ' | ' + (e.sourceFile||'') + ' | ' + (e.sample||'').slice(0,60));
          });""")
        page.goto(f"{base}/{page_name}", wait_until="load")
        page.wait_for_timeout(1500)
        csp_list = page.evaluate("window.__csp || []")
        info = {"csp_violations": csp_list, "js_errors": errors}
        if page_name == "index.html":
            info["shop_cards"] = page.locator(".shop-card").count()
            info["gallery_items"] = page.locator(".gallery-item").count()
            info["broken_images_local"] = page.evaluate("""[...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src && i.src.startsWith(location.origin)).map(i => i.getAttribute('src').slice(0,60))""")
            info["fonts_loaded"] = page.evaluate("""(async () => { await document.fonts.ready; return [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.style+' '+f.weight).slice(0,8); })()""")
        results[page_name] = info
        ctx.close()
    browser.close()
srv.shutdown()
print(json.dumps(results, indent=1, ensure_ascii=False))
