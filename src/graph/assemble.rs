use std::collections::HashMap;

use crate::graph::ir::*;
use crate::parser::errors::{ParseError, ParseWarning};
use crate::parser::lexer::{lex, ClassifiedLine, LineType};
use crate::parser::sections::split_sections;
use crate::parser::node_parser::{self, AbstractionLevel};
use crate::parser::edge_parser::{self, EdgeType};
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

    let mut thinker_nodes = Vec::new();
    let mut concept_nodes = Vec::new();
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
        if path_str.contains("generation") && !path_str.contains("concept") {
            generations = parse_generations(&section.lines);
        } else if path_str.contains("stream") && !path_str.contains("concept") {
            streams = parse_streams(&section.lines);
        } else if path_str.contains("thinker") && path_str.contains("node") {
            parse_thinker_blocks(&section.lines, &mut thinker_nodes, &mut errors);
        } else if path_str.contains("concept") && path_str.contains("node") {
            parse_concept_blocks(&section.lines, &mut concept_nodes, &mut errors);
        } else if path_str.contains("edge") || path_str.contains("thinker-to") || path_str.contains("concept-to") {
            parse_edge_blocks(&section.lines, &mut edges, &mut errors);
        } else if path_str.contains("external") && path_str.contains("shock") {
            parse_shock_blocks(&section.lines, &mut external_shocks);
        } else if path_str.contains("structural") && path_str.contains("observation") {
            structural_observations = metadata_parser::parse_observations(&section.lines);
        }
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    // Build node map for edge category resolution
    let mut node_map: HashMap<String, NodeType> = HashMap::new();
    for t in &thinker_nodes {
        if node_map.contains_key(&t.id) {
            errors.push(ParseError {
                line: 0,
                context: format!("id: {}", t.id),
                message: format!("duplicate node ID '{}'", t.id),
                suggestion: Some("each node must have a unique id".to_string()),
            });
        }
        node_map.insert(t.id.clone(), NodeType::Thinker);
    }
    for c in &concept_nodes {
        if node_map.contains_key(&c.id) {
            errors.push(ParseError {
                line: 0,
                context: format!("id: {}", c.id),
                message: format!("duplicate node ID '{}'", c.id),
                suggestion: Some("each node must have a unique id".to_string()),
            });
        }
        node_map.insert(c.id.clone(), NodeType::Concept);
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    // Check if we need an Unknown Author sentinel
    let needs_unknown_author = concept_nodes.iter()
        .any(|c| c.originator_id == "unknown_author");

    // Convert thinker nodes to IR nodes
    let mut ir_nodes: Vec<Node> = thinker_nodes.iter().map(|t| {
        Node {
            id: t.id.clone(),
            node_type: NodeType::Thinker,
            name: t.name.clone(),
            generation: Some(t.generation),
            stream: Some(t.stream.clone()),
            thinker_fields: Some(ThinkerFields {
                dates: t.dates.clone(),
                eminence: format!("{:?}", t.eminence).to_lowercase(),
                structural_roles: t.structural_roles.clone(),
                active_period: t.active_period.clone(),
                key_concept_ids: t.key_concept_ids.clone(),
                institutional_base: t.institutional_base.clone(),
                is_placeholder: false,
            }),
            concept_fields: None,
            content: None,
            notes: t.notes.clone(),
        }
    }).collect();

    // Add Unknown Author sentinel if needed
    if needs_unknown_author && !node_map.contains_key("unknown_author") {
        ir_nodes.push(Node {
            id: "unknown_author".to_string(),
            node_type: NodeType::Thinker,
            name: "Unknown Author".to_string(),
            generation: None,
            stream: None,
            thinker_fields: Some(ThinkerFields {
                dates: None,
                eminence: "minor".to_string(),
                structural_roles: vec![],
                active_period: None,
                key_concept_ids: vec![],
                institutional_base: None,
                is_placeholder: true,
            }),
            concept_fields: None,
            content: None,
            notes: Some("Placeholder — assign originator via concept detail panel".to_string()),
        });
        node_map.insert("unknown_author".to_string(), NodeType::Thinker);
    }

    // Convert concept nodes to IR nodes
    for c in &concept_nodes {
        // Inherit generation/stream from parent if present
        let gen = c.generation.or_else(|| {
            c.parent_concept_id.as_ref().and_then(|pid| {
                concept_nodes.iter().find(|p| p.id == *pid).and_then(|p| p.generation)
            })
        });
        let stream = c.stream.clone().or_else(|| {
            c.parent_concept_id.as_ref().and_then(|pid| {
                concept_nodes.iter().find(|p| p.id == *pid).and_then(|p| p.stream.clone())
            })
        });

        ir_nodes.push(Node {
            id: c.id.clone(),
            node_type: NodeType::Concept,
            name: c.name.clone(),
            generation: gen,
            stream: stream,
            thinker_fields: None,
            concept_fields: Some(ConceptFields {
                originator_id: c.originator_id.clone(),
                date_introduced: c.date_introduced.clone(),
                concept_type: format!("{:?}", c.concept_type).to_lowercase(),
                abstraction_level: match c.abstraction_level {
                    AbstractionLevel::MetaTheoretical => "meta-theoretical".to_string(),
                    ref al => format!("{:?}", al).to_lowercase(),
                },
                status: format!("{:?}", c.status).to_lowercase(),
                parent_concept_id: c.parent_concept_id.clone(),
            }),
            content: None,
            notes: c.notes.clone(),
        });
    }

    // Convert edges to IR edges
    let mut ir_edges: Vec<Edge> = Vec::new();

    // Add originates edges for concepts with known originators
    for c in &concept_nodes {
        if node_map.contains_key(&c.originator_id) {
            // Check if an explicit originates edge already exists
            let already_exists = edges.iter().any(|e| {
                e.from == c.originator_id && e.to == c.id && e.edge_type == EdgeType::Originates
            });
            if !already_exists {
                // Don't auto-create if there's already an explicit edge
            }
        }
    }

    for e in &edges {
        // Resolve edge category
        let from_type = node_map.get(&e.from);
        let to_type = node_map.get(&e.to);

        if from_type.is_none() {
            warnings.push(ParseWarning {
                line: e.line_number,
                message: format!("edge references unknown node '{}'", e.from),
            });
        }
        if to_type.is_none() {
            warnings.push(ParseWarning {
                line: e.line_number,
                message: format!("edge references unknown node '{}'", e.to),
            });
        }

        let edge_category = match (from_type, to_type) {
            (Some(NodeType::Thinker), Some(NodeType::Thinker)) => EdgeCategory::ThinkerThinker,
            (Some(NodeType::Thinker), Some(NodeType::Concept)) => EdgeCategory::ThinkerConcept,
            (Some(NodeType::Concept), Some(NodeType::Concept)) => EdgeCategory::ConceptConcept,
            (Some(NodeType::Concept), Some(NodeType::Thinker)) => EdgeCategory::ThinkerConcept,
            _ => EdgeCategory::ThinkerThinker, // fallback
        };

        let (directed, visual) = edge_visual(&e.edge_type);
        let edge_type_str = format!("{:?}", e.edge_type);
        let edge_type_str = to_snake_case(&edge_type_str);

        ir_edges.push(Edge {
            from: e.from.clone(),
            to: e.to.clone(),
            edge_type: edge_type_str,
            edge_category,
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

fn edge_visual(edge_type: &EdgeType) -> (bool, EdgeVisual) {
    match edge_type {
        EdgeType::Rivalry | EdgeType::Opposes => (false, EdgeVisual {
            style: "dashed".to_string(),
            color: Some("#D94A4A".to_string()),
            show_arrow: false,
        }),
        EdgeType::Alliance | EdgeType::Institutional => (false, EdgeVisual {
            style: "dotted".to_string(),
            color: Some("#999999".to_string()),
            show_arrow: false,
        }),
        EdgeType::TeacherPupil | EdgeType::Chain | EdgeType::Synthesis |
        EdgeType::Originates | EdgeType::Develops | EdgeType::Extends |
        EdgeType::Subsumes | EdgeType::Enables | EdgeType::Reframes |
        EdgeType::Contests | EdgeType::Applies => (true, EdgeVisual {
            style: "solid".to_string(),
            color: None,
            show_arrow: true,
        }),
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_lowercase().next().unwrap());
    }
    result
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

fn parse_streams(lines: &[ClassifiedLine]) -> Vec<Stream> {
    let rows = table_parser::parse_table(lines);
    rows.iter().map(|row| {
        let get = |key: &str| row.cells.iter()
            .find(|(k, _)| k.to_lowercase().contains(&key.to_lowercase()))
            .map(|(_, v)| v.clone());

        Stream {
            id: get("Stream ID").unwrap_or_default().trim().to_string(),
            name: get("Name").unwrap_or_default().trim().to_string(),
            color: get("Colour").or_else(|| get("Color")),
            description: get("Description"),
        }
    }).collect()
}

fn parse_thinker_blocks(
    lines: &[ClassifiedLine],
    thinkers: &mut Vec<node_parser::ThinkerNode>,
    errors: &mut Vec<ParseError>,
) {
    for block in extract_fenced_blocks(lines) {
        match node_parser::parse_thinker_node(&block) {
            Ok(node) => thinkers.push(node),
            Err(mut errs) => errors.append(&mut errs),
        }
    }
}

fn parse_concept_blocks(
    lines: &[ClassifiedLine],
    concepts: &mut Vec<node_parser::ConceptNode>,
    errors: &mut Vec<ParseError>,
) {
    for block in extract_fenced_blocks(lines) {
        match node_parser::parse_concept_node(&block) {
            Ok(node) => concepts.push(node),
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
