use concept_mapper_core::parser::lexer::{lex, LineType};
use concept_mapper_core::parser::node_parser::*;

// SPEC: REQ-003 - Thinker Node Parsing (now generic)
// SPEC: REQ-004 - Concept Node Parsing (now generic)

/// Helper: lex a fenced block and return only the inner lines (between fences)
fn lex_fenced_block(input: &str) -> Vec<concept_mapper_core::parser::lexer::ClassifiedLine> {
    let fenced = format!("```\n{}\n```", input);
    let lines = lex(&fenced);
    // Skip FenceOpen and FenceClose
    lines.into_iter()
        .filter(|l| !matches!(l.line_type, LineType::FenceOpen | LineType::FenceClose))
        .collect()
}

// --- Thinker Node Tests (now parsed as GenericNode) ---

// AC-003-13: Full Argyris example parses correctly
#[test]
fn parse_argyris_thinker_node() {
    let input = "id:           argyris
name:         Chris Argyris
dates:        1923–2013
eminence:     dominant
generation:   2
stream:       psychology
structural_roles: intellectual_leader, chain_originator
active_period: 1960–1995
key_concept_ids: [double_loop, defensive_routines, espoused_vs_inuse, model_I_II]
institutional_base: Harvard Business School";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "thinker").expect("should parse argyris");

    assert_eq!(node.id, "argyris");
    assert_eq!(node.name, "Chris Argyris");
    assert_eq!(node.node_type, "thinker");
    assert_eq!(node.generation, Some(2));
    assert_eq!(node.stream.as_deref(), Some("psychology"));
    // Custom fields go into the HashMap
    assert_eq!(node.fields.get("dates").map(|s| s.as_str()), Some("1923–2013"));
    assert_eq!(node.fields.get("eminence").map(|s| s.as_str()), Some("dominant"));
    assert_eq!(node.fields.get("structural_roles").map(|s| s.as_str()), Some("intellectual_leader, chain_originator"));
    assert_eq!(node.fields.get("active_period").map(|s| s.as_str()), Some("1960–1995"));
    assert_eq!(node.fields.get("institutional_base").map(|s| s.as_str()), Some("Harvard Business School"));
    assert!(node.fields.get("key_concept_ids").is_some());
}

// AC-003-13: Stacey example parses correctly
#[test]
fn parse_stacey_thinker_node() {
    let input = "id:           stacey
name:         Ralph Stacey
dates:        1942–2021
eminence:     major
generation:   3
stream:       systems
structural_roles: structural_rival, peripheral_critic
active_period: 1990–2015
key_concept_ids: [complex_responsive_processes, shadow_system, paradox_of_control]
institutional_base: University of Hertfordshire";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "thinker").expect("should parse stacey");

    assert_eq!(node.id, "stacey");
    assert_eq!(node.fields.get("eminence").map(|s| s.as_str()), Some("major"));
    assert_eq!(node.generation, Some(3));
    assert_eq!(node.fields.get("structural_roles").map(|s| s.as_str()), Some("structural_rival, peripheral_critic"));
}

// AC-003-13: Senge example (birth-only dates format)
#[test]
fn parse_senge_thinker_node_birth_only() {
    let input = "id:           senge
name:         Peter Senge
dates:        b. 1947
eminence:     major
generation:   4
stream:       systems
structural_roles: synthesiser
active_period: 1990–2010
key_concept_ids: [learning_organisation, five_disciplines, system_archetypes]
institutional_base: MIT Sloan";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "thinker").expect("should parse senge");

    assert_eq!(node.id, "senge");
    assert_eq!(node.fields.get("dates").map(|s| s.as_str()), Some("b. 1947"));
    assert_eq!(node.fields.get("eminence").map(|s| s.as_str()), Some("major"));
    assert_eq!(node.fields.get("structural_roles").map(|s| s.as_str()), Some("synthesiser"));
}

// AC-003-11: Missing required fields produce ParseError with line number
#[test]
fn node_missing_id_produces_error() {
    let input = "name: Someone\neminence: major\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_generic_node(&lines, "thinker");

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("id")),
        "expected error about missing 'id'");
}

#[test]
fn node_missing_name_produces_error() {
    let input = "id: someone\neminence: major\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_generic_node(&lines, "thinker");

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("name")),
        "expected error about missing 'name'");
}

// AC-003-12: Unknown fields go into the fields HashMap (not ignored)
#[test]
fn thinker_extra_fields_stored() {
    let input = "id: test
name: Test Person
eminence: minor
generation: 1
stream: mgmt
favorite_color: blue
unknown_field: whatever";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "thinker").expect("should parse with extra fields");

    assert_eq!(node.id, "test");
    assert_eq!(node.fields.get("favorite_color").map(|s| s.as_str()), Some("blue"));
    assert_eq!(node.fields.get("unknown_field").map(|s| s.as_str()), Some("whatever"));
    assert_eq!(node.fields.get("eminence").map(|s| s.as_str()), Some("minor"));
}

// Invalid eminence values are now stored as-is (no validation at parser level)
#[test]
fn eminence_stored_as_string() {
    let input = "id: test\nname: Test\neminence: legendary\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "thinker").expect("should parse — no enum validation");
    assert_eq!(node.fields.get("eminence").map(|s| s.as_str()), Some("legendary"));
}

// --- Concept Node Tests (now parsed as GenericNode) ---

// AC-004-11: Double-loop learning concept parses correctly
#[test]
fn parse_double_loop_concept() {
    let input = "id:           double_loop
name:         Double-Loop Learning
originator_id: argyris
date_introduced: 1977
concept_type: distinction
abstraction_level: theoretical
status:       active
generation:   3
stream:       psychology";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "concept").expect("should parse double_loop");

    assert_eq!(node.id, "double_loop");
    assert_eq!(node.name, "Double-Loop Learning");
    assert_eq!(node.node_type, "concept");
    assert_eq!(node.fields.get("originator_id").map(|s| s.as_str()), Some("argyris"));
    assert_eq!(node.fields.get("date_introduced").map(|s| s.as_str()), Some("1977"));
    assert_eq!(node.fields.get("concept_type").map(|s| s.as_str()), Some("distinction"));
    assert_eq!(node.fields.get("abstraction_level").map(|s| s.as_str()), Some("theoretical"));
    assert_eq!(node.fields.get("status").map(|s| s.as_str()), Some("active"));
    assert_eq!(node.generation, Some(3));
    assert_eq!(node.stream.as_deref(), Some("psychology"));
}

// AC-004-11: Cynefin concept parses correctly
#[test]
fn parse_cynefin_concept() {
    let input = "id:           cynefin
name:         Cynefin Framework
originator_id: snowden
date_introduced: 1999
concept_type: framework
abstraction_level: operational
status:       active
generation:   5
stream:       sensemaking";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "concept").expect("should parse cynefin");

    assert_eq!(node.id, "cynefin");
    assert_eq!(node.fields.get("concept_type").map(|s| s.as_str()), Some("framework"));
    assert_eq!(node.fields.get("abstraction_level").map(|s| s.as_str()), Some("operational"));
}

// AC-004-11: Concept with notes field
#[test]
fn parse_concept_with_notes() {
    let input = "id:           seven_conditions
name:         Seven Conditions for Organisational Learning
originator_id: series_synthesis
date_introduced: 2024
concept_type: synthesis
abstraction_level: theoretical
status:       active
generation:   5
stream:       systems
notes:        Series-originated concept drawing on all How We Learn thinkers";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "concept").expect("should parse seven_conditions");

    assert_eq!(node.id, "seven_conditions");
    assert_eq!(node.fields.get("concept_type").map(|s| s.as_str()), Some("synthesis"));
    assert!(node.notes.is_some());
    assert!(node.notes.unwrap().contains("Series-originated"));
}

// AC-004-11: meta-theoretical abstraction level stored as string
#[test]
fn parse_meta_theoretical_concept() {
    let input = "id:           structuration
name:         Structuration Theory
originator_id: giddens
date_introduced: 1984
concept_type: framework
abstraction_level: meta-theoretical
status:       active
generation:   3
stream:       social";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "concept").expect("should parse structuration");

    assert_eq!(node.fields.get("abstraction_level").map(|s| s.as_str()), Some("meta-theoretical"));
}

// AC-004-10: Missing id produces ParseError
#[test]
fn concept_missing_id_produces_error() {
    let input = "name: Something\noriginator_id: someone\nconcept_type: framework\nabstraction_level: theoretical\nstatus: active\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_generic_node(&lines, "concept");

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("id")));
}

// Sub-concept with parent_concept_id and no generation/stream
#[test]
fn sub_concept_without_generation_stream() {
    let input = "id: clear_domain
name: Clear Domain
originator_id: snowden
concept_type: framework
abstraction_level: operational
status: active
parent_concept_id: cynefin";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "concept").expect("should parse sub-concept");
    assert_eq!(node.fields.get("parent_concept_id").map(|s| s.as_str()), Some("cynefin"));
    assert!(node.generation.is_none(), "generation should be None for sub-concept");
    assert!(node.stream.is_none(), "stream should be None for sub-concept");
}

// Edge case: missing optional notes field defaults to None
#[test]
fn concept_without_notes_defaults_to_none() {
    let input = "id: test_concept
name: Test Concept
originator_id: someone
concept_type: principle
abstraction_level: operational
status: active
generation: 1
stream: mgmt";

    let lines = lex_fenced_block(input);
    let node = parse_generic_node(&lines, "concept").expect("should parse");
    assert!(node.notes.is_none());
}
