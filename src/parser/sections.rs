use crate::parser::lexer::{ClassifiedLine, LineType};

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
    let mut _current_h3: Option<String> = None;
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
                _current_h3 = None;
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
                _current_h3 = Some(text.clone());
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
