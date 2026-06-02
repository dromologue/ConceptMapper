# Releasing — Xcode Cloud → App Store

Concept Mapper releases through **Xcode Cloud**. A push to GitHub builds the
app, signs it, and uploads it to App Store Connect with no local steps.

## What "every push releases" means (and its limits)

The configured intent is: every push to `master` builds to TestFlight **and**
submits the build for App Store review. Versions auto-bump (see "Versioning"),
so each push is a distinct, monotonically increasing release with no manual
edits. The one constraint no automation can remove:

- **Apple review is mandatory** for every *public* App Store release (minutes
  to ~a day). TestFlight *internal* builds skip review and appear in minutes.

So in practice: pushes flow to TestFlight automatically and continuously, and
each is queued for App Store review automatically; the only gate left is
Apple's approval.

## One-time setup in App Store Connect / Xcode

`ci_scripts/ci_pre_xcodebuild.sh` (build-number stamping) is already in the
repo. The workflow itself is created in the GUI:

1. Xcode ▸ Product ▸ **Xcode Cloud ▸ Create Workflow** (or App Store Connect ▸
   your app ▸ **Xcode Cloud**). Point it at `macos/ConceptMapper.xcodeproj`,
   scheme **ConceptMapper**.
2. **Start Condition**: *Branch Changes* on `master`.
3. **Action**: *Archive*, platform macOS, scheme ConceptMapper (Release).
4. **Post-Actions**:
   - *TestFlight (Internal Testing)* — add yourself as an internal tester.
   - *TestFlight & App Store* — to push the build toward a public release.
5. In **App Store Connect ▸ App Store ▸ [version]**, set *Automatically release
   this version* and (optionally) enable auto-submit for review, so an approved
   build ships without a manual click.

The build number is set automatically by `ci_pre_xcodebuild.sh` from
`CI_BUILD_NUMBER` — do not hand-edit `CFBundleVersion`.

## The iOS app — a second, separate workflow (paid product)

The iOS app is a **separate App Store product** (paid; distinct bundle id
`com.dromologue.ConceptMapper.ios`), so it gets its **own** App Store Connect
record and its **own** Xcode Cloud workflow alongside the macOS one. Set it up
the same way, with these differences:

1. Create a new App Store Connect app record for `com.dromologue.ConceptMapper.ios`
   and set a **price tier** (the macOS app stays free; this is why it can't be a
   universal purchase).
2. Xcode Cloud ▸ **Create Workflow**, pointed at `ios/ConceptMapper.xcodeproj`,
   scheme **ConceptMapper** (the iOS scheme shares the name).
3. **Start Condition**: *Branch Changes* on `master`.
4. **Action**: *Archive*, platform **iOS**, Release.
5. **Post-Actions**: *TestFlight* and, when ready, *TestFlight & App Store*.

Both workflows run the same `ci_scripts/ci_pre_xcodebuild.sh`. The script picks
the right `Info.plist` from `CI_PRODUCT_PLATFORM` (`macOS` vs `iOS`), so each
product's version train advances independently — the macOS build never stamps
the iOS plist and vice-versa.

## Versioning

`ci_scripts/ci_pre_xcodebuild.sh` stamps both fields on every Xcode Cloud build:

- **`CFBundleVersion` (build number)** = `CI_BUILD_NUMBER`. Automatic, monotonic.
- **`CFBundleShortVersionString` (marketing version)** = `MAJOR.MINOR.CI_BUILD_NUMBER`.
  The `MAJOR.MINOR` part is read from the plist's current value; the patch is the
  CI build number, so every public release is strictly greater than the last
  with no manual bump.

The script is platform-aware: it stamps `macos/ConceptMapper/Info.plist` for the
macOS workflow and `ios/ConceptMapper/Info.plist` for the iOS workflow, selected
by `CI_PRODUCT_PLATFORM` (falling back to the building project's path). The two
apps therefore keep independent `MAJOR.MINOR` lines.

You only touch versioning to start a new **major/minor line**: edit
`CFBundleShortVersionString` in [`macos/project.yml`](macos/project.yml) and
`macos/ConceptMapper/Info.plist` (e.g. `1.0` → `1.1`), run `scripts/build-app.sh`
to regenerate the committed project, and commit. From then on pushes produce
`1.1.<build>`. Do not hand-edit build numbers — CI owns them.
