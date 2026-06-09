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
#
# Two separate App Store products share this one script: the FREE macOS app and
# the PAID iOS app (distinct bundle ids, separate App Store Connect records and
# Xcode Cloud workflows). Both schemes are named "ConceptMapper", so the scheme
# name cannot disambiguate them — we select the plist by CI_PRODUCT_PLATFORM
# (set by Xcode Cloud to "macOS", "iOS", etc.), falling back to the building
# project's path. Each app's MAJOR.MINOR line is owned by its own plist, so the
# two version trains advance independently.
set -e

REPO="$CI_PRIMARY_REPOSITORY_PATH"
MAC_PLIST="$REPO/macos/ConceptMapper/Info.plist"
IOS_PLIST="$REPO/ios/ConceptMapper/Info.plist"

# Resolve which app this build is for.
case "$CI_PRODUCT_PLATFORM" in
  iOS|"iOS Simulator")
    PLIST="$IOS_PLIST"; PLATFORM="iOS" ;;
  macOS)
    PLIST="$MAC_PLIST"; PLATFORM="macOS" ;;
  *)
    # No platform hint — fall back to the project path Xcode Cloud is building,
    # then to macOS (the original, free product).
    case "$CI_XCODE_PROJECT" in
      */ios/*) PLIST="$IOS_PLIST"; PLATFORM="iOS" ;;
      *)       PLIST="$MAC_PLIST"; PLATFORM="macOS" ;;
    esac ;;
esac

if [ -z "$CI_BUILD_NUMBER" ] || [ ! -f "$PLIST" ]; then
  echo "ci_pre_xcodebuild: CI_BUILD_NUMBER unset or plist missing ($PLIST); leaving versions unchanged"
  exit 0
fi

# Build number → CFBundleVersion
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CI_BUILD_NUMBER" "$PLIST"

# Marketing version → MAJOR.MINOR (from the plist) + CI build number
BASE=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PLIST" 2>/dev/null | cut -d. -f1-2)
[ -z "$BASE" ] && BASE="1.0"
MARKETING="$BASE.$CI_BUILD_NUMBER"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MARKETING" "$PLIST"

echo "ci_pre_xcodebuild: platform=$PLATFORM plist=$PLIST CFBundleVersion=$CI_BUILD_NUMBER CFBundleShortVersionString=$MARKETING"
