# Changes in this round

## Fixed

1. **Reward code could be burned without an order.** The code was marked used before the order was
   saved, and a failed order save was silently ignored. Now the server saves the order and applies the
   reward in one request. If anything fails, the customer gets an error and the code is not used.
   Retrying the same order does not burn the code twice.
2. **Discount and total came from the browser.** The server now computes the reward discount from its
   own code record and rejects any order whose total does not match.
3. **Owner confirm link changed payment status on GET.** Email and chat link previews open links
   automatically, which could mark an order paid by mistake. Now GET only shows the order, and a
   POST button marks it paid. A forged token is rejected.
4. **Customer details in the phone alert.** The ntfy alert had the customer's name and phone number
   and a working confirm link. It now has only the order ID, amount, date and cakes. Set `NTFY_TOKEN`
   and keep the topic private.
5. **Source code and package files were published with the site.** Only `site/` is published now
   (`netlify.toml`).

## Added

- `npm test`: 11 behaviour checks for the reward and confirm flows (in-memory store, no account needed).
- `.gitignore` (keeps `.env` and `node_modules` out of git), `engines` in `package.json`.

## Not changed yet (listed in README "Known limits")

- Inline scripts and styles in the Content Security Policy.
- Rate limiting on the order endpoint.
- Browser-side prices (needs a server price list).
- `package-lock.json` is not in the repo. Run `npm install` once and commit it.
- `index.html` requests `/catalog.json`, which is not in this repo. The page falls back to its built-in menu,
  so nothing breaks, but the file should be added if the menu is meant to be edited without code changes.

## Testing status

- Backend: 11 automated checks pass (mock store). Not yet tested against real Netlify Blobs.
- Front-end: JavaScript syntax checked. Not yet tested in a browser on a live deploy.
  Please place one test order and one reward-code order after deploying.

## Cake weight: + button above 3 lb

- Cake weight picker starts at 1 lb, 2 lb, 3 lb. The + button adds 1 lb each click (4 lb, 5 lb, ... up to 10 lb).
- Price = price per 1 lb x pounds, for every weight. Example: Red Velvet 4 lb = Rs 2,300.
- Grams label: 1 lb = 500 g, then 2 lb = 1 kg, 3 lb = 1.5 kg, 4 lb = 2 kg, and so on.
- Cart accepts any weight from 1 to 10 lb. Existing cart lines keep working.
- Maximum 10 lb per cake. Bigger cakes go through WhatsApp.

## Fonts: self-hosted (no Google Fonts requests)

- Fraunces (headings): variable WOFF2 roman and italic, from the Fraunces project archive.
- Manrope (body): variable WOFF, from the Manrope archive.
- Google Fonts links and preconnects removed from `index.html` and `privacy.html`.
- CSP: `style-src` and `font-src` no longer list Google hosts.
- License files included: `site/fonts/OFL-Fraunces.txt`, `site/fonts/OFL-Manrope.txt`.

## Server-side price validation (critical fix)

- The server now has its own price list (`CAKE_PER_LB`, party and bundle sizes) in `netlify/functions/rewards.js`.
- The browser sends only the cart lines: item ID, weight, quantity, and flavour. It no longer sends prices or cake totals.
- The server prices every line, applies the reward code, adds the delivery charge, and saves that total.
- If the browser's total does not match the server's total, the order is rejected with "Prices have changed. Please refresh."
- Limits enforced by the server: 1 to 10 lb per cake, 1 to 20 per line, up to 30 lines, delivery Rs 0 to 110.
- The order record stores the server's item list, cake text, party text, and total. Owner emails and alerts use these values.
- `test/rewards.test.js` checks that the server price list matches `site/index.html` CATALOG (rates, names, party and bundle sizes).

Limit: delivery charge is still set by the browser's distance check (the server does not know the customer's location). It is capped at Rs 110, and the owner confirms the total on WhatsApp.

## Strict Content-Security-Policy (no unsafe-inline, no base64 images)

- CSP is now `script-src 'self'`, `style-src 'self'`, `img-src 'self' https://images.unsplash.com`. No `unsafe-inline`, no `data:` images.
- Photos: all base64 images moved to `site/assets/` as files (with width/height and lazy loading; header logos stay eager). The favicon is `assets/favicon.webp` and the Apple icon is `assets/apple-touch-icon.png`. The UPI QR is `assets/upi-qr.jpg`.
- Inline `onerror` handlers replaced by `js/img-fallback.js`. It hides a broken product photo and restores it when a photo loads. Empty-source images (the lightbox before it opens) are left alone.
- Inline scripts moved to `js/site-1.js` and `js/site-2.js` (loaded with `defer`, same order).
- Inline `<style>` blocks moved to `css/site.css` and `css/privacy.css`.
- All 24 `style=` attributes (HTML and inside JS templates) became CSS classes. The celebration feedback form starts hidden with `is-hidden-init` and is shown by JS.
- Pages look the same: computed styles and box positions were compared before and after in Chromium at 390 px width. The only differences are timing noise from the continuously moving ticker.

## Tests

- `npm test` runs 20 backend checks (pricing, rewards, owner confirm) and 5 static checks on the site (no inline script, style, handler, base64, or javascript: URL; every local file exists).
- `test/browser/` has two optional Chromium checks (see its README). With the strict CSP, the full flow runs with 0 violations and 0 JavaScript errors: 18 checks pass.

## Known

- `index.html` still tries to fetch `/catalog.json` (not in the repo). It returns 404 and the built-in menu is used, so the page works. Remove that fetch if the menu will only come from code.

## Security review (attacker view) and fixes

Checked: secrets in the repo (none), every place user input becomes HTML (escaped), security headers (strong),
external links (rel=noopener, no http://), the order and reward API, the owner confirm and feedback links,
email sending, and localStorage input.

Fixed:
- Per-IP rate limit on the API (20 orders per hour; 120 other calls per hour). IPs are hashed with the
  secret before storage, so no raw IP is kept. Limits are set with RATE_LIMIT_ORDERS and RATE_LIMIT_OTHER.
  This stops order spam (owner email/ntfy flood, email quota) and reward-code guessing.
- Email must look like an address and be under 120 characters. Anything else is stored without an email,
  so the site cannot be used to email arbitrary addresses (email bombing) or inject mail headers.
- REWARDS_SECRET must be at least 32 characters, or the function refuses to run.
- Cart quantity is shown as a number (no HTML from localStorage).
- Hostile-input tests: wrong types, prototype keys, huge numbers, HTML in names, control characters. All return
  clean errors, with no stack traces.

Still open (needs your setting or decision):
- Rate limiting is per client in Netlify Blobs. A determined attacker with many IPs can still get past it. For
  stronger protection, use Netlify's bot/rate protection or Cloudflare in front of the site.
- The order form on the site (Netlify Forms) accepts spam with only a honeypot. In Netlify: Forms > Form
  settings, turn on spam filtering / reCAPTCHA.
- The WhatsApp feedback link for an order can be used by anyone who gets it. It gives one reward code per order,
  so only the first submitter gets the code. Keep those links private.
- Orders are kept in Netlify Blobs with no end date. Decide how long to keep them (for example 12 months), and
  say so on the privacy page.
- Run `npm install` and then `npm audit` once. There is no package-lock.json yet, and the audit needs internet.
- The Blobs `onlyIfNew` option is used by the rate limiter. The tests use an in-memory mock, so verify on Netlify.
- Turn on two-factor authentication for Netlify, GitHub, Brevo, and ntfy.

## Hero reveal animation

- Headline: 7 words, each slides up 20px and fades in, 80ms apart (done by 0.88s).
- Subheadline fades in at 0.88s.
- "Order on WhatsApp" button pops in with a soft bounce at 1.18s (done by 1.48s). Secondary buttons fade in with it.
- Badges and proof points fade in just after (1.2s and 1.25s).
- Only transform and opacity are animated. Base styles are visible, so the page works without JavaScript and button hover still works.
- With prefers-reduced-motion, all hero content shows immediately with no movement.

## Sale pings, Us vs Others table, and order success animation

**Sale pings toast (bottom-left)**
- Entries are in `site/data/sale-pings.json`. Edit the array: name, city, product, time (`at`, ISO format with +05:30), and `sample`.
- A new toast appears every 6 to 9 seconds at random. It slides in, stays 4 seconds, and slides out. The close button hides it for the browser session.
- Samples are hidden by default (`data-show-samples="false"` on `#pingToast` in index.html). Only real entries are shown. Set `sample` to `false` only for orders with the customer's permission (first name and city only). Do not show invented purchases, because that is misleading advertising.

**Us vs Others (section above FAQ)**
- Six rows reveal one by one on scroll. Red ✕ marks shake and green ✓ marks pop. Our column has a glow.
- The competitor column describes a "usual local bakery", not any named shop. Check every claim is true before you publish it.

**Success animation (Place Order button)**
- The button shows a spinner while the order is saved on the server. Then it shows a green check, plays confetti (80 particles, 1.2s), and shows "Order placed! We will confirm on WhatsApp."
- It plays only after the server confirms the order. If the server refuses, the button returns to normal and the error is shown.

**Performance and accessibility**
- Only transform and opacity are animated. The new JavaScript is about 2.8 KB and the CSS about 1.8 KB (gzipped).
- With prefers-reduced-motion, the toast only fades, the rows show at once, and the confetti is skipped.
- The toast is a live region. The button is a real button, so Enter and Space work.

## Performance pass

Measured in Chromium at 390 px width, 2x density (local files only):
- Local page weight: 1111 KB before, 603 KB after (about 46% less).
- Fonts: about 440 KB before, about 190 KB after. Latin subset, Fraunces SOFT and WONK pinned to the site's look, weights 400 to 700 (roman) and 400 to 500 (italic). Manrope 200 to 800, Latin subset.
- Photos over 800 px were resized to 800 px. The two small PNG icons became WebP (24 KB and 28 KB became 3 KB each). The UPI QR stays as the original JPEG, so it still scans.
- Hero image: smaller request (w=900, q=75), fetchpriority high, decoding async. The image host is preconnected. Fonts used above the fold are preloaded.
- The /catalog.json fetch was removed. The site had no such file, so every visit made a 404. Prices come only from the built-in catalog, which the server checks too.

Not measured here: the hero image comes from Unsplash, and this sandbox has no internet. To cut the last external request, download that photo, resize it to 900 px, save it as assets/hero.webp, and point the hero img at it.

## Motion layer (smooth scroll, GSAP, WebGL accents)

Files added: `site/js/motion.js`, `site/css/motion.css`, `site/js/vendor/gsap.min.js`,
`site/js/vendor/ScrollTrigger.min.js`, `site/js/vendor/lenis.min.js`.
Files changed: `site/index.html` only (one stylesheet link, `data-lenis-prevent` on the four overlays,
one `<canvas class="shader-bg">` in the delivery banner, four deferred scripts at the end).

- **Lenis** (MIT): smooth wheel scrolling on desktop, native momentum on phones, in-page links glide,
  stops while a modal locks body scroll, cart/lightbox/info/menu keep their own scrolling.
- **GSAP + ScrollTrigger** (free standard licence): hero parallax on the image container, section-title rise on scroll,
  magnetic nav and hero CTA on fine pointers only.
- **WebGL gradient** behind the delivery banner, brand colours, paused when off-screen or tab hidden, 1x pixel ratio on phones.
- **WebGL liquid logo** over the preloader logo, about 1.4 s, then hands back to the normal image.
- **Liquid glass** (CSS only): rim light and blur on the header, cart button and toasts.

Everything is progressive: with reduced-motion on, none of the JS tweens or WebGL run.
No inline script, no inline style, no new external hosts, so `_headers` (CSP) is unchanged.

Not done, on purpose:
- React Three Fiber needs React and a build step. The site is static HTML with a strict CSP, so it was not added.
- liquid-glass-js WebGL refraction needs html2canvas and redraws the page behind it every frame, which is heavy on budget phones.
  The CSS glass above gives the same look at almost no cost.

Testing status: `npm test` passes (CSP, inline-code, file-reference checks). Headless Chromium on desktop and
mobile viewports: no JavaScript errors, Lenis/GSAP/ScrollTrigger/gradient all start. Not yet tested on a real phone or a live deploy.

## Signature 3D chocolate cake (v5)

- New section `#signature` (above About): chocolate ganache cake rendered live in WebGL.
  Files: `site/js/cake3d.js` (raymarched SDF shader, no library), `site/css/signature.css`.
- Interaction: drag to turn (with inertia), left/right arrow keys, touch drag is horizontal only so page scroll still works.
- Performance: renders only while on screen, bounding-sphere early-out, 70% resolution on phones, one still frame for reduced motion.
- GSAP entrance for the section copy and the cake stage.
- React Three Fiber was not used: it needs `three` and `react-reconciler` installed through npm, which
  requires a machine with internet and a build step. Re-create the same scene as an R3F component later if you move to a React build.
- Cake is an illustrative preview; the caption on the page should say so if you add one.

## 3D layer v6

- Hero: 3D confetti particle field (`site/js/scene3d.js`, `site/css/scene3d.css`), with pointer parallax on desktop,
  fewer particles on phones, paused when off-screen.
- Cards (party store, cakes, gallery, why-us): 3D tilt on pointer move (fine pointers only, after reveal).
- Signature cake (v5): raymarched 3D chocolate cake.
- Not done: every element in 3D. That would hurt phone speed and text readability on this site.

## Party store 3D stage (v7)

- New `.party-stage` above the party categories: a 3D party table with gold and pastel balloons on strings and three lit candles.
  Files: `site/js/party3d.js` (raymarched shader, no library), CSS in `site/css/scene3d.css`.
- Drag or arrow keys to turn; renders only when visible; lower resolution on phones; still frame for reduced motion.
- Labelled as an illustrative preview on the page.

## Gallery 3D ring (v8)

- Gallery photos are arranged on a 3D cylinder (CSS 3D transforms, no WebGL, so it is light on phones).
  File: `site/js/gallery3d.js`; styles in `site/css/scene3d.css`; caption `#galleryCaption` added under the ring.
- Drag or swipe to turn; arrow keys when a photo is focused; the front photo snaps into place.
- Click a side photo to bring it to the front; click the front photo to open the existing lightbox.
- The "Have a design in mind?" card is moved below the ring so it is not placed in 3D.
- Falls back to the normal grid without JS or with reduced motion.
- Removed gallery cards from the pointer-tilt list (the ring uses its own transforms).

## Polish pass (v9)

- Buttons: light sheen on hover, press-in feedback; respects reduced motion.
- Cards: depth on hover via shadow and a gold hairline (transform is left to the 3D tilt).
- Nav: gold underline grows on hover.
- Brand selection colour, thin brand scrollbar, consistent gold focus rings.
- Pointer spotlight on the signature, gallery and delivery sections (desktop).
- Gentle fade-in on page entry (skipped for reduced motion).

## Minified build (v10)

- Source for the motion and 3D layer now lives in `source/` (not published). `./build.sh` minifies it into `site/` with esbuild.
- Sizes (gzip): Lenis 11.7 KB to 6.4 KB; motion.js 4.7 to 3.3 KB; cake3d 4.3 to 3.3 KB; party3d 3.6 to 3.0 KB;
  scene3d 2.6 to 2.0 KB; gallery3d 2.2 to 1.3 KB; CSS files about 40 percent smaller each.
- GSAP and ScrollTrigger were already minified by GreenSock and are unchanged.
- Edit files in `source/`, then run `./build.sh`. Do not edit `site/js/*.js` or `site/css/*.css` directly for these files.

## Accessibility pass (v11)
- Fixed the polish layer overwriting section backgrounds (signature, delivery banner): spotlight now a pseudo-element.
- Brand gold and rose text on light backgrounds deepened (set by motion.js, class ww-fix-gold / ww-fix-rose).
- Gallery captions darker scrim; caption text tone lifted.
- Contact card titles changed from h4 to h3 (heading order).
- Verified: all visible form fields are labelled; the 17 unlabelled inputs are hidden Netlify form fields.
- See ACCESSIBILITY.md for open items; REAL-DEVICE-CHECKLIST.md for phone testing.

## Contrast fixes (v12)
- Brand gold text on light backgrounds deepened to #6E5510 (about 7:1 on white, 5.7:1 on blush).
- Gold tags on shop cards now recoloured: light-text fix re-runs after load, since some cards render after motion.js.
- Occasion tiles (Celebrate, Cherish, ...): stronger bottom scrim and brighter label text.
- Known: gallery items at the back of the 3D ring are intentionally faded (opacity 0.28), so they read lower contrast. The front item is solid.

## Security review (v13)
- Removed invented buyer entries from site/data/sale-pings.json (now []).
- Added COOP, CORP and X-Permitted-Cross-Domain-Policies headers; worker-src none and manifest-src self in CSP.
- Full notes in SECURITY.md.

## v14: requested layout, signature assembly, premium polish, skills

Section order (16, as requested): Hero, Signature, Gallery, Order online (shop), Party store, Plan my celebration (new),
Made for you (own panel), Cake collection, Home delivery, Founder note, Why us, Why Whisk & Wonder, How we work,
Good to know (FAQ), Celebration form, Get in touch.
Removed: Our Story (about), Customer Love (reviews), Delivery Promise (delivery-banner). Reviews nav link removed; About nav points to the founder note.

- Signature: step-by-step layer assembly loop (sponge, cream, sponge, cream, fruit, sprinkles, finishing), with a live step list and three cake photos.
  Files: js/assemble.js (GSAP timeline + ScrollTrigger), css/v14.css.
- Party store: photos removed, each item shown with a monogram card. Items and 3D stage kept.
- Cake collection: real photo on the Celebration card; other cards use clean tiles until real photos are supplied.
- Made for you: moved to its own panel; colours kept, text contrast fixed.
- Why Whisk & Wonder cards: premium look (gold icon discs, serif titles, hairline, soft border).
- Gallery ring: per-frame filter removed, renders batched to one per frame, lighter shadows (smoother on phones).
- Founder note shortened with Anjali's sign-off.
- Preloader: liquid logo now uses the real fragment shader from the liquid-logo project (js/liquid-logo.js, shaders/liquid-logo.glsl).
- Review slider code guarded so the page never errors if its section is removed.

Not done (see reply): react-three-fiber (needs three.js and react-reconciler from npm), shadergradient React source,
and liquid-glass-js WebGL (needs html2canvas to snapshot the page). The old gradient shader is no longer on a visible section.

## v15: hero video, signature video, party list, cake photos
- Preloader: original logo intro restored (liquid logo script removed).
- Hero: compressed 16:9 video (1280x720, H.264, ~1 MB) with a poster image; text sits beneath the 16:9 frame.
- Signature: the assembly animation removed; second video (9:16, 480x854, ~0.6 MB) in its place.
- Plan My Celebration bundle block removed (the bundle code is guarded and no longer errors).
- Party store: all 26 items in one list, hidden until "Browse party items" is clicked; 3D stage and category headers removed.
- Cake collection: all four cards filled with photos (Celebration: real photo; Anniversary, Wedding, Kids: order-online photos).
- Shop cakes without their own gallery photo now borrow the matching cake-collection photo.

## v16: video backgrounds, party effects
- "Our cakes" strip removed from the signature section.
- Hero video now plays as the background of the hero (behind the "A home bakery, perfected" text); section is at least 16:9 on desktop and grows if the text needs more room.
- Signature: the red velvet video is the section background (dark shade on the left for the text); the side box is gone.
- Party store: on entering the section, two party poppers burst confetti and gold and pastel balloons float up behind the cards (plain canvas, pauses off-screen, none for reduced motion).
- "Browse party items" button has a gentle repeating gold glow.

## v17: continuous party popper
- Left party popper fires repeatedly (every 1.6-2.8 s) while the party section is on screen; balloons keep floating up.

## v18: popper fix, simple party list
- Popper canvas pinned to the screen while the party section is in view; bursts start from the lowest visible part of the section (fixes bursts happening off-screen on phones).
- Party store: bulky cards replaced by a simple list (name, short description, Enquire button) with a search box and a "no match" message.

## v19: two-column party list with item details
- Party items in two equal columns (50/50).
- Each item is a button. Tapping it opens a panel with the item photo, name, short description and an Enquire on WhatsApp button. The photo loads only after the tap.
- Panel closes with the X, the Escape key, or a tap outside it; page scroll pauses while it is open.

## v20: celebration form, order journey, founder note, mobile hero, polish
- Plan my celebration: "Share your details" opens a popup form with drop-down choices (occasion, when, guests, cake, decoration, delivery, area) and name and phone fields; "Share on WhatsApp" sends all answers in one message; "Clear form" resets; Escape or X closes.
- Every in-page link checked: all targets exist. Sections scroll below the sticky header.
- Founder note: short, plain text. Removed the tagline and the four-word strip.
- How we work: interactive journey. Pick a cake, order on WhatsApp, watch the cake being baked (animated), then the delivery bag arrives with the cake inside.
- Mobile hero: text starts below the header with side padding; eyebrow clear of the logo.
- Outline buttons on light panels fixed for contrast.

## v21: How we work as animation
- All four steps are now animated scenes (inline SVG + GSAP), no photos:
  1. Choose your cake: three cakes float; tap one to pick it.
  2. Order on your phone: a WhatsApp chat types "I'd like the <cake>" and the order button pulses; it opens WhatsApp with the chosen cake.
  3. We bake it: layers drop into the oven, glow and steam, timer counts up with a progress bar.
  4. Delivered: a scooter with a cake drives to the house; a check mark draws in.
- Last step's button restarts the journey. Reduced motion shows the final frame of each scene.

## v22: 3-hour baking timer, step labels inside each scene
- Baking timer counts 00:00:00 to 03:00:00 (hours:minutes:seconds).
- The separate step list above the animation is removed; each scene shows its own "Step N of 4" header.

## v23: founder note final text
- Founder note now uses the approved Hinglish draft (3 paragraphs, starts with "I'm Anjali, the founder of Whisk & Wonder Cakes"). Quote line removed.

## v24: full audit fixes
- redeem action disabled (could mark any reward code used without proof).
- Reward code checks limited to 15 per IP per hour (RATE_LIMIT_CHECK).
- Backend wrapper returns a clear JSON message on unexpected errors instead of a 502.
- Removed a GSAP tween on the removed signature stage.
- See AUDIT.md.

## v26: 404 page, terms page, analytics with consent
- 404.html: branded not-found page (noindex). Netlify serves it for unknown links.
- terms.html: orders, prices, delivery, cancellation and refund (same wording as privacy page), ingredients, rewards, law. Items marked [To confirm] need owner approval before going live: advance payment, law and court, grievance officer.
- Footer: Privacy, Terms, and Cookie settings links.
- Analytics (Google Analytics 4): js/consent.js. Set GA_ID to the Measurement ID. While empty, nothing loads and no banner shows. When set, a Accept/Reject banner appears; GA loads only after Accept. Choice stored in localStorage; reopen with Cookie settings.
- CSP: script-src, connect-src and img-src allow only the Google Analytics hosts. Site test updated.
- Privacy page: analytics and cookies section. Sitemap lists terms.html.

## v27: analytics switched on
- GA_ID set to G-R123RFD8X9 (Google Analytics 4). Consent banner now shows; Google Analytics loads only after Accept.

## v28: GA4 property confirmed from stream screenshot
- GA_ID set to G-9Z2W2QGJDB (stream "whisk and wonder cakes", https://www.whiskandwondercakes.in). Replaces G-R123RFD8X9.
- Privacy policy analytics section expanded: what is measured (page views, scrolls, outbound clicks, video, device), what is not collected, processor (Google), retention, cookies (_ga after accept), no sale or advertising use.
- Stream status at time of screenshot: data collection not yet active (expected until the site is deployed and the banner is accepted).
- Owner to check in GA admin: turn off Google signals and ads personalization if not needed.

## v29: Watch again replays the whole journey
- Watch again starts at step 1 (choose cake) and plays order, bake and delivery automatically, in order (about 19 seconds).
- Any manual Next, Back, step tap or cake tap stops the automatic play.
- Each scene has a short hold so the customer can see it before the next step.
- Tested in browser: steps go 1 to 2 to 3 to 4 with no errors.

## v11 fixes (Wonder avatar)

- The scroll listener had no event name, so "wait until the visitor stops scrolling" never worked. It now listens to scroll.
- Section stunts never started (playSection was never called), so Wonder did not drool at the cakes. They now play 1.2 s after the visitor stops on a section.
- The speech bubble was clickable even when invisible and blocked taps next to Wonder. It is now clickable only while shown.
- Wonder sat under the cart drawer (z-index 840), so his reactions were hidden during checkout on phones. He now rises above it while the cart is open.
- Removed the dead random-trick scheduler.

## v12 (Wonder family lines)

- 18 heart-touching family lines (mummy, papa, bachche, wife, dadi-nani, bitiya) replace the old 5. They end with a heart instead of the playful tags, show more often, and stay up 6.5 s so they can be read.

## v13 (Wonder in the cart)

- Wonder is hidden as soon as the cart opens, so he never covers the cart or checkout.
- While checking out he only pops up for a mistake: missing name, phone, address/location, date, a bad reward code, or an order that could not be saved. He appears above the error line for about 5 seconds, says what to fix, and disappears. Taps pass through him.
- When the order is placed he appears beside the tick, hearts burst out of him twice, then he fades away. He comes back to normal after the cart is closed.
- No more chatter, tricks or form comments inside the cart.

## v14 (moved from Netlify to Cloudflare Pages)

- Netlify credits ran out, so hosting moved to Cloudflare Pages (free static hosting, no credit meter).
- `netlify/functions/rewards.js` is now `functions/api/rewards.js` (URL `/api/rewards`). Storage moved from Netlify Blobs to a D1 database. The etag rules became atomic SQL, so one reward code still cannot be used twice. Tokens use WebCrypto instead of Node crypto.
- Netlify Forms are gone. The address, time slot, cake message and notes are saved with the order on the server. The owner email and the feedback email replace the old form emails.
- `netlify.toml`, `netlify/` and the `@netlify/blobs` dependency were removed.
- Tests: 28 server checks (with real SQLite standing in for D1), 6 site checks, browser CSP and checkout checks, and an end-to-end run of the real site against the real function: order, owner confirm, feedback, reward code, second order with the code.
- Bug fixed on the way: the WhatsApp feedback link on the owner page must carry the signed token (it is checked by a test now).
