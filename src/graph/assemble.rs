use std::collections::{BTreeMap, HashMap};

use crate::graph::ir::*;
use crate::parser::edge_parser;
use crate::parser::errors::{ParseError, ParseResult, ParseWarning};
use crate::parser::lexer::{lex, ClassifiedLine, LineType};
use crate::parser::metadata_parser;
use crate::parser::node_parser::{self, GenericNode};
use crate::parser::sections::{split_sections, SectionKind};

/// Output of parsing a full document.
pub struct ParseOutput {
    pub graph: GraphIR,
    pub warnings: Vec<ParseWarning>,
}

/// Parse a taxonomy markdown document into a Graph IR.
pub fn parse_document(input: &str, source_file: Option<&str>) -> ParseResult<ParseOutput> {
    let lines = lex(input);
    let sections = split_sections(lines);

    let mut generic_nodes: Vec<GenericNode> = Vec::new();
    let mut edges = Vec::new();
    let mut notes: Vec<String> = Vec::new();
    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    let mut title = None;

    // Extract title from preamble
    for section in &sections {
        if section.path.is_empty() {
            for line in &section.lines {
                if let LineType::Header { level: 1, text } = &line.line_type {
                    title = Some(text.clone());
                    break;
                }
            }
        }
    }

    for section in &sections {
        let path_str = section.path.join(" > ").to_lowercase();

        match SectionKind::from_path(&path_str) {
            SectionKind::Edges => {
                parse_edge_blocks(&section.lines, &mut edges, &mut errors);
            }
            SectionKind::Notes => {
                notes.extend(metadata_parser::parse_notes(&section.lines));
            }
            SectionKind::Nodes(node_type) => {
                parse_generic_blocks(&section.lines, &node_type, &mut generic_nodes, &mut errors);
            }
            SectionKind::Unknown => {}
        }
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    // Check for duplicate node IDs
    let mut node_ids: HashMap<String, ()> = HashMap::new();
    for g in &generic_nodes {
        if node_ids.contains_key(&g.id) {
            errors.push(ParseError {
                line: 0,
                context: format!("id: {}", g.id),
                message: format!("duplicate node ID '{}'", g.id),
                suggestion: Some("each node must have a unique id".to_string()),
            });
        }
        node_ids.insert(g.id.clone(), ());
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    // Convert generic nodes to IR nodes (move semantics to avoid cloning)
    let ir_nodes: Vec<Node> = generic_nodes
        .into_iter()
        .map(|g| Node {
            id: g.id,
            node_type: g.node_type,
            name: g.name,
            fields: if g.fields.is_empty() {
                None
            } else {
                Some(g.fields.into_iter().collect::<BTreeMap<_, _>>())
            },
            notes: g.notes,
        })
        .collect();

    // Convert edges to IR edges
    let mut ir_edges: Vec<Edge> = Vec::new();

    for e in &edges {
        if !node_ids.contains_key(&e.from) {
            warnings.push(ParseWarning {
                line: e.line_number,
                message: format!("edge references unknown node '{}'", e.from),
            });
        }
        if !node_ids.contains_key(&e.to) {
            warnings.push(ParseWarning {
                line: e.line_number,
                message: format!("edge references unknown node '{}'", e.to),
            });
        }
    }

    for e in edges {
        let (directed, visual) = edge_visual(&e.edge_type);

        ir_edges.push(Edge {
            from: e.from,
            to: e.to,
            edge_type: e.edge_type,
            directed,
            weight: e.weight,
            note: e.note,
            visual,
        });
    }

    let graph = GraphIR {
        version: "1.0".to_string(),
        metadata: Metadata {
            title,
            source_file: source_file.map(|s| s.to_string()),
            parsed_at: Some(chrono::Utc::now().to_rfc3339()),
            notes,
            network_stats: Some(NetworkStats {
                node_count: ir_nodes.len() as i32,
                edge_count: ir_edges.len() as i32,
            }),
        },
        nodes: ir_nodes,
        edges: ir_edges,
    };

    Ok(ParseOutput { graph, warnings })
}

/// Default fallback edge visual based on edge type string.
/// These are baseline defaults only — the frontend overrides them with
/// edge_types defined in the .cmt taxonomy template when one is loaded.
fn edge_visual(edge_type: &str) -> (bool, EdgeVisual) {
    match edge_type {
        "rivalry" | "opposes" => (
            false,
            EdgeVisual {
                style: "dashed".to_string(),
                color: Some("#D94A4A".to_string()),
                show_arrow: false,
            },
        ),
        "alliance" | "institutional" => (
            false,
            EdgeVisual {
                style: "dotted".to_string(),
                color: Some("#999999".to_string()),
                show_arrow: false,
            },
        ),
        // Default: directed solid edge for all other types
        _ => (
            true,
            EdgeVisual {
                style: "solid".to_string(),
                color: None,
                show_arrow: true,
            },
        ),
    }
}

fn parse_generic_blocks(
    lines: &[ClassifiedLine],
    node_type: &str,
    generic: &mut Vec<GenericNode>,
    errors: &mut Vec<ParseError>,
) {
    for block in extract_fenced_blocks(lines) {
        match node_parser::parse_generic_node(&block, node_type) {
            Ok(node) => generic.push(node),
            Err(mut errs) => errors.append(&mut errs),
        }
    }
}

fn parse_edge_blocks(
    lines: &[ClassifiedLine],
    edges: &mut Vec<edge_parser::ParsedEdge>,
    errors: &mut Vec<ParseError>,
) {
    for block in extract_fenced_blocks(lines) {
        match edge_parser::parse_edges(&block) {
            Ok(mut parsed) => edges.append(&mut parsed),
            Err(mut errs) => errors.append(&mut errs),
        }
    }
}

/// Extract fenced blocks from a sequence of classified lines.
/// Returns groups of lines between FenceOpen and FenceClose.
fn extract_fenced_blocks(lines: &[ClassifiedLine]) -> Vec<Vec<ClassifiedLine>> {
    let mut blocks = Vec::new();
    let mut current_block: Option<Vec<ClassifiedLine>> = None;

    for line in lines {
        match &line.line_type {
            LineType::FenceOpen => {
                current_block = Some(Vec::new());
            }
            LineType::FenceClose => {
                if let Some(block) = current_block.take() {
                    if !block.is_empty() {
                        blocks.push(block);
                    }
                }
            }
            _ => {
                if let Some(ref mut block) = current_block {
                    block.push(line.clone());
                }
            }
        }
    }

    blocks
}
