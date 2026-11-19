# SEO checklist: status on the live files

| Item | Status | Where |
|---|---|---|
| Google Search Console | Verified by file | site/googlef8fb1ab152258e14.html (content matches the required format) |
| sitemap.xml | Present, lists home and privacy, dated 2026-11-12 | site/sitemap.xml, referenced in robots.txt |
| llms.txt | Present, updated (bundle wording removed to match the new site) | site/llms.txt |
| Open Graph tags | Present on the home page (title, description, image 1200x630, locale, url) and privacy page | site/index.html, site/privacy.html |
| Bing Webmaster Tools | Verified by meta tag msvalidate.01 | site/index.html |

Also present: canonical URL on both pages, robots meta index,follow, Bakery structured data (JSON-LD), robots.txt allowing all pages.

Not checked from here (needs internet): that Google Search Console and Bing show the sitemap as "Success"
after deploy. Re-submit sitemap.xml in both tools once the site is live with the new files.

## Update 2026-11-16 (Palampur local SEO pass)

- Title, meta description, Open Graph and Twitter tags now say "Palampur". Page language is en-IN.
- Added robots meta (index, follow, max-image-preview:large) to index.html. It was missing before, although this file said it was present.
- Bakery JSON-LD now has full address (Palampur, Himachal Pradesh, IN), geo coordinates, 10 km service area, UPI/INR and the six cake prices. postalCode 176102 added. Opening hours 09:00-21:00 added to the schema for all 7 days (change dayOfWeek if any day is off). Orders are still accepted online at any time; the FAQ explains this.
- Cake prices are now also written as plain text in the shop section. Before, they only appeared after JavaScript built the cards.
- Headings and image alt text for cakes and delivery now include "eggless" and "Palampur". Three FAQ answers added (Palampur eggless cakes, delivery area, prices).
- Removed the useless keywords meta and the unused unsplash preconnect.
- terms.html is set to noindex and removed from sitemap.xml because it still shows "[To confirm]" placeholders. Fill them in, then switch it back to "index, follow" and add it back to the sitemap.

## Update 2026-11-16 (Wonder the cake buddy)

- New: site/js/buddy.js, site/js/avatar-web.js, site/css/buddy.css, site/data/wonder.avatar.json. Loaded at the end of index.html. Wonder reacts to cart, delivery check, checkout fields, payment choice, reward code, order done and feedback.
- Built from the MIT-licensed @bible-strong/avatar-web package. Offline build used a small shim in place of ajv, so the character file is not schema-checked at runtime. The file is the repo's own Strobi export, recoloured pink and brown.
- Runs after the page has loaded, so it does not slow the first paint. Respects reduced-motion. Visitors can hide it with the x button.

## Update 2026-11-16 (Wonder v2: floating and tricks)

- Wonder now floats around the screen, rolls, jumps, squats, does push-ups, twists his tongue, and drools water when cakes come into view or are hovered.
- Comments are built from parts and checked against the last 90 lines, so they change every time. They are different for every section (home, cakes, gallery, party, delivery, FAQ and so on) and for every order step.
- Tap Wonder for a random trick. During checkout he docks in a corner and stays quiet so the form is never covered. Reduced-motion users get comments only.
- Console test: WonderBuddy.run('tongue'), run('drool'), run('pushup'), run('roll'), run('squat'), run('jump').
