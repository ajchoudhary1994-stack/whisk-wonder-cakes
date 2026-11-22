#!/usr/bin/env bash
# Minify the motion/3D layer from source/ into site/. Run from the project root.
# Needs esbuild (ESBUILD=/path/to/esbuild ./build.sh, or esbuild on PATH).
set -euo pipefail
ESB="${ESBUILD:-esbuild}"
$ESB source/js/lenis.src.js --minify --legal-comments=inline --outfile=site/js/vendor/lenis.min.js
for f in motion cake3d scene3d party3d gallery3d assemble; do
  $ESB source/js/$f.js --minify --target=es2018 --outfile=site/js/$f.js
done
# liquid-logo imports the shader as text, so it is bundled
$ESB source/js/liquid-logo.js --bundle --minify --target=es2018 --loader:.glsl=text --outfile=site/js/liquid-logo.js
for f in motion signature scene3d polish v14; do
  $ESB source/css/$f.css --minify --outfile=site/css/$f.css
done
echo "Built minified motion layer into site/."
