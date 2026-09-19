# Concept Mapper

A desktop tool for building, editing, and reasoning over typed concept maps. A native macOS shell hosts a React canvas backed by a Rust parser compiled to WebAssembly. Maps are plain-text Markdown; the structure they conform to is declared in a separate JSON template. The split is deliberate: instance data and the schema it satisfies should not co-evolve in the same file.

Concept Mapper is open source under the [Apache License 2.0](LICENSE) and runs on macOS 14 (Sonoma) or later. You can use it, fork it, and build commercial products on it without a fee and without asking permission; what the licence asks in return is attribution. See [Licence](#licence) below.

## Install

Concept Mapper is distributed as source from this repository. Clone it and run the build script — one command produces a signed `.app` you can drag to Applications:

```bash
git clone https://github.com/dromologue/ConceptMapper.git
cd ConceptMapper
./scripts/build-app.sh --open
```

The pipeline runs the Rust and web test suites, compiles the parser to WebAssembly, builds the React SPA, copies it into the macOS resource bundle, and builds the app. The result lands in `macos/build/Build/Products/Release/ConceptMapper.app`. See [Build prerequisites](#build-prerequisites) for the toolchain it expects, and [What's New](https://conceptmapper.dromologue.com/changelog.html) for release notes.

Building from source means the app is signed with your own developer identity rather than someone else's, so the first-launch Gatekeeper warning that a downloaded binary would raise does not apply.

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

Maps must not contain `## Generations`, `## Streams`, or any other structural section heading — those define the schema and belong in the template. The loader emits warnings if it finds them.

## Build from source

```bash
./scripts/build-app.sh --open
```

This runs the full pipeline (Rust tests, web tests, WASM build, web build, asset copy, Xcode build) and opens the resulting `.app`. Use `--debug` for a debug build and `--skip-tests` to skip the test step.

To produce a signed, notarised DMG for redistribution, use [`scripts/release-macos.sh`](scripts/release-macos.sh) — it archives, exports with a Developer ID certificate, builds the DMG, submits it to Apple's notary service, staples the ticket, and verifies Gatekeeper acceptance. The one-time signing/notarisation setup (a Developer ID Application certificate and a `notarytool` keychain profile) is documented in that script's header comments. Notarising under your own Apple Developer account is the supported path for anyone redistributing a build.

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
- An Apple Developer account for a signed build. `macos/project.yml` carries the upstream team ID; change `DEVELOPMENT_TEAM` to your own before building, or build unsigned. The build script passes `-allowProvisioningUpdates`, so Xcode fetches missing certificates and provisioning profiles automatically the first time.

## Project layout

```
src/                Rust parser → IR (lexer, node/edge/table/metadata parsers, assembler)
web/                React + TypeScript SPA, D3 visualisation, Zustand state, WASM bridge
macos/              SwiftUI shell; WKWebView hosts the React SPA; native file I/O
templates/          .cmt taxonomy templates (JSON)
Maps/               .cm concept maps (Markdown)
tests/              Rust integration tests (cargo test)
scripts/            Build pipeline, macOS release, and the site generator
```

## Development

`cargo fmt --all -- --check`, `cargo clippy --all -- -D warnings`, `cargo test --all`, `npm run lint`, `npm test`, `npm run build` all gate CI. The convention is conventional commits; commits should never go to `master` without the test step passing. The template-owned-structure rule is enforced by both unit tests (`web/src/__tests__/map-validator.test.ts`) and an integration test (`tests/integration_tests.rs`) that walks the `.cm` maps in `Maps/`.

## Contributing

Contributions are welcome. Concept Mapper is Apache-2.0 licensed, so by contributing you agree your changes are released under the same terms, including the patent grant in section 3 of that licence.

1. **Fork** the repository and create a topic branch off `master` (`git checkout -b feat/my-change`). Don't commit directly to `master`.
2. **Make your change** and keep it focused. The architecture is documented above and in [CLAUDE.md](CLAUDE.md). Never hardcode node or edge types — structure is always template-driven (the template is the single source of structural truth).
3. **Verify locally** before opening a PR — these gate CI:

   ```bash
   cargo fmt --all -- --check
   cargo clippy --all -- -D warnings
   cargo test --all
   cd web && npm run lint && npm test && npm run build
   ```

   If you changed the macOS shell, also run `scripts/build-app.sh --platform=mac --verify`.
4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, …).
5. **Open a pull request** against `master` describing what changed and why. CI runs the Rust + web suites and an unsigned macOS build guard.

Bug reports and feature ideas are equally welcome — open an issue with steps to reproduce (and a sample `.cm`/`.cmt` pair where relevant).

## Licence

[Apache License 2.0](LICENSE) © 2026 dromologue. Commercial use, modification, redistribution, and private use are all permitted, and the licence carries an express patent grant.

The condition is attribution. Section 4(d) of the licence requires anyone distributing Concept Mapper, or a work derived from it, to reproduce the attribution notice in [NOTICE](NOTICE) — in a `NOTICE` file, in the documentation, or in a notice the product itself displays. If you ship Concept Mapper inside a commercial product or service, put it somewhere a user can find it: an About, Credits, Licences, or Open source screen, in substantially this form:

```
Built with Concept Mapper — https://conceptmapper.dromologue.com
Copyright 2026 dromologue, used under the Apache License 2.0.
```

That obligation applies whether or not you charge for the result. Two limits worth stating plainly, because they are where people trip: the licence grants no rights in the "Concept Mapper" or "dromologue" names, logos, or app icon beyond the attribution itself (section 6), so a fork ships under a different name; and the software comes with no warranty and no support obligation (sections 7 and 8).
