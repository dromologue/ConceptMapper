//! Error-path coverage for the parser.
//!
//! These tests pin down behaviour the parser must exhibit when given
//! malformed, ambiguous, or empty input — the kinds of bugs the happy-path
//! suite cannot catch. Where current behaviour is "degrade gracefully" rather
//! than "produce an error", the tests assert the degradation explicitly so a
//! future change does not silently flip the contract.
//!
//! SPEC: REQ-117 - Error path coverage (placeholder; wire to real REQs later)

use concept_mapper_core::graph::assemble::parse_document;
use concept_mapper_core::parser::edge_parser::parse_edges;
use concept_mapper_core::parser::lexer::{lex, ClassifiedLine, LineType};
use concept_mapper_core::parser::node_parser::parse_generic_node;
use concept_mapper_core::parser::table_parser::parse_table;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Lex a fenced block and return only the inner lines (the fences themselves
/// are dropped). Mirrors the helper used in node_parser_tests.rs and
/// edge_parser_tests.rs so error tests share the same conventions.
fn lex_fenced_inner(input: &str) -> Vec<ClassifiedLine> {
    let fenced = format!("```\n{}\n```", input);
    lex(&fenced)
        .into_iter()
        .filter(|l| !matches!(l.line_type, LineType::FenceOpen | LineType::FenceClose))
        .collect()
}

// ---------------------------------------------------------------------------
// Required-field omissions on node blocks
// ---------------------------------------------------------------------------

// SPEC: REQ-117-01 - Node missing `id:` produces a ParseError with line info.
#[test]
fn node_block_missing_id_produces_parse_error_with_line_number() {
    let input = "name: Anonymous\neminence: minor";
    let lines = lex_fenced_inner(input);
    let result = parse_generic_node(&lines, "thinker");

    assert!(
        result.is_err(),
        "node block with no id: must produce a ParseError"
    );
    let errors = result.unwrap_err();
    assert!(
        errors.iter().any(|e| e.message.contains("id")),
        "expected an error mentioning the missing 'id' field, got: {:?}",
        errors.iter().map(|e| &e.message).collect::<Vec<_>>()
    );
    // The error must reference an actual line so the editor can jump to it.
    assert!(
        errors.iter().all(|e| e.line >= 1),
        "every ParseError should carry a 1-indexed line number"
    );
    // And it should offer a fix-it suggestion.
    assert!(
        errors
            .iter()
            .any(|e| e.suggestion.as_ref().is_some_and(|s| s.contains("id"))),
        "expected a suggestion telling the author to add an id field"
    );
}

// SPEC: REQ-117-02 - Node missing `name:` produces a ParseError.
#[test]
fn node_block_missing_name_produces_parse_error() {
    let input = "id: orphan\neminence: minor";
    let lines = lex_fenced_inner(input);
    let result = parse_generic_node(&lines, "thinker");

    assert!(result.is_err(), "node block with no name: must error");
    let errors = result.unwrap_err();
    assert!(
        errors.iter().any(|e| e.message.contains("name")),
        "expected an error mentioning the missing 'name' field"
    );
    assert!(
        errors
            .iter()
            .any(|e| e.suggestion.as_ref().is_some_and(|s| s.contains("name"))),
        "expected a suggestion telling the author to add a name field"
    );
}

// SPEC: REQ-117-03 - When BOTH id and name are missing, both errors surface.
#[test]
fn node_block_missing_both_id_and_name_reports_both() {
    let input = "eminence: minor\ngeneration: 1";
    let lines = lex_fenced_inner(input);
    let result = parse_generic_node(&lines, "thinker");

    let errors = result.expect_err("missing both id and name must error");
    assert!(
        errors.iter().any(|e| e.message.contains("id")),
        "expected error about 'id'"
    );
    assert!(
        errors.iter().any(|e| e.message.contains("name")),
        "expected error about 'name'"
    );
    assert!(
        errors.len() >= 2,
        "expected at least two errors when both required fields are missing, got {}",
        errors.len()
    );
}

// ---------------------------------------------------------------------------
// Duplicate node IDs
// ---------------------------------------------------------------------------

// SPEC: REQ-117-04 - Two nodes sharing an id surface as ParseError at the
// assemble step (current behaviour, asserted to lock it in).
#[test]
fn duplicate_node_ids_produce_parse_error() {
    let input = "\
# Duplicate IDs Test

## Thinker Nodes

```
id: argyris
name: First Argyris
```

```
id: argyris
name: Second Argyris
```
";
    let result = parse_document(input, None);
    let errors = match result {
        Err(errs) => errs,
        Ok(_) => panic!("duplicate node ids must produce a ParseError"),
    };
    assert!(
        errors.iter().any(|e| e.message.contains("duplicate")),
        "expected an error mentioning duplicate node id, got: {:?}",
        errors.iter().map(|e| &e.message).collect::<Vec<_>>()
    );
    assert!(
        errors
            .iter()
            .any(|e| e.message.contains("argyris") || e.context.contains("argyris")),
        "duplicate-id error should name the offending id"
    );
}

// ---------------------------------------------------------------------------
// Edges referencing unknown nodes — currently a ParseWarning, not an error.
// ---------------------------------------------------------------------------

// SPEC: REQ-117-05 - Edge `from:` referencing a non-existent id => warning.
#[test]
fn edge_from_referencing_unknown_node_emits_warning_not_error() {
    let input = "\
# Edge with unknown from

## Thinker Nodes

```
id: known
name: Known Node
```

## Edges

```
from: ghost   to: known   type: chain
```
";
    let result = parse_document(input, None).expect("unknown edge endpoints must not be fatal");
    assert!(
        result
            .warnings
            .iter()
            .any(|w| w.message.contains("ghost") && w.message.contains("unknown")),
        "expected a warning naming the unknown 'ghost' node, got: {:?}",
        result
            .warnings
            .iter()
            .map(|w| &w.message)
            .collect::<Vec<_>>()
    );
    // The edge itself is still emitted — broken refs degrade, they don't drop.
    assert_eq!(
        result.graph.edges.len(),
        1,
        "edge with an unknown endpoint should still be present in the IR"
    );
}

// SPEC: REQ-117-06 - Edge `to:` referencing a non-existent id => warning.
#[test]
fn edge_to_referencing_unknown_node_emits_warning_not_error() {
    let input = "\
# Edge with unknown to

## Thinker Nodes

```
id: known
name: Known Node
```

## Edges

```
from: known   to: phantom   type: chain
```
";
    let result = parse_document(input, None).expect("must not error on unknown 'to' ref");
    assert!(
        result
            .warnings
            .iter()
            .any(|w| w.message.contains("phantom") && w.message.contains("unknown")),
        "expected a warning naming the unknown 'phantom' target"
    );
}

// ---------------------------------------------------------------------------
// Malformed tables
// ---------------------------------------------------------------------------

// SPEC: REQ-117-07 - A table row with fewer cells than the header degrades
// gracefully: the parser fills missing cells with empty strings rather than
// erroring. (Tables are not the primary graph carrier; the .cm format uses
// fenced KV blocks for nodes/edges.)
#[test]
fn table_with_mismatched_column_count_degrades_gracefully() {
    let input = "\
| Field | Type | Description |
|-------|------|-------------|
| `id` | string |
| `name` | string | the display name | extra |
";
    let lines = lex(input);
    let rows = parse_table(&lines);

    assert_eq!(rows.len(), 2, "both data rows should be returned");

    // Short row: third column header still appears, with empty value.
    let short = &rows[0];
    assert_eq!(
        short.cells.len(),
        2,
        "short row keeps its observed cell count"
    );
    let short_headers: Vec<&str> = short.cells.iter().map(|(h, _)| h.as_str()).collect();
    assert_eq!(short_headers, vec!["Field", "Type"]);

    // Long row: extra cell falls back to an empty header (no panic, no crash).
    let long = &rows[1];
    assert_eq!(
        long.cells.len(),
        4,
        "long row keeps its observed cell count"
    );
    let (last_header, last_value) = &long.cells[3];
    assert_eq!(last_header, "", "extra cell maps to an empty header string");
    assert_eq!(last_value, "extra");
}

// ---------------------------------------------------------------------------
// Empty / minimal inputs
// ---------------------------------------------------------------------------

// SPEC: REQ-117-08 - Empty input yields an empty GraphIR, no errors.
#[test]
fn empty_input_returns_empty_graph_without_errors() {
    let result = parse_document("", None).expect("empty input must parse cleanly");
    assert!(result.graph.nodes.is_empty(), "no nodes expected");
    assert!(result.graph.edges.is_empty(), "no edges expected");
    assert!(result.warnings.is_empty(), "no warnings expected");
    assert!(result.graph.metadata.title.is_none(), "no title expected");
}

// SPEC: REQ-117-09 - Headers only, no node blocks, yields an empty GraphIR.
#[test]
fn headers_only_input_returns_empty_graph_without_errors() {
    let input = "# Title Only\n\n## Thinker Nodes\n\n## Edges\n";
    let result = parse_document(input, None).expect("headers-only input must parse");
    assert!(result.graph.nodes.is_empty(), "no nodes expected");
    assert!(result.graph.edges.is_empty(), "no edges expected");
    assert!(result.warnings.is_empty(), "no warnings expected");
    // The H1 should be captured as the title even when the body is empty.
    assert_eq!(
        result.graph.metadata.title.as_deref(),
        Some("Title Only"),
        "H1 must still populate the title"
    );
}

// ---------------------------------------------------------------------------
// Fence-balance failures
// ---------------------------------------------------------------------------

// SPEC: REQ-117-10 - An open fence that is never closed currently degrades:
// the parser swallows the partial block (since `extract_fenced_blocks` only
// emits blocks on a matching FenceClose). This test pins that behaviour so
// the regression surface is explicit. If/when we tighten this to a hard
// error pointing at the unclosed open-line, update the assertion.
#[test]
fn unclosed_fence_does_not_emit_partial_block() {
    let input = "\
# Unclosed Fence

## Thinker Nodes

```
id: dangling
name: Dangling Node
";
    let result = parse_document(input, None).expect("unclosed fence currently parses cleanly");

    // Current behaviour: the dangling block is dropped because no FenceClose
    // ever arrives. The node never reaches the IR.
    assert!(
        result.graph.nodes.is_empty(),
        "unclosed fence currently drops the partial block; got nodes: {:?}",
        result.graph.nodes.iter().map(|n| &n.id).collect::<Vec<_>>()
    );
}

// ---------------------------------------------------------------------------
// KV pairs with empty values
// ---------------------------------------------------------------------------

// SPEC: REQ-117-11 - `key:` with no value is accepted as an empty-string
// field. The lexer emits a KVPair with value="" and the node parser stores
// it verbatim; the existing required-field checks treat "" as "present".
#[test]
fn kv_pair_with_empty_value_is_accepted_as_empty_string() {
    let input = "id: empties\nname: Empties Test\neminence:\ndates:";
    let lines = lex_fenced_inner(input);
    let node =
        parse_generic_node(&lines, "thinker").expect("KV pair with empty value is currently legal");

    assert_eq!(node.id, "empties");
    assert_eq!(node.name, "Empties Test");
    assert_eq!(
        node.fields.get("eminence").map(|s| s.as_str()),
        Some(""),
        "empty value must be stored as an empty string, not dropped"
    );
    assert_eq!(node.fields.get("dates").map(|s| s.as_str()), Some(""));
}

// SPEC: REQ-117-12 - An empty `id:` value satisfies the presence check today
// (id is "present", just empty). The downstream graph will surface an empty
// id which is a separate concern; this test locks current parser behaviour.
#[test]
fn empty_id_value_is_currently_accepted_by_node_parser() {
    let input = "id:\nname: Has Name";
    let lines = lex_fenced_inner(input);
    let node = parse_generic_node(&lines, "thinker")
        .expect("empty id value is accepted as 'present but empty' at the node parser layer");
    assert_eq!(node.id, "", "empty id is preserved verbatim");
    assert_eq!(node.name, "Has Name");
}

// ---------------------------------------------------------------------------
// Edge weight handling
// ---------------------------------------------------------------------------

// SPEC: REQ-117-13 - Edge weight above the max clamps to 10, no error.
#[test]
fn edge_weight_above_max_clamps_to_ten() {
    let input = "from: a   to: b   type: chain\n  weight: 99";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("oversized weight must not error");
    assert_eq!(edges.len(), 1);
    assert!(
        (edges[0].weight - 10.0).abs() < f64::EPSILON,
        "weight 99 must clamp to 10.0, got {}",
        edges[0].weight
    );
}

// SPEC: REQ-117-14 - Edge weight below zero clamps to 0, no error.
#[test]
fn edge_weight_below_min_clamps_to_zero() {
    let input = "from: a   to: b   type: chain\n  weight: -5";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("negative weight must not error");
    assert!(
        (edges[0].weight - 0.0).abs() < f64::EPSILON,
        "weight -5 must clamp to 0.0, got {}",
        edges[0].weight
    );
}

// SPEC: REQ-117-15 - Non-numeric weight is silently ignored, weight falls
// back to the default 1.0. No error is raised.
#[test]
fn edge_weight_non_numeric_falls_back_to_default() {
    let input = "from: a   to: b   type: chain\n  weight: abc";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("non-numeric weight must not error");
    assert_eq!(edges.len(), 1);
    assert!(
        (edges[0].weight - 1.0).abs() < f64::EPSILON,
        "non-numeric weight must fall back to default 1.0, got {}",
        edges[0].weight
    );
}

// ---------------------------------------------------------------------------
// Edge missing required fields
// ---------------------------------------------------------------------------

// SPEC: REQ-117-16 - Edge missing `type:` is a ParseError. (Helpful sibling
// to the unknown-node-id tests above: missing-required is harder than
// dangling-ref.)
#[test]
fn edge_missing_type_produces_parse_error() {
    let input = "from: a\nto: b";
    let lines = lex_fenced_inner(input);
    let result = parse_edges(&lines);
    let errors = result.expect_err("edge with no type: must error");
    assert!(
        errors.iter().any(|e| e.message.contains("type")),
        "expected an error mentioning the missing 'type' field"
    );
}
