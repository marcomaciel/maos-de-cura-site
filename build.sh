#!/bin/bash
set -e

rm -rf dist
mkdir -p dist/scripts

# Assets estáticos: cópia direta, sem minificação
cp -r checkout depoimentos dist/ 2>/dev/null || true
cp *.jpg *.png *.avif dist/ 2>/dev/null || true

# HTML minificado
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o dist/index.html index.html

# JS minificado, um por um
for f in scripts/*.js; do
  npx terser "$f" -c -m -o "dist/scripts/$(basename "$f")"
done