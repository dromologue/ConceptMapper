# TODO

Live plan to a testable, shippable build. Completed tasks are deleted, not
checked off. Branch: `feature/multiplatform` — nothing merges to `master` until
build-verified (`master` auto-ships the **free** macOS app to the App Store).

**Pricing:** macOS app is **free**; iOS app is a **separate, paid** App Store
product (distinct bundle id `com.dromologue.ConceptMapper.ios` — not a universal
purchase).

## Status

The shared React SPA carries every feature (map, textmap, notes, view
persistence, add-node). macOS app builds/ships. The universal iOS app builds and
runs on iPhone 17 + iPad (A16) simulators (start screen, bridge, bundled content
verified). Remaining work is sessioned below.

## Session 2 — Responsive mobile UX (iPhone)  ← NEXT

The XCUITest screenshots show the explorer sidebar takes most of the iPhone
width, squeezing the textmap. Fix the phone layout:

- [ ] On phone: collapse the sidebar behind a toggle/drawer so the textmap (or
      canvas) gets full width by default.
- [ ] Properties + Notes as bottom sheets (not side panels) on phone.
- [ ] Touch-sized targets, safe-area insets, no horizontal overflow.
- [ ] Verify each at iPhone size via the XCUITest screenshots; no desktop regress.

## Session 3 — iOS file features on device

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
