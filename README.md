# Concept Mapper

A desktop tool for building, editing, and reasoning over typed concept maps. A native macOS shell hosts a React canvas backed by a Rust parser compiled to WebAssembly. Maps are plain-text Markdown; the structure they conform to is declared in a separate JSON template. The split is deliberate: instance data and the schema it satisfies should not co-evolve in the same file.

## What it does

Concept Mapper renders a graph of typed nodes and edges, classified along any number of axes that the template defines (e.g. domain, decade, generation, urgency). The same canvas supports force-directed layout, directional flow, radial layout, and region-constrained classification — every layout reads from the same IR, so switching is a re-projection, not a rebuild. Edits in the UI round-trip back to the source `.cm` file as Markdown that a human can still read and diff.

The design assumption is that a concept map is a knowledge artefact, not just a picture. It should survive being grepped, version-controlled, edited in a text editor, and re-rendered by a future tool that does not exist yet.

## File formats

Two file types, with strict separation of concerns.

`.cmt` — **Template**. JSON. Defines `classifiers`, `node_types`, `edge_types`, and any default colour, shape, or layout hint. The template is the single source of structural truth.

`.cm` — **Map**. Markdown. Contains nodes (in fenced code blocks of `key: value` pairs), edges, and observations. The first non-title line must be an HTML comment naming the template it conforms to:

```
# My Map
<!-- template: my-taxonomy.cmt -->
```

Maps must not contain `## Generations`, `## Streams`, or any other structural section heading — those define the schema and belong in the template. The loader emits warnings if it finds them; see `REQ-085` in [SPEC.md](SPEC.md).

## Quick start

```bash
./scripts/build-app.sh --open
```

This runs the full pipeline (Rust tests, web tests, WASM build, web build, asset copy, Xcode build, code-sign) and opens the resulting `.app`. Use `--debug` for a debug build, `--skip-tests` to skip the test step, `--archive` to produce a notarisable `.pkg` for App Store submission.

Manual steps if you want to drive parts independently:

```bash
cargo test --all                                   # Rust suite
cd web && npm test                                 # web suite (Vitest)
wasm-pack build --target web --out-dir web/src/wasm --features wasm
cd web && npm run build                            # produces dist/
cp -r web/dist/ macos/Resources/web/               # macOS bundles from disk, not a dev server
cd macos && xcodebuild -scheme ConceptMapper
```

`npm run dev` is not used and is not supported by the macOS shell — the app loads bundled resources, not a Vite dev server.

## Build prerequisites

- Rust toolchain via `rustup` (the Homebrew rust formula does not ship the `wasm32-unknown-unknown` stdlib, which `wasm-pack` requires).
- `wasm-pack`, `xcodegen`, `xcodebuild`, Node 20+, npm.
- For `--archive`: an Apple Developer account with team ID `4EDT4L4DYU` configured in Xcode. The build script passes `-allowProvisioningUpdates`, so Xcode will fetch missing certificates and provisioning profiles automatically the first time.

## Project layout

```
src/                Rust parser → IR (lexer, node/edge/table/metadata parsers, assembler)
web/                React + TypeScript SPA, D3 visualisation, Zustand state, WASM bridge
macos/              SwiftUI shell; WKWebView hosts the React SPA; native file I/O
templates/          .cmt taxonomy templates (JSON)
Maps/               .cm concept maps (Markdown)
examples/           Worked examples of .cmt + .cm pairs
specs/              Specification source files
tests/              Rust integration tests (cargo test)
SPEC.md             Numbered requirements (REQ-001 ... REQ-085) with acceptance criteria
TRACEABILITY.md     Maps code and tests back to requirements
```

## Development

`cargo fmt --all -- --check`, `cargo clippy --all -- -D warnings`, `cargo test --all`, `npm run lint`, `npm test`, `npm run build` all gate CI. The convention is conventional commits; commits should never go to `master` without the test step passing. The template-owned-structure rule (REQ-085) is enforced by both unit tests (`web/src/__tests__/map-validator.test.ts`) and an integration test (`tests/integration_tests.rs`) that walks every `.cm` in `Maps/` and `examples/`.
