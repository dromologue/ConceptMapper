# Project: Concept Mapper

## Tech Stack
- **Core parser**: Rust 2021 edition, compiles to native + WASM (via wasm-bindgen)
- **Frontend**: React 19 + TypeScript 5.9, D3.js 7.9 (force-directed layout), Zustand (state), Vite 8
- **macOS app**: SwiftUI (ConceptMapper), WKWebView hosts the React SPA
- **Testing**: `cargo test` (Rust), Vitest (web), GitHub Actions CI

## Architecture
- `src/` — Rust parser: lexer → node/edge/table/metadata parsers → graph IR assembler. Public surface in `src/lib.rs`; internal modules `#[doc(hidden)] pub mod`. Entry point: `parse_document` (REQ-115).
- `web/` — React SPA: Zustand stores (`useGraphStore`, `useUIStore`) are the canonical state (REQ-113); D3 layered modules under `web/src/graph/` (REQ-114); typed bridge in `web/src/utils/swiftBridge.ts` + `web/src/types/bridge-protocol.ts`.
- `macos/` — SwiftUI shell: `BridgeProtocol.swift` (typed envelope + method enum + payload structs, REQ-112), `WebViewBridge.swift` (single `bridge` channel + dispatcher), `FileHandler.swift` (async/await IO, REQ-116), `ContentView.swift` (notification-driven menu commands).
- `templates/` — .cmt taxonomy template files (JSON)
- `Maps/` — .cm concept map files (structured markdown)
- `examples/` — Example .cmt/.cm pairs
- `specs/` — Specification files; principles in `specs/principles-architecture.md` and `specs/principles-development.md`
- `tests/` — Rust integration tests: unit (`lexer`, `sections`, `node_parser`, `edge_parser`, `serialization`, `integration`), error paths (`error_paths_tests.rs`), golden snapshots (`golden_tests.rs`)

## Bridge Discipline (REQ-112)
- One transport per direction: `webkit.messageHandlers.bridge` (JS→Swift) and `window.__bridge_receive` (Swift→JS).
- Adding a new bridge method requires changes in BOTH `BridgeProtocol.swift` AND `bridge-protocol.ts`. Untyped payloads are an anti-pattern.
- JS uses `sendToSwift(method, payload)` for awaited requests or `postToSwift` for fire-and-forget. Swift uses `bridge.sendEvent(method:payload:)` for events and `bridge.sendError(...)` for failures. No `evaluateJavaScript` with hardcoded `window.foo` callbacks.

## State Discipline (REQ-113)
- Cross-cutting state lives in Zustand stores. App.tsx may not shadow store state with `useState`.
- Mutations go through store handlers (`handleNodeUpdate`, etc.) which call `pushState` internally for undo bookkeeping.
- Local component state (DOM refs, transient input values) stays in `useState`/`useRef`.

## File Formats
- `.cmt` — Taxonomy templates (JSON): classifiers, node_types, edge_types
- `.cm` — Concept maps (structured markdown): nodes in fenced blocks, edges, observations
- The .cmt template ALWAYS defines the structure; never hardcode node types

## Conventions
- Use conventional commits
- Never commit directly to master without testing
- Run `cargo test` and `npm test` before committing
- Rust: standard formatting (`cargo fmt`), no warnings (`cargo clippy`)
- TypeScript: ESLint config in web/

## Build & Run
```bash
# Full build pipeline (recommended)
./scripts/build-app.sh [--debug] [--skip-tests] [--open]

# Manual steps
cd web && npm run build                    # Build React SPA
cp -r web/dist/* macos/Resources/web/      # Copy to macOS resources (CRITICAL)
cd macos && xcodebuild -scheme ConceptMapper  # Build macOS app

# Testing
cargo test --all                           # Rust tests
cd web && npm test                         # Frontend tests

# WASM build
wasm-pack build --target web --features wasm
```

**IMPORTANT**: Always copy `web/dist/*` to `macos/Resources/web/` after `npm run build` and before `xcodebuild`. The macOS app loads from bundled resources, not a dev server. Never run `npm run dev`.

## Security
- No secrets in code or logs
- API keys via environment variables only (see .env.example)
- .env is gitignored

## Review Checklist
- [ ] `cargo test --all` passes
- [ ] `cd web && npm test` passes
- [ ] Web assets copied to macos/Resources/web/ if frontend changed
- [ ] macOS app builds and launches
- [ ] .cmt template changes reflected correctly in UI
- [ ] No hardcoded node types — everything driven by template
