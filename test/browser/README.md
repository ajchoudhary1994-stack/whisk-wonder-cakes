# Browser checks (optional, needs Python + Playwright + Chromium)

These run the real site in Chromium with the production Content-Security-Policy from `site/_headers`.

    pip install playwright && python -m playwright install chromium
    python test/browser/csp-check.py site
    python test/browser/interact.py site

- `csp-check.py`: loads both pages, reports CSP violations, JavaScript errors, shop cards, gallery items, and loaded fonts.
- `interact.py`: weight picker, the + button (4 lb), cart totals, feedback form lock, lightbox, checkout view, and the delivery / pickup toggle.

Both must report zero CSP violations and zero JavaScript errors.
