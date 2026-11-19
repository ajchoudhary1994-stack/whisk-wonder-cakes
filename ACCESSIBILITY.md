# Accessibility notes: Whisk & Wonder Cakes

## Checked (automated, headless Chromium, desktop and mobile viewports)
- Page language, title, viewport meta: OK.
- One h1 per page; no duplicate IDs; every image has alt text; every button and link has a name.
- 3D canvases have aria-label (interactive) or aria-hidden (decorative).
- Heading order: fixed one skip (contact card titles now h3).
- Form fields: every visible field has a label. The 17 unlabelled inputs are hidden Netlify form-detection fields
  (inside hidden containers), which assistive tech ignores.
- Text contrast measured from rendered pixels across the full page: fixed the spotlight background overwrite,
  deepened brand gold and rose text on light backgrounds, and darkened gallery captions.

## Known open items
- Some gold or pastel text on photos (gallery tiles, occasion tiles) is still near 2-3:1. Give those tiles a solid dark scrim.
- The "Home Delivery" badge (brown on pink) is about 4:1. Darken the text slightly.
- Pixel sampling is approximate. Confirm with Lighthouse on PageSpeed Insights after deploy.

## Behaviour
- Reduced motion: GSAP tweens, Lenis smooth scroll, 3D particle and gradient motion, the liquid logo, the gallery ring and the page fade are all disabled or set to static frames.
- Keyboard: 3D cake, party stage and gallery ring accept arrow keys. Focus rings use the brand gold.
- Touch: 3D canvases use pan-y so vertical page scroll still works on phones.
