use concept_mapper_core::parser::lexer::{lex, LineType};

// SPEC: REQ-001 - Line Classification (Lexer)

// AC-001-01: Lines starting with #{1,6} are classified as Header with level extracted
#[test]
fn header_lines_classified_with_level() {
    let input = "# Title\n## Section\n### Subsection\n#### Deep";
    let lines = lex(input);

    assert!(matches!(&lines[0].line_type, LineType::Header { level: 1, text } if text == "Title"));
    assert!(matches!(&lines[1].line_type, LineType::Header { level: 2, text } if text == "Section"));
    assert!(matches!(&lines[2].line_type, LineType::Header { level: 3, text } if text == "Subsection"));
    assert!(matches!(&lines[3].line_type, LineType::Header { level: 4, text } if text == "Deep"));
}

// AC-001-02: Lines matching ``` toggle fence state (FenceOpen/FenceClose alternating)
#[test]
fn fence_lines_toggle_open_close() {
    let input = "text\n```\nid: foo\n```\nmore text";
    let lines = lex(input);

    assert!(matches!(&lines[1].line_type, LineType::FenceOpen));
    assert!(matches!(&lines[3].line_type, LineType::FenceClose));
}

#[test]
fn multiple_fence_blocks_alternate_correctly() {
    let input = "```\na: 1\n```\n\n```\nb: 2\n```";
    let lines = lex(input);

    assert!(matches!(&lines[0].line_type, LineType::FenceOpen));
    assert!(matches!(&lines[2].line_type, LineType::FenceClose));
    assert!(matches!(&lines[4].line_type, LineType::FenceOpen));
    assert!(matches!(&lines[6].line_type, LineType::FenceClose));
}

// AC-001-03: Table rows and separators classified correctly
#[test]
fn table_rows_classified() {
    let input = "| Field | Type | Description |\n|-------|------|-------------|\n| `id` | string | Unique identifier |";
    let lines = lex(input);

    assert!(matches!(&lines[0].line_type, LineType::TableRow { .. }));
    assert!(matches!(&lines[1].line_type, LineType::TableSeparator));
    assert!(matches!(&lines[2].line_type, LineType::TableRow { .. }));
}

#[test]
fn table_row_cells_extracted() {
    let input = "| dominant | Shapes the field | High density |";
    let lines = lex(input);

    if let LineType::TableRow { cells } = &lines[0].line_type {
        assert_eq!(cells.len(), 3);
        assert_eq!(cells[0], "dominant");
        assert_eq!(cells[1], "Shapes the field");
        assert_eq!(cells[2], "High density");
    } else {
        panic!("expected TableRow");
    }
}

// AC-001-04: Lines inside a fence matching word: value are classified as KVPair
#[test]
fn kv_pairs_inside_fence() {
    let input = "```\nid: argyris\nname: Chris Argyris\ngeneration: 2\n```";
    let lines = lex(input);

    assert!(matches!(&lines[1].line_type, LineType::KVPair { key, value } if key == "id" && value == "argyris"));
    assert!(matches!(&lines[2].line_type, LineType::KVPair { key, value } if key == "name" && value == "Chris Argyris"));
    assert!(matches!(&lines[3].line_type, LineType::KVPair { key, value } if key == "generation" && value == "2"));
}

#[test]
fn kv_pairs_outside_fence_are_not_kv() {
    // Outside a fence, `word: value` should NOT be classified as KVPair
    let input = "id: argyris";
    let lines = lex(input);

    // Should be Prose, not KVPair (KV pairs only inside fences)
    assert!(!matches!(&lines[0].line_type, LineType::KVPair { .. }));
}

// AC-001-05: Bullet items classified with indent
#[test]
fn bullet_items_classified() {
    let input = "- Top level\n  - Indented\n    - Deep indent";
    let lines = lex(input);

    assert!(matches!(&lines[0].line_type, LineType::BulletItem { indent: 0, .. }));
    assert!(matches!(&lines[1].line_type, LineType::BulletItem { indent: 2, .. }));
    assert!(matches!(&lines[2].line_type, LineType::BulletItem { indent: 4, .. }));
}

#[test]
fn bullet_item_text_extracted() {
    let input = "- **Attention space**: The How We Learn network";
    let lines = lex(input);

    if let LineType::BulletItem { indent, text } = &lines[0].line_type {
        assert_eq!(*indent, 0);
        assert!(text.starts_with("**Attention space**"));
    } else {
        panic!("expected BulletItem");
    }
}

// AC-001-06: Empty or whitespace-only lines classified as BlankLine
#[test]
fn blank_lines_classified() {
    let input = "text\n\n   \nmore text";
    let lines = lex(input);

    assert!(matches!(&lines[1].line_type, LineType::BlankLine));
    assert!(matches!(&lines[2].line_type, LineType::BlankLine));
}

// AC-001-07: All other lines classified as Prose
#[test]
fn prose_lines_classified() {
    let input = "This is a regular paragraph of text.";
    let lines = lex(input);

    assert!(matches!(&lines[0].line_type, LineType::Prose { .. }));
}

// AC-001-08: Every ClassifiedLine includes line_number (1-indexed) and raw
#[test]
fn line_numbers_are_one_indexed() {
    let input = "first\nsecond\nthird";
    let lines = lex(input);

    assert_eq!(lines[0].line_number, 1);
    assert_eq!(lines[1].line_number, 2);
    assert_eq!(lines[2].line_number, 3);
}

#[test]
fn raw_content_preserved() {
    let input = "  indented line  ";
    let lines = lex(input);

    assert_eq!(lines[0].raw, "  indented line  ");
}

// AC-001 edge case: Indented KV pairs inside fences
#[test]
fn indented_kv_pairs_inside_fence() {
    let input = "```\n  note: This is indented\n```";
    let lines = lex(input);

    assert!(matches!(&lines[1].line_type, LineType::KVPair { key, value }
        if key == "note" && value == "This is indented"));
}

// AC-001 edge case: Inline code backticks are not fence markers
#[test]
fn inline_backticks_not_treated_as_fences() {
    let input = "Use `code` in text\nMore `inline` code";
    let lines = lex(input);

    assert!(matches!(&lines[0].line_type, LineType::Prose { .. }));
    assert!(matches!(&lines[1].line_type, LineType::Prose { .. }));
}
