#!/bin/bash
set -e
rm -rf dist
mkdir dist
cp -r . dist
rm -rf dist/dist dist/node_modules dist/package.json dist/package-lock.json dist/build.sh

npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o dist/index.html index.html

for f in scripts/*.js; do
  npx terser "$f" -c -m -o "dist/$f"
done