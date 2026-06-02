# TODO

Live plan to a testable, shippable build. Completed tasks are deleted, not
checked off. Branch: `feature/multiplatform` — nothing merges to `master` until
build-verified (`master` auto-ships the **free** macOS app to the App Store).

**Pricing:** macOS app is **free**; iOS app is a **separate, paid** App Store
product (distinct bundle id `com.dromologue.ConceptMapper.ios` — not a universal
purchase).

**No-drift invariant.** One codebase; the two apps differ **only** in (a) bundle
id + price, and (b) the thin native shell (`ContentView`/`FileHandler`/app entry/
`Info.plist`/`project.yml`/assets). The React SPA (`web/`), Rust core (`src/`),
and Swift bridge core (`BridgeProtocol`/`WebViewBridge`/`PlatformURLOpener`, shared
into iOS via `ios/project.yml`) are single-source-of-truth — a feature or bridge
change lands in one place and reaches both. Anything else diverging is a bug.
Full drift surface in `specs/multiplatform-plan.md` §3.1.

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

## Session 3 — iOS file features on device  ← NEXT

- [ ] Verify `UIDocumentPicker` open/attach and share-sheet export end to end on
      the simulator; fix any presentation/sandbox issues.

## Session 4 — Signing + App Store Connect (paid iOS) + Xcode Cloud

- [ ] Register the iOS App ID + a new (paid) App Store Connect app record; set a
      price tier.
- [ ] iOS `ci_pre_xcodebuild.sh` version stamping; a second Xcode Cloud workflow
      (iOS archive → TestFlight → App Store).

## Session 5 — Release docs + TestFlight

- [ ] Expand in-app help (`web/src/help/content.ts`) for textmap inline notes +
      view persistence + add-node.
- [ ] Regenerate + push the public support site with textmap + iOS details.
- [ ] Cut a TestFlight build; test on a real iPhone/iPad.  ← **testable version**

## Session 6 — Ship

- [ ] Merge `feature/multiplatform` → `master` (full build + smoke test first).
- [ ] Submit the paid iOS app for review.

## Drift guards (ongoing — protect the no-drift invariant)

- [ ] Bridge parity test: assert Swift `BridgeMethod` and TS
      `BridgeRequestMap`/event methods enumerate the same set (REQ-112 follow-up).
- [ ] CI (Xcode Cloud / branch check): build **both** apps so a change that breaks
      either platform fails before merge (`build-app.sh --platform all`).
- [ ] When adding a bridge method: edit `BridgeProtocol.swift` + `bridge-protocol.ts`
      together; the shared dispatcher compiling into both targets enforces the
      `FileHandler` contract automatically.
