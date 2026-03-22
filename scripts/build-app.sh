#!/bin/bash
set -euo pipefail

# ConceptLLM — Unified Build Pipeline
# Usage:
#   scripts/build-app.sh              # test + build (Release)
#   scripts/build-app.sh --debug      # test + build (Debug)
#   scripts/build-app.sh --skip-tests # build only, no tests
#   scripts/build-app.sh --archive    # test + build + archive for App Store
#   scripts/build-app.sh --open       # test + build + open the app

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONFIGURATION="Release"
SKIP_TESTS=false
DO_ARCHIVE=false
DO_OPEN=false
BUILD_DIR="$ROOT/macos/build"
ARCHIVE_PATH="$BUILD_DIR/ConceptLLM.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"

for arg in "$@"; do
  case "$arg" in
    --debug) CONFIGURATION="Debug" ;;
    --skip-tests) SKIP_TESTS=true ;;
    --archive) DO_ARCHIVE=true; CONFIGURATION="Release" ;;
    --open) DO_OPEN=true ;;
    --help|-h)
      echo "Usage: scripts/build-app.sh [options]"
      echo "  --debug       Build Debug configuration"
      echo "  --skip-tests  Skip cargo test and npm test"
      echo "  --archive     Produce .xcarchive for App Store submission"
      echo "  --open        Open the app after building"
      echo "  -h, --help    Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# --- Prerequisites ---
echo "=== Checking prerequisites ==="
for cmd in cargo wasm-pack npm xcodebuild xcodegen; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd not found. Install it first."
    exit 1
  fi
done
echo "All prerequisites found."

# --- Step 1: Tests ---
if [ "$SKIP_TESTS" = false ]; then
  echo ""
  echo "=== Step 1a: Rust tests ==="
  cargo test
  echo "Rust tests passed."

  echo ""
  echo "=== Step 1b: Web tests ==="
  cd web
  npm test
  cd "$ROOT"
  echo "Web tests passed."
else
  echo ""
  echo "=== Skipping tests (--skip-tests) ==="
fi

# --- Step 2: Build WASM ---
echo ""
echo "=== Step 2: Build WASM parser ==="
wasm-pack build --target web --out-dir web/src/wasm --features wasm
echo "WASM built."

# --- Step 3: Build React SPA ---
echo ""
echo "=== Step 3: Build React SPA ==="
cd web
npm run build
cd "$ROOT"
echo "React SPA built."

# --- Step 3b: Build MCP server ---
echo ""
echo "=== Step 3b: Build MCP server ==="
cd mcp-server
swift build -c release 2>&1 | tail -3
cd "$ROOT"
echo "MCP server built."

# --- Step 4: Copy web assets + MCP binary ---
echo ""
echo "=== Step 4: Copy web assets and MCP binary to macOS Resources ==="
rm -rf macos/Resources/web
cp -r web/dist/ macos/Resources/web/
mkdir -p macos/Resources/bin
cp mcp-server/.build/release/ConceptMCP macos/Resources/bin/
mkdir -p macos/Resources/templates
cp templates/*.cmt macos/Resources/templates/
echo "Web assets, MCP binary, and templates copied."

# --- Step 5: Regenerate Xcode project ---
echo ""
echo "=== Step 5: Regenerate Xcode project ==="
cd macos
xcodegen generate
cd "$ROOT"
echo "Xcode project generated."

# --- Step 6: Build macOS app ---
echo ""
echo "=== Step 6: Build macOS app ($CONFIGURATION) ==="
cd macos
xcodebuild \
  -scheme ConceptLLM \
  -configuration "$CONFIGURATION" \
  -derivedDataPath build \
  build \
  | tail -5
cd "$ROOT"

APP_PATH="$BUILD_DIR/Build/Products/$CONFIGURATION/ConceptLLM.app"
echo "App built: $APP_PATH"

# --- Step 7: Archive (optional) ---
if [ "$DO_ARCHIVE" = true ]; then
  echo ""
  echo "=== Step 7: Archive for App Store ==="

  # Auto-increment build number
  CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CURRENT_PROJECT_VERSION" macos/ConceptLLM/Info.plist 2>/dev/null || echo "1")
  if [[ "$CURRENT_BUILD" =~ ^[0-9]+$ ]]; then
    NEXT_BUILD=$((CURRENT_BUILD + 1))
  else
    NEXT_BUILD=1
  fi
  echo "Build number: $CURRENT_BUILD -> $NEXT_BUILD"

  cd macos
  xcodebuild archive \
    -scheme ConceptLLM \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    CURRENT_PROJECT_VERSION="$NEXT_BUILD" \
    | tail -5

  echo "Archive created: $ARCHIVE_PATH"

  echo ""
  echo "=== Step 8: Export archive ==="
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist ExportOptions.plist \
    -exportPath "$EXPORT_PATH" \
    | tail -5

  cd "$ROOT"
  echo "Exported to: $EXPORT_PATH"
fi

# --- Step 8: Verify code signature ---
echo ""
echo "=== Verify code signature ==="
if [ "$DO_ARCHIVE" = true ] && [ -d "$EXPORT_PATH/ConceptLLM.app" ]; then
  codesign -dv "$EXPORT_PATH/ConceptLLM.app" 2>&1 | head -5
elif [ -d "$APP_PATH" ]; then
  codesign -dv "$APP_PATH" 2>&1 | head -5
fi

# --- Open app (optional) ---
if [ "$DO_OPEN" = true ] && [ -d "$APP_PATH" ]; then
  echo ""
  echo "=== Opening app ==="
  open "$APP_PATH"
fi

echo ""
echo "=== Build complete ==="
