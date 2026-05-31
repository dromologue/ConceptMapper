# TODO

Live list of remaining work. Completed tasks are deleted, not checked off.
Branch: `feature/multiplatform` (nothing merges to `master` until build-verified —
`master` auto-ships to the App Store).

## Phase 2 — iOS app (iPhone + iPad, universal, iOS 16, shared bundle id)

iOS 26.5 platform installed. The universal app **builds and runs on iPhone 17
and iPad (A16) simulators**; the SPA loads, the bridge populates Templates/Maps,
and bundled content hydrates. `scripts/build-app.sh` now mirrors web assets into
`ios/Resources`.

### Remaining
- [ ] Extend `scripts/build-app.sh` with `--platform mac|ios|all` to also
      generate + build (and optionally run) the iOS target.
- [ ] Interactive verification: open a bundled map on the iPhone sim → confirm it
      defaults to the textmap; open on iPad → confirm the visual map. (Needs a tap
      driver — fold into the XCUITest task below.)

### iOS visual testing (XCUITest)
- [ ] Add a UI test target; screenshot tests on iPhone + iPad sims that open a map
      and capture the map + textmap (also serves the interactive verification above).

## Release (when Phase 2 verified)
- [ ] Expand in-app help (`web/src/help/content.ts`) — textmap inline notes +
      view-option persistence.
- [ ] Regenerate + push public support site (`scripts/gen-support-site.mjs`) with
      textmap + iOS details.
- [ ] App Store Connect: add iOS platform to the existing app record; screenshots
      (iPad map, iPhone textmap); universal purchase.
- [ ] Merge `feature/multiplatform` → `master` after full build + smoke test.
