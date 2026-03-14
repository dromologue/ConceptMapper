use crate::parser::lexer::{ClassifiedLine, LineType};

/// A parsed table row as a map of column name → value.
#[derive(Debug, Clone)]
pub struct TableRow {
    pub cells: Vec<(String, String)>,
}

/// Parse classified lines that form a markdown table into rows.
/// Expects: header row, separator row, then data rows.
pub fn parse_table(lines: &[ClassifiedLine]) -> Vec<TableRow> {
    let table_lines: Vec<&ClassifiedLine> = lines.iter()
        .filter(|l| matches!(l.line_type, LineType::TableRow { .. } | LineType::TableSeparator))
        .collect();

    if table_lines.len() < 3 {
        return vec![];
    }

    // First table row is the header
    let headers = match &table_lines[0].line_type {
        LineType::TableRow { cells } => cells.clone(),
        _ => return vec![],
    };

    // Skip separator (index 1), parse data rows
    let mut rows = Vec::new();
    for line in &table_lines[2..] {
        if let LineType::TableRow { cells } = &line.line_type {
            let mut row_cells = Vec::new();
            for (i, cell) in cells.iter().enumerate() {
                let header = headers.get(i).cloned().unwrap_or_default();
                row_cells.push((header, cell.clone()));
            }
            rows.push(TableRow { cells: row_cells });
        }
    }

    rows
}
