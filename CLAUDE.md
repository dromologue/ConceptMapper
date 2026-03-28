# Project: Concept Mapper

## Tech Stack
- **Core parser**: Rust 2021 edition, compiles to native + WASM (via wasm-bindgen)
- **Frontend**: React 19 + TypeScript 5.9, D3.js 7.9 (force-directed layout), Zustand (state), Vite 8
- **macOS app**: SwiftUI (ConceptLLM), WKWebView hosts the React SPA
- **MCP server**: Swift CLI tool (ConceptMCP) — exposes parsing/tools over MCP protocol
- **Testing**: `cargo test` (Rust), Vitest (web), GitHub Actions CI

## Architecture
- `src/` — Rust parser: lexer → node/edge/table/metadata parsers → graph IR assembler
- `web/` — React SPA: components, state (Zustand), D3 visualization, WASM bridge
- `macos/` — SwiftUI shell: WebViewBridge, LLMService, FileHandler, MCPSetup
- `mcp-server/` — Swift MCP server: protocol, tools, handlers, CM parser wrapper
- `templates/` — .cmt taxonomy template files (JSON)
- `Maps/` — .cm concept map files (structured markdown)
- `examples/` — Example .cmt/.cm pairs
- `specs/` — Specification files
- `tests/` — Rust integration tests

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
cd macos && xcodebuild -scheme ConceptLLM  # Build macOS app

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
