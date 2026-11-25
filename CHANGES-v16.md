# v16 (23 Nov 2026): frontend fixes on top of v15.2

Look and layout of the home page are unchanged. Changed:

- **Mascot (Wonder) on phones:** always stays in the bottom-left corner, fully visible. Its speech bubble no longer pushes it off the bottom of the screen. It lifts above the cookie banner while the banner is open.
- **Cookie banner on phones:** one slim line (about 45 px instead of 113 px) saying "Allow analytics cookies? Privacy" with Reject / Accept. It appears after a little scrolling (or 9 s), stays clear of the floating call/WhatsApp buttons, and **hides itself after 30 s** if ignored. Ignoring means "not now": analytics stays off, nothing is saved, it is not shown again in the same visit, and it comes back on the next visit. The footer "Cookie settings" link still opens it (without auto-hide). When the banner goes away (Accept, Reject or timeout) the mascot slides back down to the bottom-left corner. To keep it hidden for 7 days instead, change `sessionStorage` to `localStorage` plus a date in `js/consent.js`.
- **Order confirmed screen:** the "Done" button (it only closed the drawer) is replaced by **Copy Order Details** (copies the full order text, useful if WhatsApp does not open) and a low-key **Continue Browsing** link (closes the drawer, does not leave the page).
- **Speed:** videos no longer autoplay at load (hero starts after load, signature video when it scrolls into view; skipped on Data Saver / reduced motion). Mascot code loads after the page. Hero image preloaded. Cache headers for `/assets/*` (30 days) and `/fonts/*`.
- **SEO:** 7 landing pages (birthday, anniversary, wedding, kids theme, custom design, party supplies, home delivery in Arla), linked from the footer; sitemap and llms.txt updated; privacy/terms use clean URLs; FAQPage schema for the home FAQ. The home headline text is unchanged.
- **Tests:** 36 backend + 13 site checks; real-Chromium CSP check on 6 pages (0 violations, 0 JS errors) and the cart/checkout interaction test.
