# TODO

Live plan to a testable, shippable build. Completed tasks are deleted, not
checked off.

> **Distribution change (2026-06):** Concept Mapper has left the Mac App Store.
> It now ships as a **free, notarised Developer ID DMG** (direct download, hosted
> on fly.io) — see [`RELEASING.md`](RELEASING.md). The planned **iOS App Store
> product has been dropped**; the `ios/` shell and the two-app no-drift invariant
> are retired. **Sessions 4–6 below (signing for App Store, paid iOS, Xcode Cloud,
> TestFlight) are cancelled** and kept only as history.

**Distribution:** free macOS app, direct download. No App Store, no iOS product,
no payment. Updates are manual re-download, so the app stays fully offline.

## Status

The shared React SPA carries every feature (map, textmap, notes, view
persistence, add-node). macOS app builds/ships. The iPhone+iPad app builds and
runs on iPhone 17 + iPad (A16) simulators.

Session 2 (responsive mobile UX) is done, and iPhone + iPad now share **one iOS
layout**: a compact, single-surface shell with a persistent bottom tab bar —
Map, Explore (sidebar), Details (Properties), Analysis, Notes — each filling the
screen. The compact layout is used on any iOS device (`isIOSDevice()`, so iPad
gets it despite its width) or a phone-class browser viewport; macOS/desktop keep
the inline panels. The Map-tab activity rail hides the sidebar/properties/notes/
analysis toggles (they are tabs now); view defaults to textmap; touch targets
≥40px; tab bar owns the home-indicator safe area; no horizontal overflow
(REQ-119). Verified: XCUITest `testTabBarSurfaces` passes on iPhone 17 **and**
iPad A16 (walks all five tabs); Playwright at 390×844 confirms each tab swaps the
full-screen surface; macOS still builds with the inline layout unchanged.
Remaining work is sessioned below.

## Session 3 — iOS file features on device  ← DONE

- [x] Verify `UIDocumentPicker` open/attach and share-sheet export end to end on
      the simulator; fix any presentation/sandbox issues. **No presentation/sandbox
      bug found.** `FileHandler.pickDocument` (open + attach) and `presentShareSheet`
      (export) share one `topViewController().present(...)` path; the iOS
      `testOpenFilePresentsDocumentPicker` XCUITest presents the picker with no crash.
      Attach + export are *triggered from web content*, and XCUITest cannot reliably
      tap inside the WKWebView (a synthesized tap lands as `:hover` without firing
      React's onClick — confirmed via a Playwright browser repro where the same flow
      works). So the web side is verified end-to-end in `web/e2e/file-flows.spec.ts`
      (Playwright, production build) asserting the exact `attachNotesFile` /
      `saveToDownloads` bridge calls. Split by tool, on purpose (REQ-124).
- [x] Shared iCloud Documents container so Maps + Templates sync across the macOS
      and iOS apps (`FileHandler.getBaseFolder` prefers the ubiquity container, falls
      back to local Documents; entitlements + `NSUbiquitousContainers` on both;
      `build-app.sh` gains `-allowProvisioningUpdates`). Both apps build unsigned;
      live iCloud sync needs the provisioned container (Session 4 signing) (REQ-123).

## Session 4 — Signing + App Store Connect (paid iOS) + Xcode Cloud

- [ ] Register the iOS App ID + a new (paid) App Store Connect app record; set a
      price tier. **(Portal work — yours to do; can't be scripted.)** Bundle id
      `com.dromologue.ConceptMapper.ios`; then create the iOS Xcode Cloud workflow
      per `RELEASING.md` → "The iOS app — a second, separate workflow".
- [x] iOS `ci_pre_xcodebuild.sh` version stamping. The one shared CI script is now
      platform-aware: it selects `macos/` vs `ios/ConceptMapper/Info.plist` from
      `CI_PRODUCT_PLATFORM` (path-fallback otherwise), so the two products' version
      trains advance independently — verified the iOS run leaves the macOS plist
      untouched and vice-versa. The **second Xcode Cloud workflow** (iOS archive →
      TestFlight → App Store) is GUI setup, now documented in `RELEASING.md`.

## Session 5 — Release docs + TestFlight

- [x] Expand in-app help (`web/src/help/content.ts`) for textmap inline notes +
      view persistence + add-node. The "Textmap: The Outline View" section now
      covers: inline notes (read/edit, Attach/Detach .md, one-line collapsed
      preview), the add-node (＋) button for building a map from the outline, and
      the layout preset persisting into the map's `<!-- view: … -->` line.
- [~] Regenerate + push the public support site with textmap + iOS details.
      **Drafted (not pushed).** `scripts/gen-support-site.mjs` now emits the iOS
      + textmap marketing copy: a "navigable outline" feature, an "On the Mac
      today — iPhone and iPad too" platforms band, Mac+iPhone+iPad title and
      hero/req copy. The help page already inherits the expanded Textmap
      section. Generation verified locally (`node scripts/gen-support-site.mjs`
      → `/support-site`, gitignored). **Still to do at release:** drop an iPhone
      textmap screenshot into `Previews/`, set that feature's `img` + the iOS
      App Store URL, regenerate, and push to `dromologue/conceptmapper-support`.
- [ ] Cut a TestFlight build; test on a real iPhone/iPad.  ← **testable version**

## Session 6 — Ship

- [ ] Merge `feature/multiplatform` → `master` (full build + smoke test first).
- [ ] Submit the paid iOS app for review.

## Drift guards (ongoing — protect the no-drift invariant)

- [x] Bridge parity test: `web/src/__tests__/bridge-parity.test.ts` parses the
      Swift `BridgeMethod` enum and the TS `BridgeRequestMap`/`BridgeEventMap`
      keys and asserts the sets are equal (+ request/event disjoint). A method
      added on one side without the other now fails `npm test`. Since the Swift
      file is shared verbatim into iOS, this covers both apps (REQ-112 follow-up).
- [x] CI (branch check): build **both** apps so a change that breaks either
      platform fails before merge. `.github/workflows/apps.yml` runs on a macOS
      runner (on pushes to `feature/multiplatform` and PRs into master) and calls
      `scripts/build-app.sh --platform=all --verify` — unsigned, using committed
      `Resources/web`, so it gates the Swift shells, `project.yml`, and the
      bridge↔FileHandler contract. Validated locally: both apps BUILD SUCCEEDED,
      verify path exits 0. Scoped to branches that carry `ios/` (master doesn't).
- [ ] When adding a bridge method: edit `BridgeProtocol.swift` + `bridge-protocol.ts`
      together; the shared dispatcher compiling into both targets enforces the
      `FileHandler` contract automatically.
