use concept_mapper_core::parser::lexer::lex;
use concept_mapper_core::parser::sections::split_sections;

// SPEC: REQ-002 - Section Splitting

// AC-002-01: Each ## header starts a new top-level section
#[test]
fn h2_headers_create_top_level_sections() {
    let input = "## First\nContent 1\n## Second\nContent 2";
    let lines = lex(input);
    let sections = split_sections(lines);

    assert_eq!(sections.len(), 2);
    assert_eq!(sections[0].path, vec!["First"]);
    assert_eq!(sections[1].path, vec!["Second"]);
}

// AC-002-02: Each ### header starts a sub-section within the current ## section
#[test]
fn h3_headers_create_subsections() {
    let input = "## Parent\n### Child A\nContent A\n### Child B\nContent B";
    let lines = lex(input);
    let sections = split_sections(lines);

    // Should have: Parent (empty), Child A, Child B
    let child_a = sections.iter().find(|s| s.path.len() == 2 && s.path[1] == "Child A");
    let child_b = sections.iter().find(|s| s.path.len() == 2 && s.path[1] == "Child B");

    assert!(child_a.is_some(), "expected subsection Child A");
    assert!(child_b.is_some(), "expected subsection Child B");
    assert_eq!(child_a.unwrap().path[0], "Parent");
    assert_eq!(child_b.unwrap().path[0], "Parent");
}

// AC-002-03: Lines before the first ## header are grouped into a preamble section
#[test]
fn preamble_before_first_header() {
    let input = "# Title\nSome intro text\n---\n## First Section\nContent";
    let lines = lex(input);
    let sections = split_sections(lines);

    // First section should be the preamble (empty path)
    assert!(sections.len() >= 2);
    let preamble = &sections[0];
    assert!(preamble.path.is_empty(), "preamble should have empty path");
    assert!(!preamble.lines.is_empty(), "preamble should have content");
}

// AC-002-04: Section paths derived from header text
#[test]
fn section_paths_from_header_text() {
    let input = "## 2. Node Types\n### 2.1 Thinker Node\nContent";
    let lines = lex(input);
    let sections = split_sections(lines);

    let subsection = sections.iter().find(|s| s.path.len() == 2);
    assert!(subsection.is_some());
    assert_eq!(subsection.unwrap().path, vec!["2. Node Types", "2.1 Thinker Node"]);
}

// AC-002-05: The example taxonomy produces expected sections
#[test]
fn taxonomy_sections_structure() {
    let input = include_str!("../collins_network_taxonomy.md");
    let lines = lex(input);
    let sections = split_sections(lines);

    // Check that key sections exist
    let section_names: Vec<String> = sections.iter()
        .map(|s| s.path.join(" > "))
        .collect();

    // Should have sections for the major parts
    assert!(section_names.iter().any(|s| s.contains("Node Types")),
        "missing Node Types section. Found: {:?}", section_names);
    assert!(section_names.iter().any(|s| s.contains("Edge Types")),
        "missing Edge Types section");
    assert!(section_names.iter().any(|s| s.contains("Structural Roles")),
        "missing Structural Roles section");
}

// AC-002 edge case: h1 headers are not section boundaries
#[test]
fn h1_not_section_boundary() {
    let input = "# Document Title\nIntro\n## Real Section\nContent";
    let lines = lex(input);
    let sections = split_sections(lines);

    // h1 should be in the preamble, not create a section
    let has_title_section = sections.iter().any(|s| s.path.iter().any(|p| p.contains("Document Title")));
    assert!(!has_title_section, "h1 should not create a section");
}

// AC-002 edge case: #### headers treated as content
#[test]
fn h4_treated_as_content() {
    let input = "## Section\n#### Deep Header\nContent";
    let lines = lex(input);
    let sections = split_sections(lines);

    // h4 should NOT create a new section
    assert_eq!(sections.len(), 1);
    assert_eq!(sections[0].path, vec!["Section"]);
    // The h4 line should be in the section's content
    assert!(sections[0].lines.len() >= 2);
}
