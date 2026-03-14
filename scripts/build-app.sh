#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Step 1: Build WASM parser ==="
wasm-pack build --target web --out-dir web/src/wasm --features wasm
echo "✓ WASM built"

echo ""
echo "=== Step 2: Build React SPA ==="
cd web
npm run build
cd "$ROOT"
echo "✓ React SPA built"

echo ""
echo "=== Step 3: Copy web assets to macOS Resources ==="
rm -rf macos/Resources/web
cp -r web/dist/ macos/Resources/web/
echo "✓ Web assets copied"

echo ""
echo "=== Step 4: Regenerate Xcode project ==="
cd macos
xcodegen generate
echo "✓ Xcode project generated"

echo ""
echo "=== Step 5: Build macOS app ==="
xcodebuild -scheme ConceptLLM -configuration Release build
cd "$ROOT"
echo "✓ macOS app built"

echo ""
echo "=== Build complete ==="
echo "App at: $(find ~/Library/Developer/Xcode/DerivedData/ConceptLLM-*/Build/Products/Release/ConceptLLM.app -maxdepth 0 2>/dev/null || echo 'check DerivedData')"
