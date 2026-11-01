# Self-hosted fonts

All site fonts are served from this folder. The site makes no requests to Google Fonts.

| Font | File | Weights | License |
|---|---|---|---|
| Fraunces (headings), roman | `fraunces-variable-roman.woff2` | 100 to 900 (variable) | OFL 1.1, see `OFL-Fraunces.txt` |
| Fraunces (headings), italic | `fraunces-variable-italic.woff2` | 100 to 900 (variable) | OFL 1.1, see `OFL-Fraunces.txt` |
| Manrope (body text) | `manrope-variable.woff` | 200 to 800 (variable) | OFL 1.1, see `OFL-Manrope.txt` |

- `fonts.css` declares all faces. Both pages load it with `<link rel="stylesheet" href="fonts/fonts.css">`.
- `_headers` CSP allows only `'self'` for fonts and styles from fonts.
- `fonts.css` sets `SOFT 0` so Fraunces has sharp letterforms. Change or remove that line if you prefer the softer look.
- Manrope is in WOFF format (not WOFF2) because WOFF2 needs a compression library that was not available when building. WOFF works in all modern browsers. Converting to WOFF2 later will make the file about 30% smaller.
- Some decorative characters on the site (for example the star and sparkle symbols) are not in Manrope or Fraunces. The browser shows them with a fallback font.

## Check after deploy

Open the site with browser DevTools > Network, filter by "Font". No requests should go to `fonts.googleapis.com` or `fonts.gstatic.com`. Check that headings and body text look right.
