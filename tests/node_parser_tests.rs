use concept_mapper_core::parser::lexer::{lex, LineType};
use concept_mapper_core::parser::node_parser::*;

// SPEC: REQ-003 - Thinker Node Parsing
// SPEC: REQ-004 - Concept Node Parsing

/// Helper: lex a fenced block and return only the inner lines (between fences)
fn lex_fenced_block(input: &str) -> Vec<concept_mapper_core::parser::lexer::ClassifiedLine> {
    let fenced = format!("```\n{}\n```", input);
    let lines = lex(&fenced);
    // Skip FenceOpen and FenceClose
    lines.into_iter()
        .filter(|l| !matches!(l.line_type, LineType::FenceOpen | LineType::FenceClose))
        .collect()
}

// --- Thinker Node Tests ---

// AC-003-13: Full Argyris example parses correctly
#[test]
fn parse_argyris_thinker_node() {
    let input = "id:           argyris
name:         Chris Argyris
dates:        1923–2013
eminence:     dominant
generation:   2
stream:       psychology
structural_role: intellectual_leader, chain_originator
active_period: 1960–1995
key_concept_ids: [double_loop, defensive_routines, espoused_vs_inuse, model_I_II]
institutional_base: Harvard Business School";

    let lines = lex_fenced_block(input);
    let node = parse_thinker_node(&lines).expect("should parse argyris");

    // AC-003-01: id extracted
    assert_eq!(node.id, "argyris");
    // AC-003-02: name extracted
    assert_eq!(node.name, "Chris Argyris");
    // AC-003-03: dates extracted
    assert_eq!(node.dates.as_deref(), Some("1923–2013"));
    // AC-003-04: eminence parsed as enum
    assert_eq!(node.eminence, Eminence::Dominant);
    // AC-003-05: generation parsed as integer
    assert_eq!(node.generation, 2);
    // AC-003-06: stream extracted
    assert_eq!(node.stream, "psychology");
    // AC-003-07: structural_role comma-separated
    assert_eq!(node.structural_roles, vec!["intellectual_leader", "chain_originator"]);
    // AC-003-09: active_period extracted
    assert_eq!(node.active_period.as_deref(), Some("1960–1995"));
    // AC-003-08: key_concept_ids bracket syntax
    assert_eq!(node.key_concept_ids, vec!["double_loop", "defensive_routines", "espoused_vs_inuse", "model_I_II"]);
    // AC-003-10: institutional_base extracted
    assert_eq!(node.institutional_base.as_deref(), Some("Harvard Business School"));
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
structural_role: structural_rival, peripheral_critic
active_period: 1990–2015
key_concept_ids: [complex_responsive_processes, shadow_system, paradox_of_control]
institutional_base: University of Hertfordshire";

    let lines = lex_fenced_block(input);
    let node = parse_thinker_node(&lines).expect("should parse stacey");

    assert_eq!(node.id, "stacey");
    assert_eq!(node.eminence, Eminence::Major);
    assert_eq!(node.generation, 3);
    assert_eq!(node.structural_roles, vec!["structural_rival", "peripheral_critic"]);
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
structural_role: synthesiser
active_period: 1990–2010
key_concept_ids: [learning_organisation, five_disciplines, system_archetypes]
institutional_base: MIT Sloan";

    let lines = lex_fenced_block(input);
    let node = parse_thinker_node(&lines).expect("should parse senge");

    assert_eq!(node.id, "senge");
    // Edge case: dates with "b. 1947" format stored as-is
    assert_eq!(node.dates.as_deref(), Some("b. 1947"));
    assert_eq!(node.eminence, Eminence::Major);
    assert_eq!(node.structural_roles, vec!["synthesiser"]);
}

// AC-003-11: Missing required fields produce ParseError with line number
#[test]
fn thinker_missing_id_produces_error() {
    let input = "name: Someone\neminence: major\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_thinker_node(&lines);

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("id")),
        "expected error about missing 'id'");
}

#[test]
fn thinker_missing_name_produces_error() {
    let input = "id: someone\neminence: major\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_thinker_node(&lines);

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("name")),
        "expected error about missing 'name'");
}

// AC-003-12: Unknown fields are ignored
#[test]
fn thinker_unknown_fields_ignored() {
    let input = "id: test
name: Test Person
eminence: minor
generation: 1
stream: mgmt
favorite_color: blue
unknown_field: whatever";

    let lines = lex_fenced_block(input);
    let node = parse_thinker_node(&lines).expect("should parse despite unknown fields");

    assert_eq!(node.id, "test");
}

// Invalid eminence produces error with valid options
#[test]
fn thinker_invalid_eminence_produces_error() {
    let input = "id: test\nname: Test\neminence: legendary\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_thinker_node(&lines);

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("legendary")),
        "expected error mentioning invalid value");
    assert!(errors.iter().any(|e| e.suggestion.as_ref().map_or(false, |s| s.contains("dominant"))),
        "expected suggestion with valid values");
}

// --- Concept Node Tests ---

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
    let node = parse_concept_node(&lines).expect("should parse double_loop");

    // AC-004-01: id
    assert_eq!(node.id, "double_loop");
    // AC-004-02: name
    assert_eq!(node.name, "Double-Loop Learning");
    // AC-004-03: originator_id
    assert_eq!(node.originator_id, "argyris");
    // AC-004-04: date_introduced
    assert_eq!(node.date_introduced.as_deref(), Some("1977"));
    // AC-004-05: concept_type enum
    assert_eq!(node.concept_type, ConceptType::Distinction);
    // AC-004-06: abstraction_level enum
    assert_eq!(node.abstraction_level, AbstractionLevel::Theoretical);
    // AC-004-07: status enum
    assert_eq!(node.status, ConceptStatus::Active);
    // AC-004-08: generation
    assert_eq!(node.generation, Some(3));
    // AC-004-09: stream
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
    let node = parse_concept_node(&lines).expect("should parse cynefin");

    assert_eq!(node.id, "cynefin");
    assert_eq!(node.concept_type, ConceptType::Framework);
    assert_eq!(node.abstraction_level, AbstractionLevel::Operational);
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
    let node = parse_concept_node(&lines).expect("should parse seven_conditions");

    assert_eq!(node.id, "seven_conditions");
    assert_eq!(node.concept_type, ConceptType::Synthesis);
    assert!(node.notes.is_some());
    assert!(node.notes.unwrap().contains("Series-originated"));
}

// AC-004-11: meta-theoretical abstraction level
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
    let node = parse_concept_node(&lines).expect("should parse structuration");

    assert_eq!(node.abstraction_level, AbstractionLevel::MetaTheoretical);
}

// AC-004-10: Missing required fields produce ParseError
#[test]
fn concept_missing_id_produces_error() {
    let input = "name: Something\noriginator_id: someone\nconcept_type: framework\nabstraction_level: theoretical\nstatus: active\ngeneration: 1\nstream: mgmt";
    let lines = lex_fenced_block(input);
    let result = parse_concept_node(&lines);

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("id")));
}

// AC-004-03: Missing originator_id defaults to "unknown_author"
#[test]
fn concept_missing_originator_defaults_to_unknown_author() {
    let input = "id: orphan_concept
name: Orphan Concept
concept_type: principle
abstraction_level: operational
status: active";

    let lines = lex_fenced_block(input);
    let node = parse_concept_node(&lines).expect("should parse without originator_id");
    assert_eq!(node.originator_id, "unknown_author");
}

// REQ-017: Sub-concept with parent_concept_id and no generation/stream
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
    let node = parse_concept_node(&lines).expect("should parse sub-concept without generation/stream");
    assert_eq!(node.parent_concept_id.as_deref(), Some("cynefin"));
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
    let node = parse_concept_node(&lines).expect("should parse");
    assert!(node.notes.is_none());
}
