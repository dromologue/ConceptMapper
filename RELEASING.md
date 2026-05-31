# Releasing — Xcode Cloud → App Store

Concept Mapper releases through **Xcode Cloud**. A push to GitHub builds the
app, signs it, and uploads it to App Store Connect with no local steps.

## What "every push releases" means (and its limits)

The configured intent is: every push to `master` builds to TestFlight **and**
submits the build for App Store review. Two hard constraints from Apple that no
automation can remove:

1. **Apple review is mandatory** for every *public* App Store release (minutes
   to ~a day). TestFlight *internal* builds skip review and appear in minutes.
2. **Each public App Store version needs a unique marketing version**
   (`CFBundleShortVersionString`). Build-number bumps alone let you upload many
   builds, but App Store Connect will not accept a *second public release* under
   a version string (e.g. `1.0`) that is already released. See "Versioning".

So in practice: pushes flow to TestFlight automatically and continuously; a
public release still needs a version bump and an approval.

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

## Versioning

- **`CFBundleVersion` (build number)** — stamped automatically per build. Ignore.
- **`CFBundleShortVersionString` (marketing version)** — currently `1.0`, set in
  [`macos/project.yml`](macos/project.yml) and `macos/ConceptMapper/Info.plist`.
  Bump this (e.g. `1.0.1`, `1.1`) **before the push that should become a new
  public App Store release**, then run `scripts/build-app.sh` to regenerate the
  committed project, and commit. Until you bump it, repeated pushes keep landing
  on TestFlight under the same version rather than spawning new store releases.

> If you would rather every push auto-produce a distinct store version without
> manual bumps, the build-number script can also stamp the marketing version as
> `1.0.$CI_BUILD_NUMBER`. That is monotonic and valid, but produces fast-moving
> version numbers; it is left off by default in favour of intentional bumps.
