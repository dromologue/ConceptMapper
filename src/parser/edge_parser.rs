use crate::parser::lexer::{ClassifiedLine, LineType};
use crate::parser::errors::ParseError;

/// A parsed edge. Edge types are user-defined strings, not an enum.
#[derive(Debug, Clone)]
pub struct ParsedEdge {
    pub from: String,
    pub to: String,
    pub edge_type: String,
    pub note: Option<String>,
    /// Edge importance weight (0.0–10.0). Defaults to 1.0 for explicit taxonomy edges.
    pub weight: f64,
    pub line_number: usize,
}

/// Parse edges from a fenced block. Multiple edges may appear in one block,
/// separated by blank lines. Each edge starts with a `from:` KV pair.
pub fn parse_edges(lines: &[ClassifiedLine]) -> Result<Vec<ParsedEdge>, Vec<ParseError>> {
    let mut edges = Vec::new();
    let mut errors = Vec::new();

    // Split lines into groups, each starting with a `from:` KV pair
    let mut groups: Vec<Vec<&ClassifiedLine>> = Vec::new();
    let mut current_group: Vec<&ClassifiedLine> = Vec::new();

    for line in lines {
        match &line.line_type {
            LineType::KVPair { key, .. } if key == "from" => {
                if !current_group.is_empty() {
                    groups.push(std::mem::take(&mut current_group));
                }
                current_group.push(line);
            }
            LineType::BlankLine => {
                // Blank lines separate edges but don't start new groups
            }
            _ => {
                if !current_group.is_empty() {
                    current_group.push(line);
                }
            }
        }
    }
    if !current_group.is_empty() {
        groups.push(current_group);
    }

    // Parse each group into an edge
    for group in groups {
        match parse_single_edge(&group) {
            Ok(edge) => edges.push(edge),
            Err(mut errs) => errors.append(&mut errs),
        }
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    Ok(edges)
}

fn parse_single_edge(lines: &[&ClassifiedLine]) -> Result<ParsedEdge, Vec<ParseError>> {
    let mut errors = Vec::new();
    let mut from = None;
    let mut to = None;
    let mut edge_type = None;
    let mut note_parts: Vec<String> = Vec::new();
    let mut weight: f64 = 1.0;
    let first_line = lines.first().map(|l| l.line_number).unwrap_or(0);

    for line in lines {
        match &line.line_type {
            LineType::KVPair { key, value } => {
                match key.as_str() {
                    "from" => {
                        // `from: taylor    to: argyris    type: chain`
                        // The value might contain `to:` and `type:` inline
                        let parts = parse_inline_edge(value);
                        from = Some(parts.from);
                        if let Some(t) = parts.to {
                            to = Some(t);
                        }
                        if let Some(et) = parts.edge_type {
                            edge_type = Some(et);
                        }
                    }
                    "to" => to = Some(value.trim().to_string()),
                    "type" => edge_type = Some(value.trim().to_string()),
                    "note" => note_parts.push(value.trim().to_string()),
                    "weight" => {
                        if let Ok(w) = value.trim().parse::<f64>() {
                            weight = w.clamp(0.0, 10.0);
                        }
                    }
                    _ => {} // ignore unknown keys
                }
            }
            LineType::Prose { text } => {
                // Continuation of a note (indented text)
                if !note_parts.is_empty() {
                    note_parts.push(text.clone());
                }
            }
            _ => {}
        }
    }

    if from.is_none() {
        errors.push(ParseError {
            line: first_line,
            context: String::new(),
            message: "edge missing required field 'from'".to_string(),
            suggestion: None,
        });
    }
    if to.is_none() {
        errors.push(ParseError {
            line: first_line,
            context: String::new(),
            message: "edge missing required field 'to'".to_string(),
            suggestion: None,
        });
    }
    if edge_type.is_none() {
        errors.push(ParseError {
            line: first_line,
            context: String::new(),
            message: "edge missing required field 'type'".to_string(),
            suggestion: None,
        });
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    let note = if note_parts.is_empty() {
        None
    } else {
        Some(note_parts.join(" "))
    };

    Ok(ParsedEdge {
        from: from.unwrap(),
        to: to.unwrap(),
        edge_type: edge_type.unwrap(),
        note,
        weight,
        line_number: first_line,
    })
}

struct InlineEdgeParts {
    from: String,
    to: Option<String>,
    edge_type: Option<String>,
}

/// Parse the inline edge format: `taylor    to: argyris    type: chain`
fn parse_inline_edge(value: &str) -> InlineEdgeParts {
    let value = value.trim();

    // Try to find `to:` and `type:` in the value
    if let Some(to_pos) = value.find("to:") {
        let from = value[..to_pos].trim().to_string();
        let rest = &value[to_pos + 3..];

        if let Some(type_pos) = rest.find("type:") {
            let to = rest[..type_pos].trim().to_string();
            let edge_type = rest[type_pos + 5..].trim().to_string();
            InlineEdgeParts {
                from,
                to: Some(to),
                edge_type: Some(edge_type),
            }
        } else {
            let to = rest.trim().to_string();
            InlineEdgeParts {
                from,
                to: Some(to),
                edge_type: None,
            }
        }
    } else {
        InlineEdgeParts {
            from: value.to_string(),
            to: None,
            edge_type: None,
        }
    }
}
