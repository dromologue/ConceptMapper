# Onboarding

## Prerequisites
- Rust (stable toolchain)
- Node.js 20+
- Xcode + Command Line Tools
- wasm-pack (`cargo install wasm-pack`)
- XcodeGen (`brew install xcodegen`)

## Getting Started

1. Clone the repo
2. `cp .env.example .env` and fill in API keys
3. `cargo test --all` — verify Rust builds
4. `cd web && npm install && npm test` — verify frontend builds
5. `./scripts/build-app.sh --debug --open` — build and launch the macOS app

## Key Concepts

- **Templates (.cmt)**: Define the taxonomy structure — classifiers (axes), node types (shapes/fields), edge types. These are JSON files in `templates/`.
- **Maps (.cm)**: Contain the actual content — nodes, edges, observations. Structured markdown in `Maps/`.
- **The template always wins**: The UI is entirely driven by the .cmt. Never hardcode node types or classifier values.

## Common Tasks

| Task | Command |
|------|---------|
| Run all tests | `cargo test --all && cd web && npm test` |
| Build web only | `cd web && npm run build` |
| Build macOS app | `./scripts/build-app.sh --debug --open` |
| Add a new template | Create a `.cmt` file in `templates/` |
| Add a new map | Create a `.cm` file in `Maps/` using a template |

## Project Layout

```
src/           Rust parser (lexer, parsers, graph IR)
web/           React/TypeScript frontend (D3 visualization)
macos/         SwiftUI macOS app shell
mcp-server/    Swift MCP server
templates/     .cmt taxonomy templates
Maps/          .cm concept map files
examples/      Example template/map pairs
tests/         Rust integration tests
specs/         Specification documents
scripts/       Build and utility scripts
docs/          This documentation
```
