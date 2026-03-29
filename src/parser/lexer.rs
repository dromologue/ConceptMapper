/// Line types recognized by the lexer.
#[derive(Debug, Clone, PartialEq)]
pub enum LineType {
    Header { level: usize, text: String },
    FenceOpen,
    FenceClose,
    TableRow { cells: Vec<String> },
    TableSeparator,
    KVPair { key: String, value: String },
    BulletItem { indent: usize, text: String },
    BlankLine,
    Prose { text: String },
}

/// A classified line with its original line number and raw content.
#[derive(Debug, Clone)]
pub struct ClassifiedLine {
    pub line_number: usize,
    pub raw: String,
    pub line_type: LineType,
}

/// Classify all lines of the input document.
pub fn lex(input: &str) -> Vec<ClassifiedLine> {
    let mut lines = Vec::new();
    let mut in_fence = false;

    for (idx, raw_line) in input.lines().enumerate() {
        let line_number = idx + 1;
        let raw = raw_line.to_string();

        let line_type = classify_line(raw_line, &mut in_fence);

        lines.push(ClassifiedLine {
            line_number,
            raw,
            line_type,
        });
    }

    lines
}

fn classify_line(line: &str, in_fence: &mut bool) -> LineType {
    let trimmed = line.trim();

    // Fence toggle (must check before KV pairs since KV pairs only matter inside fences)
    if trimmed == "```" || trimmed.starts_with("```") && trimmed.ends_with("```") && trimmed.len() == 3 {
        // More precise: line is exactly ``` possibly with trailing whitespace
        if trimmed == "```" {
            if *in_fence {
                *in_fence = false;
                return LineType::FenceClose;
            } else {
                *in_fence = true;
                return LineType::FenceOpen;
            }
        }
    }

    // Inside a fence: look for KV pairs
    if *in_fence {
        if let Some(kv) = try_parse_kv(line) {
            return kv;
        }
        if trimmed.is_empty() {
            return LineType::BlankLine;
        }
        return LineType::Prose { text: trimmed.to_string() };
    }

    // Blank line
    if trimmed.is_empty() {
        return LineType::BlankLine;
    }

    // Header
    if trimmed.starts_with('#') {
        let level = trimmed.chars().take_while(|c| *c == '#').count();
        let text = trimmed[level..].trim().to_string();
        if (1..=6).contains(&level) && !text.is_empty() {
            return LineType::Header { level, text };
        }
    }

    // Table separator (check before table row)
    if trimmed.starts_with('|') && trimmed.ends_with('|') {
        let inner = &trimmed[1..trimmed.len() - 1];
        if inner.chars().all(|c| c == '-' || c == ':' || c == '|' || c == ' ') && inner.contains('-') {
            return LineType::TableSeparator;
        }
    }

    // Table row
    if trimmed.starts_with('|') && trimmed.ends_with('|') {
        let cells: Vec<String> = trimmed[1..trimmed.len() - 1]
            .split('|')
            .map(|s| s.trim().to_string())
            .collect();
        return LineType::TableRow { cells };
    }

    // Bullet item
    if let Some(bullet) = try_parse_bullet(line) {
        return bullet;
    }

    // Everything else is prose
    LineType::Prose { text: trimmed.to_string() }
}

fn try_parse_kv(line: &str) -> Option<LineType> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    // Match: word(s): value
    // Key is everything before the first `:`, value is everything after
    if let Some(colon_pos) = trimmed.find(':') {
        let key_part = &trimmed[..colon_pos];
        // Key must be a valid identifier-like string (alphanumeric + underscores)
        let key = key_part.trim();
        if !key.is_empty() && key.chars().all(|c| c.is_alphanumeric() || c == '_') {
            let value = trimmed[colon_pos + 1..].trim().to_string();
            return Some(LineType::KVPair {
                key: key.to_string(),
                value,
            });
        }
    }
    None
}

fn try_parse_bullet(line: &str) -> Option<LineType> {
    // Count leading spaces for indent level
    let indent = line.chars().take_while(|c| *c == ' ').count();
    let after_indent = &line[indent..];

    if after_indent.starts_with("- ") || after_indent.starts_with("* ") {
        let text = after_indent[2..].to_string();
        return Some(LineType::BulletItem { indent, text });
    }

    None
}
