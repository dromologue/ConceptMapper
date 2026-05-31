# TODO

Live list of remaining work. Completed tasks are deleted, not checked off.
Branch: `feature/multiplatform` (nothing merges to `master` until build-verified —
`master` auto-ships to the App Store).

## Phase 2 — iOS app (iPhone + iPad, universal, iOS 16, shared bundle id)

### BLOCKED — install the iOS platform for Xcode
The active Xcode ships the iOS 26.5 SDK but the iOS **platform/simulator runtime
is not installed** (only an incompatible iOS 18.5 runtime from a prior Xcode).
`xcodebuild` reports no eligible iOS destination, so the iOS app cannot be
compiled or run here yet.
- [ ] **USER ACTION:** Xcode → Settings → Components → install the iOS platform
      (iOS 26.5 simulator runtime). Then the tasks below can proceed.

### Done (created, not yet compiled — pending the platform install)
iOS shell + project all written and the Xcode project generates:
`ios/ConceptMapper/{ConceptMapperApp,ContentView,FileHandler}.swift`,
`Info.plist`, `Assets.xcassets`, `ios/project.yml`, `ios/Resources/*`. Shared
bridge gained an iOS URL opener (macOS build verified unaffected).

### Build & test on simulators (after platform install)
- [ ] Build for **iPhone 16** + **iPad Pro 11"** simulators; fix any compile errors.
- [ ] Extend `scripts/build-app.sh` — copy web assets to `ios/Resources/web`;
      add `--platform mac|ios|all`; generate + build ios.
- [ ] Boot simulators, install, launch; verify SPA loads → open a bundled map →
      map renders → switch to textmap. Capture screenshots.
- [ ] Commit refreshed `ios/Resources/web` + generated `ios/*.xcodeproj`.

### iOS visual testing (XCUITest)
- [ ] Add a UI test target; screenshot tests on iPhone + iPad sims (map + textmap).

## Release (when Phase 2 verified)
- [ ] Expand in-app help (`web/src/help/content.ts`) — textmap inline notes +
      view-option persistence.
- [ ] Regenerate + push public support site (`scripts/gen-support-site.mjs`) with
      textmap + iOS details.
- [ ] App Store Connect: add iOS platform to the existing app record; screenshots
      (iPad map, iPhone textmap); universal purchase.
- [ ] Merge `feature/multiplatform` → `master` after full build + smoke test.
