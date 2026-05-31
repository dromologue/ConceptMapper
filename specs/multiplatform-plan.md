# Multiplatform Plan — iPad & iPhone, plus the Textmap view

Status: PLAN (not yet implemented). Author-driven; no code committed against this
document yet. This plan deliberately front-loads release safety because the macOS
app auto-deploys to the App Store.

## 0. Guardrails (read first)

1. **`master` → App Store is live.** Xcode Cloud archives and submits the macOS
   app on every push to `master` (see [RELEASING.md](../RELEASING.md)).
2. **Web changes reach the store too.** The React build is committed into
   `macos/Resources/web` (the committed-artifacts rule). So a *web-only* change —
   including the textmap view — ships to the macOS App Store the moment it lands
   on `master`. There is no such thing as a "safe web-only" change on `master`.
3. **Therefore:** all work in this plan happens on a long-lived branch
   `feature/multiplatform`. Nothing merges to `master` until the macOS app is
   built and launched clean. No macOS shell change is committed to `master`
   until verified (user instruction, 2026-05-31).
4. We add a **build-only verification** path (CI and local) so we can prove a
   build before any release-bearing merge.

## 1. Goal & guiding principle

Ship native iPad and iPhone apps with **maximum code consistency** to the macOS
app, so features never drift between platforms. On iPhone (and as an option
everywhere) provide a **textmap**: the graph rendered as a navigable nested
outline instead of the visual canvas.

**The anti-drift principle:** there is exactly one implementation of every
user-facing feature — the React SPA. macOS, iPadOS, and iOS are thin native
shells hosting that same bundled SPA over the same typed bridge. We do **not**
reimplement any feature in native SwiftUI. A feature added to the SPA appears on
all three platforms simultaneously, by construction.

## 2. Target architecture

```
            ┌──────────────────────────────────────────────┐
            │  Rust core parser  →  Graph IR  (WASM)        │   one codebase
            └──────────────────────────────────────────────┘
                                  │
            ┌──────────────────────────────────────────────┐
            │  React SPA (web/)  — ALL features live here   │   one codebase
            │  • visual map (D3)   • textmap (NEW)          │
            │  • responsive: phone defaults to textmap      │
            └──────────────────────────────────────────────┘
                                  │ bundled identical into each shell
        ┌───────────────┬─────────┴───────────┬────────────────┐
        │ macOS shell   │  iOS shell (NEW)     │  iOS shell      │
        │ (AppKit)      │  iPad (UIKit)        │  iPhone (UIKit) │  ← one iOS target,
        │ WKWebView     │  WKWebView           │  WKWebView      │    universal
        └───────────────┴──────────────────────┴────────────────┘
                 shared Swift BridgeCore (compiled into both targets)
```

- **One iOS target**, universal (iPhone + iPad). Adaptive layout is the SPA's job,
  not the shell's.
- **Swift sharing:** a shared `BridgeCore` group (the portable bridge code)
  compiled into both the macOS and iOS targets; only the shell (web-view wrapper,
  file I/O, app entry) is platform-specific.

## 3. Anti-drift strategy (the heart of the request)

| Mechanism | What it guarantees |
|---|---|
| Single React SPA bundled into every shell | One implementation of every feature; no native re-build |
| Shared `BridgeCore` Swift sources compiled into both targets | macOS and iOS speak an identical bridge; divergence fails to compile |
| One web/WASM build, copied to **both** `macos/Resources/web` and `ios/Resources/web` in the same build step | The two shells can never bundle different SPA versions |
| `bridge-protocol.ts` ↔ `BridgeProtocol.swift` parity (already REQ-112) | Adding a bridge method forces both sides; we add a parity test (§8) |
| CI builds **all three** platforms on the branch | A change that breaks any platform fails fast, before merge |
| Textmap is a *view mode in the SPA*, not a platform feature | "Add textmap to mac and ipad too" is automatic — same code path |

The only platform-specific surface is the shell: file dialogs, the web-view
wrapper, app lifecycle/menus, signing/entitlements. Everything a user *sees and
does* is shared.

## 4. The Textmap view — detailed spec

### 4.1 Concept

The graph is a directed/undirected graph with cycles. The textmap is a **tree
projection** of that graph: pick a root, list its connected nodes as child rows;
each child can expand to show *its* connections, recursively, enabling navigation
across the whole graph by outline.

### 4.2 Data source

Consumes the existing in-memory `GraphIR` directly (`web/src/types/graph-ir.ts`):
- `GraphNode { id, node_type, name, classifiers, properties, tags, notes }`
- `GraphEdge { from, to, edge_type, directed, weight, note, visual }`

No new parser/IR work. The outline derives entirely from `nodes` + `edges`.

### 4.3 Structure of a row

For a node row, expanding it reveals its connections, **grouped by relationship**:
- For **directed** edges: two groups — outgoing (`name →`, labelled by
  `edge_type`) and incoming (`← name`).
- For **undirected** edges: one "connected" group.
- Group headers show the edge-type label and a count, e.g. `originates → (3)`.
- Each connection is itself a node row (recursively expandable).

Each row shows: node-type icon/badge, node name, and a disclosure control.

### 4.4 Interactions

- **Tap node name** → selects the node (drives the existing Properties panel /
  Notes), exactly like clicking a node on the canvas. Reuses `handleSelectNode`.
- **Tap disclosure** → expand/collapse that node's connections inline.
- **Tap "focus"** (or long-press) → re-root the outline on that node; a
  **breadcrumb trail** at the top records the path and lets you walk back.
- **Search** (existing Cmd+K / title search) → jumps to and reveals a node in the
  outline.
- Respects active **filters** (classifier/tag/attribute) for consistency with the
  canvas — hidden nodes don't appear as rows.

### 4.5 Cycle & revisit handling (correctness-critical)

- Track the **ancestor path** (Set of node ids from root to current row). If a
  connection's target is already an ancestor, render it as a **leaf with a "loop"
  marker** (a back-link you can tap to jump to that ancestor) — never expand it,
  to avoid infinite recursion.
- A target already visited elsewhere (not an ancestor) is shown normally but
  marked as a **cross-link** so the user understands it appears more than once.
- Hard depth cap (configurable, e.g. 50) as a backstop.

### 4.6 Roots

- If the graph has natural roots (directed graph: in-degree 0), show them as the
  top level.
- If there are none (fully cyclic / undirected), show **all nodes** as a flat,
  searchable top level (sorted), each expandable. The user re-roots by focusing.

### 4.7 Where it plugs in (grounded in current code)

- New view mode `"textmap"` added in `web/src/ui/ActivityBar.tsx` (alongside
  `"full"` and the per-node-type modes). `viewMode` already lives in
  `useGraphStore`.
- Dispatch in `App.tsx`'s editor area: render `<TextmapView/>` when
  `viewMode === "textmap"`, else `<GraphCanvas/>`. (Today there is no branch —
  GraphCanvas renders unconditionally; we add the branch.)
- New component `web/src/views/TextmapView.tsx` + `TextmapRow.tsx`. Pure
  React/TS; consumes `graphData`, reuses `handleSelectNode`/`handleSelectEdge`.
- Local UI state (expanded set, current root, breadcrumb) stays in
  `useState`/`useRef` per State Discipline; `viewMode` stays in the store.

### 4.8 Tests

Vitest unit tests for the tree-projection logic: connection grouping by
direction/type, cycle → loop-marker (no infinite recursion), revisit →
cross-link, root detection (with and without natural roots), filter respect.
Component tests for expand/collapse, focus/re-root + breadcrumb, select.

## 5. Responsive / adaptive behaviour

Today the SPA has **no responsive handling** (fixed activity bar 48px, sidebar
250px, aux panel 340px; canvas sized to container). We add:

- `web/src/hooks/useViewport.ts` — `{ width, height, kind: 'phone'|'tablet'|'desktop' }`
  from `window` + `matchMedia`, updated on resize. Breakpoints (initial):
  phone `< 700px`, tablet `700–1024px`, desktop `> 1024px`.
- **Phone**: default `viewMode` to `"textmap"`; the visual map remains reachable
  but is not the default (small screens can't use it well). Activity bar and
  sidebar collapse into a drawer / bottom toolbar; Properties and Notes become
  full-screen sheets rather than side panels.
- **Tablet (iPad)**: full visual map *and* textmap option, like macOS. Side
  panels keep their desktop behaviour but with touch-sized targets.
- **Desktop (macOS)**: unchanged, plus the textmap option in the activity bar.
- Touch: canvas pan/zoom already uses pointer events; we audit hit-target sizes
  and add momentum/gesture polish where needed.

CSS: introduce media queries in `App.css` (currently none). No layout regression
on desktop — desktop rules are the default; phone/tablet are overrides.

## 6. iOS app target — structure & Swift sharing

### 6.1 Swift refactor (macOS-affecting — branch only, build-verified)

1. Create a **shared group** `shared/Bridge/` containing the portable bridge
   code: `BridgeProtocol.swift` (already 100% Foundation) and the portable parts
   of `WebViewBridge.swift`.
2. Abstract the single AppKit dependency in `WebViewBridge.swift`
   (`NSWorkspace.shared.open` in the `openURL` case) behind a small protocol
   `PlatformURLOpener` injected by each shell (macOS: `NSWorkspace`; iOS:
   `UIApplication.shared.open`).
3. The macOS target keeps building byte-for-byte equivalent behaviour. **Verify
   by building and launching the macOS app** before this is allowed near `master`.

### 6.2 New iOS files (`ios/`)

- `ios/project.yml` — XcodeGen, `platform: iOS`, deploymentTarget iOS (proposed
  16.0), no hardened runtime, automatic signing, team `4EDT4L4DYU`.
- `ios/ConceptMapper/ConceptMapperApp.swift` — `@main`, UIKit lifecycle, no macOS
  menus (commands become an in-SPA/native toolbar where needed).
- `ios/ConceptMapper/ContentView.swift` — `UIViewRepresentable` wrapping
  `WKWebView`; identical configuration and the **same two bridge channels**
  (`bridge`, `jsLog`), same `loadFileURL(...allowingReadAccessTo:)`, same
  `window.__bridge_receive` callback.
- `ios/ConceptMapper/FileHandler.swift` — same public interface as the macOS one;
  implementations swap `NSOpenPanel`/`NSSavePanel` for
  `UIDocumentPickerViewController`, exports via `UIActivityViewController` /
  `Documents/` (and image export via share sheet or Photos). FileManager/Bundle
  logic is shared verbatim.
- `ios/ConceptMapper/Info.plist`, `*.entitlements` (minimal — iOS has no
  app-sandbox file entitlements), `Assets.xcassets` (icon, launch screen),
  document-type registration for `.cm`/`.cmt`, and `UIFileSharingEnabled` +
  `LSSupportsOpeningDocumentsInPlace` so maps appear in the Files app.
- `ios/Resources/web`, `ios/Resources/templates`, `ios/Resources/maps` — the
  bundled SPA + assets (committed, like macOS, for Xcode Cloud).

### 6.3 Bundle ID & universal purchase (DECIDED)

The iOS app uses the **same** bundle id as macOS
(`com.dromologue.ConceptMapper`) → **universal purchase**, one buy spanning
Mac + iPhone + iPad. In App Store Connect the iOS build is added as a **new
platform on the existing app record**, not a separate record — one listing, one
set of metadata, shared reviews. The macOS auto-bump versioning scheme
(`MAJOR.MINOR.CI_BUILD_NUMBER`) applies per-platform.

## 7. Build, CI, versioning & release safety

### 7.1 Build script

Extend `scripts/build-app.sh`:
- Steps 1–3 (Rust test, web test, WASM, `npm run build`) are **shared, run once**.
- Step 4 copies `web/dist` + templates + maps into **both** `macos/Resources/web`
  **and** `ios/Resources/web`.
- Add `--platform mac|ios|all` to choose which Xcode project(s) to generate/build.
- Add a `--verify` (build-only, no archive, `CODE_SIGNING_ALLOWED=NO`) mode used
  by the safety gate.

### 7.2 CI / Xcode Cloud

- **Branch build-check workflow** (build-only, no submit) on `feature/multiplatform`
  for both macOS and iOS, so we know both compile before any merge.
- **Second release workflow** for the iOS app (Archive → TestFlight → App Store),
  mirroring the macOS one. `ci_scripts/ci_pre_xcodebuild.sh` is extended to stamp
  the **correct** Info.plist based on `$CI_XCODE_SCHEME`/`$CI_PRODUCT` (mac vs iOS),
  reusing the existing `MAJOR.MINOR.CI_BUILD_NUMBER` scheme.
- macOS release workflow stays as-is, but **textmap reaches the macOS store only
  when we deliberately merge the branch to `master`.**

### 7.3 Release safety gate (enforces the guardrail)

Before any merge of `feature/multiplatform` (or any subset) into `master`:
1. `cargo test --all` and `cd web && npm test` green.
2. `scripts/build-app.sh --platform all --verify` succeeds (mac **and** iOS build).
3. macOS app launched and smoke-tested (map + textmap), because this push ships
   to the macOS store.
4. Only then merge; the existing pipeline submits the macOS build.

## 8. SDD — new requirements & tests

Add to `SPEC.md` (and `TRACEABILITY.md`) when work starts:
- **REQ-1xx Textmap view** — outline projection, grouping, navigation; ACs for
  cycle/revisit handling, root detection, filter respect, selection parity.
- **REQ-1xx Responsive shell** — viewport hook, phone defaults to textmap, panel
  adaptation; ACs per breakpoint.
- **REQ-1xx iOS shell parity** — same bundled SPA, same bridge channels, file I/O
  parity (open/save/list/attach), document-type handling.
- **REQ-1xx Bridge parity guard** — a test asserting `BridgeMethod` (Swift) and
  `BridgeRequestMap`/event methods (TS) enumerate the same set (parse both,
  diff). Prevents silent drift.

Tests: Vitest for textmap + responsive logic; Rust unchanged; an iOS smoke build
in CI; the parity test in the web suite.

## 9. Phased rollout (each phase gated by §7.3 before any master merge)

- **Phase 0 — Foundations (branch).** Create `feature/multiplatform`. Add
  build-only verify mode + branch CI. Swift refactor: extract `BridgeCore`,
  `PlatformURLOpener`. Verify macOS builds & launches unchanged. *No master merge.*
- **Phase 1 — Textmap in the SPA.** `useViewport`, `TextmapView`/`TextmapRow`,
  view-mode wiring, responsive defaults, CSS. Vitest tests. Verify in the macOS
  app. This is the first thing that *could* ship to the macOS store — merge to
  master only when you want macOS users to get textmap.
- **Phase 2 — iOS target.** `ios/` project, shells, FileHandler(iOS), assets,
  entitlements; extend build script; iOS simulator build; TestFlight (iOS).
  Iterate on phone layout against the textmap.
- **Phase 3 — Release.** App Store record(s) for iOS (universal iPhone/iPad),
  screenshots (map on iPad, textmap on iPhone), pricing / universal purchase.
  macOS picks up textmap in the same release train.
- **Phase 4 — Drift guards.** Bridge-parity test in CI; document the "one SPA,
  thin shells" rule in `CLAUDE.md`/architecture principles.

## 10. App Store & public-site updates

- New iOS app record (or universal purchase under the existing id — §12).
- Screenshots: iPad showing the visual map; iPhone showing the textmap.
- Per the standing rule, regenerate and push the **public support/marketing
  site** ([scripts/gen-support-site.mjs](../scripts/gen-support-site.mjs)): add
  iPhone/iPad to the marketing copy, a textmap help section (it will already
  appear in the in-app help once added to `web/src/help/content.ts`), and
  iOS screenshots.

### Release-time docs checklist (textmap on Mac)

When this branch ships, before/with the release:

- [ ] **In-app help** (`web/src/help/content.ts`): expand the existing
  "Textmap: The Outline View" section to cover the inline **editable notes**
  (read preview + per-node editor saving to the map / attached `.md`) and the
  **layout-preset persistence** (the chosen view now saves with the map). The
  section predates these.
- [ ] **Public support site**: regenerate (`scripts/gen-support-site.mjs`) and
  push to `dromologue/conceptmapper-support` so the textmap help — and a
  marketing mention of the outline view on Mac/iPad/iPhone — go live. Held back
  during development because the public site mirrors the released app.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Web change silently ships to macOS store via committed assets | Branch-only work; §7.3 gate; deliberate master merges |
| Swift refactor breaks the macOS build (auto-ships) | Branch + build-and-launch verification before any master merge |
| Textmap infinite recursion on cyclic graphs | Ancestor-path tracking + loop markers + depth cap; explicit tests |
| iPhone canvas unusable | Phone defaults to textmap; map optional, not primary |
| Bridge drift between platforms | Shared `BridgeCore` (compile-time) + parity test |
| iOS file model differs (no NSSavePanel/Downloads) | UIDocumentPicker + share-sheet + Files-app exposure; same public interface |
| Two committed `Resources/web` copies diverge | One build step writes both; CI builds both |

## 12. Decisions (resolved 2026-05-31)

1. **Universal purchase — YES.** Same bundle id `com.dromologue.ConceptMapper`;
   iOS added as a new platform on the existing App Store record (§6.3).
2. **iPhone keeps the visual map**, reachable but **textmap is the default** on
   phone. iPad/Mac: map default + textmap option.
3. **Minimum iOS version: iOS 16.**
4. **Pricing:** free, matching macOS (assumed; revisit at Phase 3 if needed).
