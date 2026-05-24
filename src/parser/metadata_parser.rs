use crate::parser::lexer::{ClassifiedLine, LineType};

/// Parse bullet items inside a `## Notes` (or legacy `## Structural Observations`)
/// section into a flat list of strings. Nothing else is privileged at the
/// document level — anything more structured belongs in a node defined by
/// the template.
pub fn parse_notes(lines: &[ClassifiedLine]) -> Vec<String> {
    lines
        .iter()
        .filter_map(|l| match &l.line_type {
            LineType::BulletItem { text, .. } => Some(text.clone()),
            _ => None,
        })
        .collect()
}
