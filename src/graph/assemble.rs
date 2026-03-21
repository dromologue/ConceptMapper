use std::collections::{BTreeMap, HashMap};

use crate::graph::ir::*;
use crate::parser::errors::{ParseError, ParseWarning};
use crate::parser::lexer::{lex, ClassifiedLine, LineType};
use crate::parser::sections::split_sections;
use crate::parser::node_parser::{self, GenericNode};
use crate::parser::edge_parser;
use crate::parser::table_parser;
use crate::parser::metadata_parser;

/// Result of parsing a full document.
pub struct ParseResult {
    pub graph: GraphIR,
    pub warnings: Vec<ParseWarning>,
}

/// Parse a taxonomy markdown document into a Graph IR.
pub fn parse_document(input: &str, source_file: Option<&str>) -> Result<ParseResult, Vec<ParseError>> {
    let lines = lex(input);
    let sections = split_sections(lines);

    let mut generic_nodes: Vec<GenericNode> = Vec::new();
    let mut edges = Vec::new();
    let mut generations = Vec::new();
    let mut streams = Vec::new();
    let mut external_shocks = Vec::new();
    let mut structural_observations = Vec::new();
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

        // Dispatch based on section path
        if path_str.contains("generation") && !path_str.contains("node") {
            generations = parse_generations(&section.lines);
        } else if path_str.contains("stream") && !path_str.contains("node") {
            streams = parse_streams(&section.lines);
        } else if path_str.contains("edge") {
            parse_edge_blocks(&section.lines, &mut edges, &mut errors);
        } else if path_str.contains("external") && path_str.contains("shock") {
            parse_shock_blocks(&section.lines, &mut external_shocks);
        } else if path_str.contains("structural") && path_str.contains("observation") {
            structural_observations = metadata_parser::parse_observations(&section.lines);
        } else if path_str.contains("node") {
            // Any "## [TypeName] Nodes" section
            if let Some(node_type) = extract_node_type_from_path(&path_str) {
                parse_generic_blocks(&section.lines, &node_type, &mut generic_nodes, &mut errors);
            }
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

    // Convert generic nodes to IR nodes
    let ir_nodes: Vec<Node> = generic_nodes.iter().map(|g| {
        Node {
            id: g.id.clone(),
            node_type: g.node_type.clone(),
            name: g.name.clone(),
            generation: g.generation,
            stream: g.stream.clone(),
            fields: if g.fields.is_empty() { None } else { Some(g.fields.iter().map(|(k, v)| (k.clone(), v.clone())).collect::<BTreeMap<_, _>>()) },
            content: None,
            notes: g.notes.clone(),
        }
    }).collect();

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

        let (directed, visual) = edge_visual(&e.edge_type);

        ir_edges.push(Edge {
            from: e.from.clone(),
            to: e.to.clone(),
            edge_type: e.edge_type.clone(),
            directed,
            weight: e.weight,
            note: e.note.clone(),
            visual,
        });
    }

    let graph = GraphIR {
        version: "1.0".to_string(),
        metadata: Metadata {
            title,
            source_file: source_file.map(|s| s.to_string()),
            parsed_at: Some(chrono::Utc::now().to_rfc3339()),
            generations,
            streams,
            external_shocks,
            structural_observations,
            network_stats: Some(NetworkStats {
                chain_depth: None,
                node_count: ir_nodes.len() as i32,
                edge_count: ir_edges.len() as i32,
            }),
        },
        nodes: ir_nodes,
        edges: ir_edges,
    };

    Ok(ParseResult { graph, warnings })
}

/// Default edge visual based on edge type string.
/// The frontend can override these from the .cmt template.
fn edge_visual(edge_type: &str) -> (bool, EdgeVisual) {
    match edge_type {
        "rivalry" | "opposes" => (false, EdgeVisual {
            style: "dashed".to_string(),
            color: Some("#D94A4A".to_string()),
            show_arrow: false,
        }),
        "alliance" | "institutional" => (false, EdgeVisual {
            style: "dotted".to_string(),
            color: Some("#999999".to_string()),
            show_arrow: false,
        }),
        // Default: directed solid edge for all other types
        _ => (true, EdgeVisual {
            style: "solid".to_string(),
            color: None,
            show_arrow: true,
        }),
    }
}

fn parse_generations(lines: &[ClassifiedLine]) -> Vec<Generation> {
    let rows = table_parser::parse_table(lines);
    rows.iter().map(|row| {
        let get = |key: &str| row.cells.iter()
            .find(|(k, _)| k.to_lowercase().contains(&key.to_lowercase()))
            .map(|(_, v)| v.clone());

        Generation {
            number: get("Gen").and_then(|v| v.trim().parse().ok()).unwrap_or(0),
            period: get("Period"),
            label: get("Label"),
            attention_space_count: get("Attention").and_then(|v| v.trim().parse().ok()),
        }
    }).collect()
}

fn normalize_color(raw: &str) -> String {
    match raw.trim().to_lowercase().as_str() {
        "blue" => "#4A90D9",
        "red" => "#D94A4A",
        "green" => "#4AD94A",
        "amber" | "orange" => "#E6A23C",
        "purple" => "#9B59B6",
        "yellow" => "#F5D623",
        "pink" => "#E91E8C",
        "grey" | "gray" => "#999999",
        _ => raw.trim(), // already hex or CSS color
    }.to_string()
}

fn parse_streams(lines: &[ClassifiedLine]) -> Vec<Stream> {
    let rows = table_parser::parse_table(lines);
    rows.iter().map(|row| {
        let get = |key: &str| row.cells.iter()
            .find(|(k, _)| k.to_lowercase().contains(&key.to_lowercase()))
            .map(|(_, v)| v.clone());

        Stream {
            id: get("Stream ID").unwrap_or_default().trim().trim_matches('`').to_string(),
            name: get("Name").unwrap_or_default().trim().to_string(),
            color: get("Colour").or_else(|| get("Color")).map(|c| normalize_color(&c)),
            description: get("Description"),
        }
    }).collect()
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

/// Extract node type name from a section path like "... > institution nodes".
/// Returns the word before "node" as the type name, lowercased.
fn extract_node_type_from_path(path_str: &str) -> Option<String> {
    let parts: Vec<&str> = path_str.split_whitespace().collect();
    for (i, part) in parts.iter().enumerate() {
        if part.starts_with("node") && i > 0 {
            let candidate = parts[i - 1].trim_matches(|c: char| !c.is_alphanumeric());
            if !candidate.is_empty() {
                return Some(candidate.to_lowercase());
            }
        }
    }
    None
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

fn parse_shock_blocks(
    lines: &[ClassifiedLine],
    shocks: &mut Vec<ExternalShock>,
) {
    for block in extract_fenced_blocks(lines) {
        let mut parsed = metadata_parser::parse_external_shocks(&block);
        shocks.append(&mut parsed);
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
