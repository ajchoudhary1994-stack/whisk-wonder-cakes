# Motion and 3D layer: quick guide

- Smooth scrolling (Lenis), section reveals and entrance tweens (GSAP) in `js/motion.js`.
- Brown-gold ambient background in the delivery section (`js/motion.js`).
- Liquid logo intro on the preloader (`js/motion.js`).
- Signature 3D chocolate cake: `js/cake3d.js` + `css/signature.css`.

To remove a piece, delete its `<script>` / `<link>` line in `index.html` and the matching
`<section class="signature">` block. The site falls back to its earlier look.

Test after deploying on a phone: scroll the whole page, drag the cake, open the cart,
open a gallery photo (page must not scroll behind it), tap menu links (they glide to the section).

Build: `build.sh` is not included in this ZIP, so edit the files in `site/js/` directly (the `source/` copies are for reference). `source/` is not published; only `site/` is.
