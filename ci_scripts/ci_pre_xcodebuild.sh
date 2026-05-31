#!/bin/sh
# Xcode Cloud runs this before the xcodebuild action. It stamps both version
# fields so every push produces a unique, monotonically increasing release:
#
#   CFBundleVersion (build number)        = CI_BUILD_NUMBER
#   CFBundleShortVersionString (marketing)= MAJOR.MINOR.CI_BUILD_NUMBER
#
# You control MAJOR.MINOR by editing CFBundleShortVersionString in the plist
# (and project.yml) — e.g. set it to "1.1" to start the 1.1.x line. The patch
# component is the CI build number, so each public App Store release is always
# greater than the last without manual bumping. App Store Connect rejects
# duplicate build numbers and non-increasing versions; this avoids both.
set -e

PLIST="$CI_PRIMARY_REPOSITORY_PATH/macos/ConceptMapper/Info.plist"

if [ -z "$CI_BUILD_NUMBER" ] || [ ! -f "$PLIST" ]; then
  echo "ci_pre_xcodebuild: CI_BUILD_NUMBER unset or plist missing; leaving versions unchanged"
  exit 0
fi

# Build number → CFBundleVersion
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CI_BUILD_NUMBER" "$PLIST"

# Marketing version → MAJOR.MINOR (from the plist) + CI build number
BASE=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PLIST" 2>/dev/null | cut -d. -f1-2)
[ -z "$BASE" ] && BASE="1.0"
MARKETING="$BASE.$CI_BUILD_NUMBER"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MARKETING" "$PLIST"

echo "ci_pre_xcodebuild: CFBundleVersion=$CI_BUILD_NUMBER  CFBundleShortVersionString=$MARKETING"
