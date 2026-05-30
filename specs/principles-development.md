# Development Principles

> Strict typing, thorough testing, and clean interfaces — Rust's guarantees on the backend, TypeScript's on the frontend. Special patterns for LLM-dependent, GUI-mutable, and export-round-trip behavior.

## Core Principles

### 1. Type Safety Everywhere
Rust's type system enforces correctness in parsing and graph construction. TypeScript strict mode enforces correctness in the frontend. The shared IR schema is typed on both sides. Enum fields in the IR should use serde-serializable enums where possible rather than raw strings.

### 2. Test at the Boundaries
Focus testing on:
- Markdown input → Graph IR output (Rust unit/integration tests)
- Graph IR input → Rendered graph behavior (React component tests)
- Edge cases in markdown format (malformed input, empty graphs, deep nesting)
- IR mutation → export → re-parse round-trip (Rust integration tests)
- LLM extraction → taxonomy output → parser acceptance (integration tests)

### 3. Specification-Driven
No code without tests. No tests without specifications. Every feature traces back to a requirement in SPEC.md. Use `// SPEC: REQ-XXX` markers in test files.

### 4. Error Handling as a Feature
Malformed markdown should produce clear, actionable error messages — not panics or silent failures. Errors are part of the spec and are tested.

### 5. Incremental Buildability
The project should be buildable and demonstrable at every phase. A working parser with no UI is acceptable. A UI with sample data and no parser is acceptable. Never require all components to function for any component to be testable.

### 6. LLM Testing Patterns
LLM-dependent behavior (REQ-015) requires specialized testing strategies since LLM output is non-deterministic:

- **Property-based tests (CI)**: Assert structural invariants regardless of specific LLM output. E.g., "every extracted thinker has a valid id", "eminence is one of four valid values", "no duplicate node ids". These run on every commit.
- **Mock LLM tests (CI)**: Replace the LLM API call with a fixture returning known output. Tests the extraction logic (chunking, deduplication, validation) without calling the real LLM.
- **Golden file tests (scheduled)**: Run extraction on a reference corpus with the real LLM. Manually verify results and freeze as expected output. Tests assert structural similarity (not exact string match). Re-run periodically and update when LLM behavior changes.
- **Confidence threshold tests (CI)**: Assert that extractions below confidence thresholds are flagged for review, regardless of LLM content.
- **Cost/latency budgets**: Full concept library extraction is a scheduled integration test, not a CI test. Budget: track API cost per extraction run.

### 7. Mutation Testing Patterns
GUI editing (REQ-018) introduces client-side mutation of the Graph IR. Testing patterns:

- **Mutation unit tests**: Test IR mutations in isolation from rendering. Apply edit → assert IR state changed correctly.
- **Edit-then-export round-trip**: Apply edits → export to markdown → re-parse → compare IR (structural equality, not string equality).
- **Undo/redo tests**: Apply edit → undo → assert IR matches pre-edit state. Undo → redo → assert IR matches post-edit state.
- **Corruption tests**: Assert that edits to one node do not affect unrelated nodes. Assert enum fields are constrained to valid values.

### 8. Export Testing Patterns
Taxonomy markdown export (REQ-020) must produce valid, re-parseable output:

- **Parse → export → re-parse**: The canonical round-trip test. The re-parsed IR must be structurally equal to the original (field values match, not string formatting).
- **Adversarial field values**: Fuzz test with values containing taxonomy syntax (fence markers, KV colons, newlines). Assert the exporter escapes/rejects them safely.
- **Content preservation**: Assert that rich content (key_works, critiques) survives the round-trip without data loss.

### 9. State Management Patterns
Application state is organized into domain-specific Zustand stores (`web/src/stores/`):

- **useGraphStore**: Graph data, selection, interaction mode, filters, all mutation actions, undo/redo history
- **useUIStore**: Modal management (unified `activeModal`), panel visibility, search, dimensions, canvas zoom triggers
- **useAnalysisStore**: Network analysis results, path finding, community overlay
- **useFileStore**: Template, file paths, parser status, native maps

Stores are testable in isolation via `getState()`/`setState()` without React rendering. Cross-store communication uses direct imports (e.g., `useGraphStore` imports `useUIStore`).

### 10. LLM Client Architecture
LLM communication uses a polymorphic `LLMClient` interface (`web/src/llm/client.ts`):
- `BridgeLLMClient`: Swift WKWebView bridge transport (macOS app)
- `OllamaLLMClient`: Direct HTTP to local Ollama API (browser)
- `createLLMClient()` factory selects the right implementation

### 11. Typed Bridge Contract
The JS↔Swift bridge protocol is the load-bearing contract between the React SPA and the macOS shell. Discipline:

- One transport per direction. `webkit.messageHandlers.bridge` carries every JS→Swift message; `window.__bridge_receive` carries every Swift→JS message. Adding a new named handler is not allowed — extend the method enum.
- Protocol files are mirrored: `macos/ConceptMapper/BridgeProtocol.swift` and `web/src/types/bridge-protocol.ts`. Adding or changing a method touches both.
- Every method has a typed payload. Untyped `[String: Any]` payloads on the Swift side or `any` on the TS side are anti-patterns.
- Requests correlate to responses via a UUID `id`. Events have `id: null`. Errors echo the originating `id` where applicable.
- Errors are structured (`BridgeError` / `BridgeErrorCode`). NSAlert from inside IO code is forbidden — IO throws, the dispatcher emits an error envelope, the JS promise rejects with `BridgeRejection`.
- `BRIDGE_PROTOCOL_VERSION` increments when the wire format changes. Mismatched versions return a `versionMismatch` error rather than silently dropping the message.

### 12. Async-First Swift IO
File operations in `FileHandler.swift` are `async`/`async throws`. NSOpenPanel/NSSavePanel are wrapped with `withCheckedContinuation` helpers (`runSavePanel`, `runOpenPanel`). New IO code must not use completion handlers. UI side-effects (NSAlert, etc.) live at the call site, not inside the IO function.

### 13. Single State-Management Discipline
Zustand is the single state-management strategy for the React SPA. App.tsx may not maintain shadow copies of state that lives in `useGraphStore`, `useUIStore`, etc. New cross-cutting state goes into an appropriate store; local UI state (DOM refs, transient input values) stays in `useState`/`useRef`. Stores are testable in isolation via `getState()`/`setState()` without React rendering.

### 14. Public API Facade
The `concept-mapper-core` Rust crate exposes a curated public surface in `src/lib.rs`. Internal modules are `#[doc(hidden)] pub mod` so integration tests reach them while external consumers see only `parse_document`, the IR types, and the error types. Reaching into internals from production code is an anti-pattern.

## Patterns to Follow
- `cargo test` for Rust, Vitest for React — both run in CI (GitHub Actions)
- Serde for JSON serialization of the IR
- React Testing Library for component behavior tests (not snapshots)
- Zustand stores for state management (testable without React rendering)
- Descriptive test names that reference the specification
- Mock/stub external dependencies (LLM API) in CI; real calls in scheduled integration tests
- Use `#[ignore]` attribute for Rust tests that require LLM API access; run with `cargo test -- --ignored` in integration
- `ErrorBoundary` wraps the app root to catch rendering errors gracefully

## Anti-Patterns to Avoid
- `unwrap()` in library code (use `Result` types with meaningful errors)
- `any` type in TypeScript
- Tests that depend on implementation details (internal data structures, private methods)
- Tests that require a running server or browser for unit-level verification
- Testing exact LLM output strings (use structural assertions)
- `dangerouslySetInnerHTML` with user-edited content
- Free-text editing of enum fields without validation (use dropdowns)
- Writing user-controlled strings to the filesystem without sanitization

## See Also
- [Architecture Principles](principles-architecture.md)
- [Security Principles](principles-security.md)
