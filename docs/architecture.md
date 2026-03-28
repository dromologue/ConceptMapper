# Architecture

## Overview

Concept Mapper is a taxonomy-driven concept mapping tool. It parses structured markdown (.cm files) using a Rust core, visualizes them as force-directed graphs in a React/D3 frontend, and wraps everything in a native macOS app.

## Components

### Rust Core (`src/`)
The parser pipeline: raw markdown → lexer (line classification) → section parsers (nodes, edges, tables, metadata) → graph IR assembler. Compiles to both native binary (CLI) and WASM (browser).

### React Frontend (`web/`)
- **State**: Zustand store holding the graph IR, selection state, UI mode
- **Visualization**: D3.js force-directed layout with zoom, pan, drag
- **WASM bridge**: Calls Rust parser via wasm-bindgen for client-side parsing
- **Export**: PDF (jsPDF), PNG (html2canvas), .cm roundtrip

### macOS Shell (`macos/`)
SwiftUI app (ConceptLLM) hosting the React SPA in a WKWebView. Provides native file handling, LLM service integration, and MCP setup. Generated via XcodeGen from `project.yml`.

### MCP Server (`mcp-server/`)
Swift CLI tool exposing concept mapping tools over the MCP protocol. Handles parsing, querying, and manipulation of .cm/.cmt files for Claude Desktop integration.

## Data Flow

```
.cmt template (JSON) ─────────────────────────────┐
                                                    ▼
.cm file (markdown) → Rust parser → Graph IR → React/D3 render
                                        │
                                        ▼
                              macOS WKWebView ← Swift bridge
```

## File Formats

- `.cmt`: JSON taxonomy templates defining classifiers, node types, edge types
- `.cm`: Structured markdown with fenced code blocks for nodes, edge tables, observations
- The template always drives the UI — node shapes, colors, fields all come from the .cmt
