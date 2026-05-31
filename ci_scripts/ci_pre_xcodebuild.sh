#!/bin/sh
# Xcode Cloud runs this before the xcodebuild action. It stamps the bundle
# build number from Xcode Cloud's monotonically increasing CI_BUILD_NUMBER so
# every upload to App Store Connect has a unique, increasing CFBundleVersion.
# Without this, a second upload is rejected ("build number already used").
set -e

PLIST="$CI_PRIMARY_REPOSITORY_PATH/macos/ConceptMapper/Info.plist"

if [ -n "$CI_BUILD_NUMBER" ] && [ -f "$PLIST" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CI_BUILD_NUMBER" "$PLIST"
  echo "ci_pre_xcodebuild: set CFBundleVersion = $CI_BUILD_NUMBER"
else
  echo "ci_pre_xcodebuild: CI_BUILD_NUMBER unset or plist missing; leaving CFBundleVersion unchanged"
fi
