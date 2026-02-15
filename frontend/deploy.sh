#!/bin/bash
set -e
echo "Running tests..."
npm test
echo "Tests passed! Building..."
npm run build
cd dist
git add .
git commit -m "Deploy updates"
git push origin gh-pages
cd ../..
echo "Deployed! Live in 1-2 minutes at https://baldmike.github.io/baseball-game/"
