//! # concept-mapper-core
//!
//! Parser and graph IR for `.cm` concept-map markdown documents.
//!
//! The public surface of this crate is deliberately small. Everything you
//! need to consume a `.cm` document lives at the crate root; the lexer,
//! section splitter, node/edge parsers, and other intermediate types are
//! implementation details, kept reachable for tests only and hidden from
//! the documented contract.
//!
//! ## Entry point
//!
//! Call [`parse_document`] with the raw markdown body and an optional
//! source-file label. It returns a [`ParseOutput`] containing the
//! assembled [`GraphIR`] plus any non-fatal [`ParseWarning`]s. Fatal
//! errors come back as `Vec<ParseError>` via the [`ParseResult`] alias.
//!
//! ```no_run
//! use concept_mapper_core::{parse_document, ParseOutput};
//!
//! let input = std::fs::read_to_string("Maps/organisational-learning.cm").unwrap();
//! let ParseOutput { graph, warnings } =
//!     parse_document(&input, Some("Maps/organisational-learning.cm"))
//!         .expect("parse failed");
//!
//! for w in &warnings {
//!     eprintln!("{w}");
//! }
//! println!("{} nodes, {} edges", graph.nodes.len(), graph.edges.len());
//! ```
//!
//! ## Public types
//!
//! - Entry point: [`parse_document`], [`ParseOutput`]
//! - Graph IR: [`GraphIR`], [`Node`], [`Edge`], [`EdgeVisual`],
//!   [`Metadata`], [`NetworkStats`]
//! - Diagnostics: [`ParseError`], [`ParseWarning`], [`ParseResult`]
//!
//! ## WASM
//!
//! With the `wasm` feature enabled, [`parse_markdown_to_json`] is exposed
//! via `wasm-bindgen` for the React frontend. It wraps `parse_document`
//! and returns a JSON string carrying both graph and warnings.

// Internal modules — reachable from integration tests in `/tests/` but not
// part of the documented public API. Treat anything inside as unstable.
#[doc(hidden)]
pub mod graph;
#[doc(hidden)]
pub mod parser;
#[doc(hidden)]
pub mod wasm;

// --- Curated public surface ---

pub use crate::graph::assemble::{parse_document, ParseOutput};
pub use crate::graph::ir::{Edge, EdgeVisual, GraphIR, Metadata, NetworkStats, Node};
pub use crate::parser::errors::{ParseError, ParseResult, ParseWarning};

#[cfg(feature = "wasm")]
pub use crate::wasm::parse_markdown_to_json;
