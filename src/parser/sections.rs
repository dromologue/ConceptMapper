use crate::parser::lexer::{ClassifiedLine, LineType};

/// Identifies the semantic kind of a document section from its header path.
#[derive(Debug, Clone, PartialEq)]
pub enum SectionKind {
    Generations,
    Streams,
    Edges,
    ExternalShocks,
    StructuralObservations,
    Nodes(String),
    Unknown,
}

impl SectionKind {
    /// Classify a section from its joined, lowercased path string.
    pub fn from_path(path_str: &str) -> SectionKind {
        if path_str.contains("generation") && !path_str.contains("node") {
            SectionKind::Generations
        } else if path_str.contains("stream") && !path_str.contains("node") {
            SectionKind::Streams
        } else if path_str.contains("edge") {
            SectionKind::Edges
        } else if path_str.contains("external") && path_str.contains("shock") {
            SectionKind::ExternalShocks
        } else if path_str.contains("structural") && path_str.contains("observation") {
            SectionKind::StructuralObservations
        } else if path_str.contains("node") {
            if let Some(node_type) = extract_node_type(path_str) {
                SectionKind::Nodes(node_type)
            } else {
                SectionKind::Unknown
            }
        } else {
            SectionKind::Unknown
        }
    }
}

/// Extract node type name from a path like "... institution nodes".
/// Returns the word before "node" as the type name, lowercased.
fn extract_node_type(path_str: &str) -> Option<String> {
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

/// A section of the document, defined by markdown headers.
#[derive(Debug, Clone)]
pub struct Section {
    /// Header path, e.g., ["Node Types", "Task Node"]
    pub path: Vec<String>,
    /// The classified lines belonging to this section (excluding the header itself)
    pub lines: Vec<ClassifiedLine>,
    /// Line number of the section header (0 for preamble)
    pub header_line: usize,
}

/// Split classified lines into sections based on ## and ### headers.
pub fn split_sections(lines: Vec<ClassifiedLine>) -> Vec<Section> {
    let mut sections: Vec<Section> = Vec::new();
    let mut current_h2: Option<String> = None;
    let mut current_lines: Vec<ClassifiedLine> = Vec::new();
    let mut current_path: Vec<String> = Vec::new();
    let mut current_header_line: usize = 0;

    for line in lines {
        match &line.line_type {
            LineType::Header { level: 2, text } => {
                // Flush current section
                if !current_lines.is_empty() || !current_path.is_empty() {
                    sections.push(Section {
                        path: current_path.clone(),
                        lines: std::mem::take(&mut current_lines),
                        header_line: current_header_line,
                    });
                }
                current_h2 = Some(text.clone());
                current_path = vec![text.clone()];
                current_header_line = line.line_number;
            }
            LineType::Header { level: 3, text } => {
                // Flush current section
                if !current_lines.is_empty() {
                    sections.push(Section {
                        path: current_path.clone(),
                        lines: std::mem::take(&mut current_lines),
                        header_line: current_header_line,
                    });
                }
                current_path = match &current_h2 {
                    Some(h2) => vec![h2.clone(), text.clone()],
                    None => vec![text.clone()],
                };
                current_header_line = line.line_number;
            }
            _ => {
                current_lines.push(line);
            }
        }
    }

    // Flush final section
    if !current_lines.is_empty() || !current_path.is_empty() {
        sections.push(Section {
            path: current_path,
            lines: current_lines,
            header_line: current_header_line,
        });
    }

    sections
}
