use concept_mapper_core::graph::assemble::parse_document;

// SPEC: REQ-057 - Integration test with organisational-learning.cm example

#[test]
fn parse_organisational_learning_example() {
    let input = include_str!("../examples/organisational-learning.cm");
    let result = parse_document(input, Some("examples/organisational-learning.cm"))
        .expect("should parse organisational-learning.cm without errors");

    let graph = &result.graph;

    // AC-057-01: Parses successfully (covered by expect above)
    // AC-057-02: Contains expected node and edge counts
    assert!(graph.nodes.len() >= 50, "expected 50+ nodes, got {}", graph.nodes.len());
    assert!(graph.edges.len() >= 60, "expected 60+ edges, got {}", graph.edges.len());

    // Verify metadata
    assert_eq!(graph.version, "1.0");
    assert!(graph.metadata.title.as_ref().unwrap().contains("Organisational Learning"));
    assert!(graph.metadata.generations.len() >= 4);
    assert!(graph.metadata.streams.len() >= 5);
    assert!(!graph.metadata.external_shocks.is_empty());
    assert!(!graph.metadata.structural_observations.is_empty());
}

#[test]
fn example_nodes_have_generic_fields() {
    let input = include_str!("../examples/organisational-learning.cm");
    let result = parse_document(input, None).expect("should parse");
    let graph = &result.graph;

    // AC-057-03: No thinker_fields, concept_fields, or edge_category in output
    let json = serde_json::to_string(&graph).expect("should serialize");
    assert!(!json.contains("thinker_fields"), "output should not contain thinker_fields");
    assert!(!json.contains("concept_fields"), "output should not contain concept_fields");
    assert!(!json.contains("edge_category"), "output should not contain edge_category");

    // AC-057-04: Fields are in the generic fields BTreeMap
    let bourdieu = graph.nodes.iter().find(|n| n.id == "bourdieu")
        .expect("should find bourdieu node");
    assert_eq!(bourdieu.node_type, "thinker");
    assert!(bourdieu.fields.is_some());
    let fields = bourdieu.fields.as_ref().unwrap();
    assert_eq!(fields.get("eminence").map(|s| s.as_str()), Some("dominant"));
    assert!(fields.get("dates").is_some());
    assert!(fields.get("institutional_base").is_some());

    // Concept nodes also use generic fields
    let habitus = graph.nodes.iter().find(|n| n.id == "habitus")
        .expect("should find habitus node");
    assert_eq!(habitus.node_type, "concept");
    let cfields = habitus.fields.as_ref().unwrap();
    assert_eq!(cfields.get("concept_type").map(|s| s.as_str()), Some("mechanism"));
    assert_eq!(cfields.get("status").map(|s| s.as_str()), Some("active"));
}

#[test]
fn example_edge_types_are_strings() {
    let input = include_str!("../examples/organisational-learning.cm");
    let result = parse_document(input, None).expect("should parse");

    // AC-046-06: Edge types are free-form strings
    let edge_types: std::collections::HashSet<String> = result.graph.edges.iter()
        .map(|e| e.edge_type.clone())
        .collect();

    assert!(edge_types.contains("chain"));
    assert!(edge_types.contains("originates"));
    assert!(edge_types.contains("rivalry"));
    assert!(edge_types.contains("alliance"));
    assert!(edge_types.contains("extends"));
    assert!(edge_types.contains("opposes"));
    assert!(edge_types.contains("enables"));
    assert!(edge_types.contains("teacher_pupil"));
}

#[test]
fn example_streams_parsed() {
    let input = include_str!("../examples/organisational-learning.cm");
    let result = parse_document(input, None).expect("should parse");

    let stream_ids: Vec<&str> = result.graph.metadata.streams.iter()
        .map(|s| s.id.as_str())
        .collect();

    assert!(stream_ids.contains(&"identity"));
    assert!(stream_ids.contains(&"information"));
    assert!(stream_ids.contains(&"institution"));
    assert!(stream_ids.contains(&"management"));
    assert!(stream_ids.contains(&"psychology"));
}

#[test]
fn example_has_no_parse_warnings_for_known_nodes() {
    let input = include_str!("../examples/organisational-learning.cm");
    let result = parse_document(input, None).expect("should parse");

    // Check that most edges reference known nodes (warnings are for unknown refs)
    // Some warnings are expected for edges referencing nodes not in the taxonomy
    let warning_count = result.warnings.len();
    assert!(warning_count < 5, "expected fewer than 5 warnings, got {}: {:?}",
        warning_count, result.warnings.iter().map(|w| &w.message).collect::<Vec<_>>());
}
