# 2026 Modernisation — Concept Mapper

> Execute the six architecture changes from the deep review, bringing all three layers to a single vintage of 2026 design practice. Update principles, specs, and traceability to reflect the new shape.

## Order of execution

The bridge contract is foundational; everything else routes through it. State migration depends on the bridge being typed (mutations send messages through it). GraphCanvas decomposition is isolated to one file but depends on state migration so the store boundary is final before we cut. Documentation lands last so it describes ship state, not aspiration.

### Phase 1 — Isolated, parallel-safe

- [x] **Rust `lib.rs` facade** (REQ-115): public re-export surface curated; internal modules `#[doc(hidden)] pub mod`; CLI consumes the facade; doctest example added.
- [x] **Parser tests** (REQ-117): 16 error-path tests in `tests/error_paths_tests.rs` + 3 golden tests in `tests/golden_tests.rs` against `examples/organisational-learning.cm` and `Maps/tasks-and-notes.cm`. 84 Rust tests total.

### Phase 2 — Typed JS↔Swift bridge (REQ-112)

- [x] `BridgeMessage` discriminated union on both sides: Swift `enum BridgeMethod` + payload structs in `macos/ConceptMapper/BridgeProtocol.swift`; TypeScript `BridgeRequestMap` / `BridgeEventMap` in `web/src/types/bridge-protocol.ts`.
- [x] Request-correlation IDs (UUID) and typed response channel; single `bridge` JS→Swift handler + single `window.__bridge_receive` Swift→JS callback.
- [x] Protocol version field (`BRIDGE_PROTOCOL_VERSION = 1`); mismatches return a structured `versionMismatch` error.
- [x] All 16 handlers migrated; all JS callers (`sendToSwift`, `postToSwift`, custom-event listeners) on the new API.
- [x] Bridge errors surface as `BridgeRejection` to JS instead of NSAlert-only.
- [x] `useSwiftBridge` hook (`web/src/hooks/useSwiftBridge.ts`) encapsulates inbound receiver + subscribers + sync getters.

### Phase 3 — Swift FileHandler async/await (REQ-116)

- [x] All public IO methods are `async` / `async throws`.
- [x] `NSOpenPanel.begin` / `NSSavePanel.begin` wrapped via `runOpenPanel` / `runSavePanel` (`withCheckedContinuation`).
- [x] WebViewBridge dispatcher uses `Task { try await ... }`; errors routed to `sendError`.
- [x] NSAlert removed from inside IO; UI side-effects belong at the call site.

### Phase 4 — React state migration to Zustand (REQ-113)

- [x] App.tsx state audit complete; ~28 useState calls dropped (50→22).
- [x] graphData + undo/redo migrated to `useGraphStore` (Cmd+Z / Shift+Cmd+Z call store's undo/redo).
- [x] Selection (`selectedNode`, `selectedEdge`, `edgePopoverPos`) in store.
- [x] Modal state unified via `useUIStore.activeModal` + `modalData`. All `show*` booleans removed.
- [x] Panel state, search, dimensions, hidden label types in `useUIStore`.
- [x] `useSwiftBridge` deps rewired to read from stores.
- [x] `useGraphStore.loadGraphFresh()` action added for the fresh-load reset path.

### Phase 5 — GraphCanvas decomposition (REQ-114) — in progress

- [ ] Extract layout module (`web/src/graph/layout/regions.ts`).
- [ ] Extract simulation hook (`web/src/graph/useGraphSimulation.ts`).
- [ ] Extract hit-testing (`web/src/graph/hit-testing.ts`).
- [ ] Extract zoom controller (`web/src/graph/useZoomController.ts`).
- [ ] `GraphCanvas.tsx` reduced to coordinator (< 800 lines).
- [ ] Unit tests for pure modules.

### Phase 6 — Documentation, specs, tests

- [x] `specs/principles-architecture.md` updated: §14 typed bridge, §15 async Swift IO, §16 layered GraphCanvas, §17 Rust facade.
- [x] `specs/principles-development.md` updated: §11 typed bridge contract, §12 async-first IO, §13 single state-management discipline, §14 public API facade.
- [x] `SPEC.md` REQs added: REQ-112 (bridge), REQ-113 (state), REQ-114 (GraphCanvas), REQ-115 (Rust facade), REQ-116 (async IO), REQ-117 (parser test coverage).
- [x] `TRACEABILITY.md` rows added for REQ-112..117.
- [ ] `CLAUDE.md` updated to reference the new conventions.

### Phase 7 — Verification + commit

- [x] `cargo test --all` green (84 tests).
- [x] `cd web && npm test` green (446 tests).
- [ ] `cd web && npm run build`; copy `dist/*` → `macos/Resources/web/`.
- [x] `xcodebuild` macOS app builds clean.
- [ ] Smoke test in the running .app: open .cm, edit, undo/redo, save, attach .md note, export PNG, export PDF.
- [ ] Conventional-commit per phase; pushed to master.

## Out of scope (deliberately)

- LLM features (REQ-021..023): principles already describe the intended client; no implementation in this round.
- Layout overhaul (Tube map): tracked in [project_roadmap.md](../.claude/projects/-Users-dromologue-code-concept-mapper/memory/project_roadmap.md).
- Major UI redesign: structural cleanup only; visual stays put.

## Review

Three things to note when this lands:

1. The bridge work is the most consequential change. Every future JS↔Swift message now has compile-time typing, request correlation, and a structured error path. The "stringly typed handlers with hardcoded `window.foo` callbacks" pattern is gone.
2. App.tsx remains large (~1500 lines after Zustand migration) but no longer holds shadow copies of graph state. The remaining `useState` calls are local orchestration (expandLevel, fontScale, analysis state) — appropriate to stay in the component.
3. GraphCanvas decomposition is the largest open item. The layout / hit-testing / simulation / zoom modules will unlock fine-grained unit tests for what is currently the riskiest file in the codebase.
