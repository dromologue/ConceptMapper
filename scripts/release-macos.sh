#!/bin/bash
set -euo pipefail

# ConceptMapper — Developer ID release pipeline (direct download).
# Produces a notarised + stapled DMG for distribution outside the App Store.
#
# One-time prerequisites:
#   1. A "Developer ID Application" certificate in the login keychain (team 4EDT4L4DYU).
#      Xcode → Settings → Accounts → Manage Certificates → + → Developer ID Application.
#   2. A notarytool keychain profile holding an App Store Connect API key:
#        xcrun notarytool store-credentials "ConceptMapper-Notary" \
#          --key AuthKey_XXXX.p8 --key-id KEYID --issuer ISSUER-UUID
#
# Usage:
#   scripts/release-macos.sh                 # tests + build + DMG + notarise + staple + verify
#   scripts/release-macos.sh --skip-tests    # skip cargo/npm tests
#   scripts/release-macos.sh --skip-notarize # build + sign DMG only (local signing smoke test)
#
# Output: macos/build/ConceptMapper-<version>.dmg (+ stable copy ConceptMapper.dmg)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NOTARY_PROFILE="${NOTARY_PROFILE:-ConceptMapper-Notary}"
SKIP_TESTS=false
SKIP_NOTARIZE=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    --skip-notarize) SKIP_NOTARIZE=true ;;
    --help|-h)
      echo "Usage: scripts/release-macos.sh [--skip-tests] [--skip-notarize]"
      exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

BUILD_DIR="$ROOT/macos/build"
ARCHIVE_PATH="$BUILD_DIR/ConceptMapper.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
APP="$EXPORT_PATH/ConceptMapper.app"

# --- Prerequisites ---
echo "=== Checking prerequisites ==="
for cmd in cargo wasm-pack npm xcodebuild xcodegen hdiutil; do
  command -v "$cmd" &>/dev/null || { echo "ERROR: $cmd not found."; exit 1; }
done

DEVID=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed -E 's/.*"(.*)"/\1/')
if [ -z "${DEVID:-}" ]; then
  echo "ERROR: No 'Developer ID Application' certificate in the keychain."
  echo "Create one in Xcode → Settings → Accounts → Manage Certificates → + → Developer ID Application (team 4EDT4L4DYU)."
  exit 1
fi
echo "Signing identity: $DEVID"

if [ "$SKIP_NOTARIZE" = false ]; then
  if ! xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" &>/dev/null; then
    echo "ERROR: notarytool profile '$NOTARY_PROFILE' not found or invalid."
    echo "Run: xcrun notarytool store-credentials \"$NOTARY_PROFILE\" --key AuthKey_XXXX.p8 --key-id KEYID --issuer ISSUER-UUID"
    exit 1
  fi
fi

# --- Tests ---
if [ "$SKIP_TESTS" = false ]; then
  echo "=== Tests ==="
  cargo test
  (cd web && npm test)
else
  echo "=== Skipping tests (--skip-tests) ==="
fi

# --- Web build + copy assets (mirrors scripts/build-app.sh steps 2–4) ---
echo "=== Build WASM + React SPA ==="
wasm-pack build --target web --out-dir web/src/wasm --features wasm
(cd web && npm run build)

echo "=== Copy web assets, templates, and maps into macOS Resources ==="
rm -rf macos/Resources/web
cp -r web/dist/ macos/Resources/web/
rm -rf macos/Resources/web/templates macos/Resources/templates
mkdir -p macos/Resources/web/templates macos/Resources/templates
cp templates/*.cmt macos/Resources/web/templates/
cp templates/*.cmt macos/Resources/templates/
rm -rf macos/Resources/web/maps macos/Resources/maps
mkdir -p macos/Resources/web/maps macos/Resources/maps
[ -d Maps ] && cp Maps/*.cm macos/Resources/web/maps/ 2>/dev/null || true
[ -d Maps ] && cp Maps/*.cm macos/Resources/maps/ 2>/dev/null || true

# --- Regenerate project + read version ---
(cd macos && xcodegen generate)
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" macos/ConceptMapper/Info.plist)
echo "=== Releasing version $VERSION ==="

# --- Archive ---
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"
echo "=== Archive (Release) ==="
(cd macos && xcodebuild archive \
  -scheme ConceptMapper \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  | tail -5)

# --- Export with Developer ID signing ---
echo "=== Export (Developer ID) ==="
(cd macos && xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist ExportOptions-DeveloperID.plist \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates \
  | tail -10)

[ -d "$APP" ] || { echo "ERROR: export did not produce $APP"; exit 1; }

echo "=== Verify app signature (hardened runtime + Developer ID) ==="
codesign -dv --verbose=4 "$APP" 2>&1 | grep -E "Authority|Runtime|TeamIdentifier|Identifier=" || true
codesign --verify --deep --strict --verbose=2 "$APP"

# --- Build DMG ---
DMG_VER="$BUILD_DIR/ConceptMapper-$VERSION.dmg"
DMG_STABLE="$BUILD_DIR/ConceptMapper.dmg"
STAGING="$BUILD_DIR/dmg-staging"
echo "=== Build DMG ==="
rm -rf "$STAGING" "$DMG_VER" "$DMG_STABLE"
mkdir -p "$STAGING"
cp -R "$APP" "$STAGING/"
ln -s /Applications "$STAGING/Applications"
hdiutil create -volname "ConceptMapper" -srcfolder "$STAGING" -ov -format UDZO "$DMG_VER" >/dev/null
rm -rf "$STAGING"

echo "=== Sign DMG ==="
codesign --force --sign "$DEVID" --timestamp "$DMG_VER"

if [ "$SKIP_NOTARIZE" = true ]; then
  cp "$DMG_VER" "$DMG_STABLE"
  echo ""
  echo "=== Built (UNNOTARISED — local test only) ==="
  echo "  $DMG_VER"
  exit 0
fi

# --- Notarise + staple ---
echo "=== Notarise (this can take a few minutes) ==="
xcrun notarytool submit "$DMG_VER" --keychain-profile "$NOTARY_PROFILE" --wait

echo "=== Staple ==="
xcrun stapler staple "$DMG_VER"
xcrun stapler validate "$DMG_VER"

# --- Gatekeeper verification of the app inside the DMG ---
echo "=== Gatekeeper assessment ==="
MOUNT=$(mktemp -d)
hdiutil attach "$DMG_VER" -nobrowse -mountpoint "$MOUNT" >/dev/null
spctl -a -t exec -vvv "$MOUNT/ConceptMapper.app" 2>&1 | head -5 || true
hdiutil detach "$MOUNT" -quiet || true
rmdir "$MOUNT" 2>/dev/null || true

cp "$DMG_VER" "$DMG_STABLE"
echo ""
echo "=== Release DMG ready ==="
echo "  $DMG_VER"
echo "  (stable copy: $DMG_STABLE)"
echo "Next: scripts/deploy-downloads.sh to publish it to fly.io."
