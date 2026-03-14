use concept_mapper_core::parser::lexer::{lex, LineType};
use concept_mapper_core::parser::edge_parser::*;

// SPEC: REQ-005 - Edge Parsing

/// Helper: lex a fenced block and return only the inner lines
fn lex_fenced_inner(input: &str) -> Vec<concept_mapper_core::parser::lexer::ClassifiedLine> {
    let fenced = format!("```\n{}\n```", input);
    let lines = lex(&fenced);
    lines.into_iter()
        .filter(|l| !matches!(l.line_type, LineType::FenceOpen | LineType::FenceClose))
        .collect()
}

// AC-005-01: Each from: line starts a new edge definition
// AC-005-02: from and to fields extracted as trimmed strings
// AC-005-03: type field parsed as edge type enum
#[test]
fn parse_single_edge_inline_format() {
    let input = "from: taylor    to: argyris    type: chain";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse single edge");

    assert_eq!(edges.len(), 1);
    assert_eq!(edges[0].from, "taylor");
    assert_eq!(edges[0].to, "argyris");
    assert_eq!(edges[0].edge_type, EdgeType::Chain);
}

// AC-005-04: Single-line note values extracted
#[test]
fn parse_edge_with_single_line_note() {
    let input = "from: taylor    to: argyris    type: chain\n  note: Model I as Taylorism internalised as management psychology";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse edge with note");

    assert_eq!(edges.len(), 1);
    assert!(edges[0].note.is_some());
    assert!(edges[0].note.as_ref().unwrap().contains("Model I as Taylorism"));
}

// AC-005-05: Multi-line notes joined with spaces
#[test]
fn parse_edge_with_multiline_note() {
    let input = "from: stacey    to: senge      type: rivalry\n  note: Core rivalry of the phase. Can you design a learning organisation\n        or does learning emerge from complex responsive processes?";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse edge with multiline note");

    assert_eq!(edges.len(), 1);
    let note = edges[0].note.as_ref().expect("should have note");
    assert!(note.contains("Core rivalry"));
    assert!(note.contains("complex responsive processes"));
}

// AC-005-06: Blank lines between edges are ignored
// AC-005-01: Multiple edges in one block
#[test]
fn parse_multiple_edges_in_one_block() {
    let input = "from: taylor    to: argyris    type: chain\n  note: Model I as Taylorism internalised\n\nfrom: argyris   to: edmondson  type: teacher_pupil\n  note: Edmondson studied under Argyris at Harvard\n\nfrom: argyris   to: senge      type: chain\n  note: Learning organisation draws directly on Argyris' learning theory";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse multiple edges");

    assert_eq!(edges.len(), 3);
    assert_eq!(edges[0].from, "taylor");
    assert_eq!(edges[0].to, "argyris");
    assert_eq!(edges[0].edge_type, EdgeType::Chain);
    assert_eq!(edges[1].from, "argyris");
    assert_eq!(edges[1].to, "edmondson");
    assert_eq!(edges[1].edge_type, EdgeType::TeacherPupil);
    assert_eq!(edges[2].from, "argyris");
    assert_eq!(edges[2].to, "senge");
    assert_eq!(edges[2].edge_type, EdgeType::Chain);
}

// AC-005-07: All example thinker-thinker edges parse correctly
#[test]
fn parse_thinker_thinker_edges() {
    let input = "from: taylor    to: argyris    type: chain
  note: Model I as Taylorism internalised as management psychology

from: argyris   to: edmondson  type: teacher_pupil
  note: Edmondson studied under Argyris at Harvard

from: argyris   to: senge      type: chain
  note: Learning organisation draws directly on Argyris' learning theory

from: deming    to: senge      type: chain
  note: Systems thinking and quality lineage

from: beer      to: snowden    type: chain
  note: Snowden worked with Beer; cybernetics into complexity

from: weber     to: parsons    type: chain
  note: Parsons translated Weber into English; structural functionalism

from: parsons   to: giddens    type: chain
  note: Giddens critiqued Parsons; structuration as response to functionalism

from: stacey    to: senge      type: rivalry
  note: Core rivalry of the phase. Can you design a learning organisation
        or does learning emerge from complex responsive processes?

from: follett   to: taylor     type: rivalry
  note: Integration vs unilateral control; power-with vs power-over

from: mintzberg to: drucker    type: rivalry
  note: Emergent vs deliberate strategy

from: kahneman  to: weick      type: alliance
  note: Both study cognition under uncertainty; different methods
        and conclusions

from: deming    to: argyris    type: alliance
  note: Drive out fear / remove defensive routines; systemic not
        individual cause";

    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse all thinker-thinker edges");

    assert_eq!(edges.len(), 12, "expected 12 thinker-thinker edges, got {}", edges.len());

    // Check specific edge types
    let rivalry_count = edges.iter().filter(|e| e.edge_type == EdgeType::Rivalry).count();
    let alliance_count = edges.iter().filter(|e| e.edge_type == EdgeType::Alliance).count();
    let chain_count = edges.iter().filter(|e| e.edge_type == EdgeType::Chain).count();
    let teacher_count = edges.iter().filter(|e| e.edge_type == EdgeType::TeacherPupil).count();

    assert_eq!(rivalry_count, 3, "expected 3 rivalry edges");
    assert_eq!(alliance_count, 2, "expected 2 alliance edges");
    assert_eq!(chain_count, 6, "expected 6 chain edges");
    assert_eq!(teacher_count, 1, "expected 1 teacher_pupil edge");
}

// AC-005-08: All example thinker-concept edges parse correctly
#[test]
fn parse_thinker_concept_edges() {
    let input = "from: argyris   to: double_loop        type: originates
from: dekker    to: just_culture        type: originates
from: dekker    to: drift_into_failure  type: originates
from: snowden   to: cynefin             type: originates
from: giddens   to: structuration       type: originates
from: kahneman  to: system_1_2          type: originates
from: senge     to: seven_conditions    type: develops
  note: Senge's disciplines are partial inputs to the series synthesis
from: stacey    to: double_loop         type: contests
  note: Stacey argues you cannot reliably produce double-loop learning
        because the process of surfacing assumptions is itself shaped
        by power and ideology
from: dekker    to: system_1_2          type: applies
  note: Local rationality and hindsight bias as System 1 phenomena
from: snowden   to: double_loop         type: reframes
  note: Cynefin reframes learning as domain-dependent; double-loop is
        applicable in complicated domains but insufficient in complex ones";

    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse thinker-concept edges");

    assert_eq!(edges.len(), 10, "expected 10 thinker-concept edges, got {}", edges.len());

    let originates_count = edges.iter().filter(|e| e.edge_type == EdgeType::Originates).count();
    assert_eq!(originates_count, 6, "expected 6 originates edges");
}

// AC-005-09: All example concept-concept edges parse correctly
#[test]
fn parse_concept_concept_edges() {
    let input = "from: double_loop         to: seven_conditions   type: enables
  note: Double-loop learning is the mechanism behind Condition 2
        (undiscussables become discussable)

from: just_culture        to: double_loop         type: enables
  note: Just culture creates the safety conditions that allow
        defensive routines to be examined

from: system_1_2          to: drift_into_failure   type: enables
  note: System 1 dominance under pressure explains why drift
        is locally rational

from: structuration       to: drift_into_failure   type: extends
  note: Work-as-imagined vs work-as-done is the structuration gap
        between discursive consciousness and practical consciousness

from: cynefin             to: double_loop          type: reframes
  note: Double-loop works in the complicated domain; the complex
        domain requires probe-sense-respond instead

from: prospect_theory     to: system_1_2           type: extends
  note: System 1/2 is the popularisation of the cognitive architecture
        that prospect theory was built on";

    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse concept-concept edges");

    assert_eq!(edges.len(), 6, "expected 6 concept-concept edges, got {}", edges.len());

    let enables_count = edges.iter().filter(|e| e.edge_type == EdgeType::Enables).count();
    assert_eq!(enables_count, 3, "expected 3 enables edges");
}

// Edge case: edge with no note
#[test]
fn parse_edge_without_note() {
    let input = "from: a    to: b    type: chain";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse edge without note");

    assert_eq!(edges.len(), 1);
    assert!(edges[0].note.is_none());
}

// Edge case: trailing whitespace in from/to
#[test]
fn parse_edge_with_trailing_whitespace() {
    let input = "from: taylor     to: argyris     type: chain  ";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse");

    assert_eq!(edges[0].from, "taylor");
    assert_eq!(edges[0].to, "argyris");
}

// All 15 edge types parse correctly
#[test]
fn all_edge_types_parse() {
    let types = vec![
        "teacher_pupil", "chain", "rivalry", "alliance", "synthesis", "institutional",
        "originates", "develops", "contests", "applies",
        "extends", "opposes", "subsumes", "enables", "reframes",
    ];

    for t in types {
        let input = format!("from: a    to: b    type: {}", t);
        let lines = lex_fenced_inner(&input);
        let edges = parse_edges(&lines);
        assert!(edges.is_ok(), "edge type '{}' should parse successfully", t);
    }
}

// Invalid edge type produces error
#[test]
fn invalid_edge_type_produces_error() {
    let input = "from: a    to: b    type: friendship";
    let lines = lex_fenced_inner(input);
    let result = parse_edges(&lines);

    assert!(result.is_err());
    let errors = result.unwrap_err();
    assert!(errors.iter().any(|e| e.message.contains("friendship")));
}

// AC-005-10: Edge weight parsed when present, defaults to 1.0 when absent
#[test]
fn edge_weight_defaults_to_one() {
    let input = "from: a    to: b    type: chain";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse");

    assert!((edges[0].weight - 1.0).abs() < f64::EPSILON, "default weight should be 1.0");
}

#[test]
fn edge_weight_parsed_when_present() {
    let input = "from: a    to: b    type: chain\n  weight: 0.7";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse");

    assert!((edges[0].weight - 0.7).abs() < f64::EPSILON, "weight should be 0.7");
}

#[test]
fn edge_weight_clamped_to_range() {
    let input = "from: a    to: b    type: chain\n  weight: 1.5";
    let lines = lex_fenced_inner(input);
    let edges = parse_edges(&lines).expect("should parse");

    assert!((edges[0].weight - 1.0).abs() < f64::EPSILON, "weight should be clamped to 1.0");
}
