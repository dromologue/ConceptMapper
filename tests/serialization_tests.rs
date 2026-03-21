use std::collections::BTreeMap;
use concept_mapper_core::graph::ir::*;

// SPEC: REQ-007 - JSON Serialization

fn sample_graph_ir() -> GraphIR {
    let mut thinker_fields = BTreeMap::new();
    thinker_fields.insert("dates".to_string(), "1923–2013".to_string());
    thinker_fields.insert("eminence".to_string(), "dominant".to_string());
    thinker_fields.insert("structural_roles".to_string(), "intellectual_leader".to_string());
    thinker_fields.insert("active_period".to_string(), "1960–1995".to_string());
    thinker_fields.insert("key_concept_ids".to_string(), "[double_loop]".to_string());
    thinker_fields.insert("institutional_base".to_string(), "Harvard Business School".to_string());

    let mut concept_fields = BTreeMap::new();
    concept_fields.insert("originator_id".to_string(), "argyris".to_string());
    concept_fields.insert("date_introduced".to_string(), "1977".to_string());
    concept_fields.insert("concept_type".to_string(), "distinction".to_string());
    concept_fields.insert("abstraction_level".to_string(), "theoretical".to_string());
    concept_fields.insert("status".to_string(), "active".to_string());

    GraphIR {
        version: "1.0".to_string(),
        metadata: Metadata {
            title: Some("Test Network".to_string()),
            source_file: Some("test.md".to_string()),
            parsed_at: Some("2026-03-14T00:00:00Z".to_string()),
            generations: vec![
                Generation {
                    number: 1,
                    period: Some("~1880–1920".to_string()),
                    label: Some("Founders".to_string()),
                    attention_space_count: Some(3),
                },
            ],
            streams: vec![
                Stream {
                    id: "mgmt".to_string(),
                    name: "Management & Organisation".to_string(),
                    color: Some("#4A90D9".to_string()),
                    description: Some("How organisations should be designed".to_string()),
                },
            ],
            external_shocks: vec![
                ExternalShock {
                    date: "1950s".to_string(),
                    description: "Quality revolution in Japan".to_string(),
                },
            ],
            structural_observations: vec!["Test observation".to_string()],
            network_stats: Some(NetworkStats {
                chain_depth: Some(4),
                node_count: 2,
                edge_count: 1,
            }),
        },
        nodes: vec![
            Node {
                id: "argyris".to_string(),
                node_type: "thinker".to_string(),
                name: "Chris Argyris".to_string(),
                generation: Some(2),
                stream: Some("psychology".to_string()),
                fields: Some(thinker_fields),
                content: None,
                notes: None,
            },
            Node {
                id: "double_loop".to_string(),
                node_type: "concept".to_string(),
                name: "Double-Loop Learning".to_string(),
                generation: Some(3),
                stream: Some("psychology".to_string()),
                fields: Some(concept_fields),
                content: None,
                notes: None,
            },
        ],
        edges: vec![
            Edge {
                from: "argyris".to_string(),
                to: "double_loop".to_string(),
                edge_type: "originates".to_string(),
                directed: true,
                weight: 1.0,
                note: None,
                visual: EdgeVisual {
                    style: "solid".to_string(),
                    color: None,
                    show_arrow: true,
                },
            },
        ],
    }
}

// AC-007-01: Output is valid JSON
#[test]
fn serializes_to_valid_json() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir);
    assert!(json.is_ok(), "should serialize to valid JSON");
}

// AC-007-02: version field present with value "1.0"
#[test]
fn version_field_present() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert_eq!(value["version"], "1.0");
}

// AC-007-03: metadata object contains title, source_file, parsed_at
#[test]
fn metadata_fields_present() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert!(value["metadata"]["title"].is_string());
    assert!(value["metadata"]["source_file"].is_string());
    assert!(value["metadata"]["parsed_at"].is_string());
}

// AC-007-04: nodes is an array with correct field names
#[test]
fn nodes_array_with_correct_fields() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert!(value["nodes"].is_array());
    let nodes = value["nodes"].as_array().unwrap();
    assert_eq!(nodes.len(), 2);

    let thinker = &nodes[0];
    assert_eq!(thinker["id"], "argyris");
    assert_eq!(thinker["node_type"], "thinker");
    assert!(thinker["fields"].is_object());
    assert_eq!(thinker["fields"]["eminence"], "dominant");

    let concept = &nodes[1];
    assert_eq!(concept["id"], "double_loop");
    assert_eq!(concept["node_type"], "concept");
    assert!(concept["fields"].is_object());
    assert_eq!(concept["fields"]["concept_type"], "distinction");
}

// AC-007-05: edges array with visual sub-object
#[test]
fn edges_array_with_visual() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert!(value["edges"].is_array());
    let edges = value["edges"].as_array().unwrap();
    assert_eq!(edges.len(), 1);

    let edge = &edges[0];
    assert_eq!(edge["edge_type"], "originates");
    assert_eq!(edge["directed"], true);
    assert!(edge["visual"].is_object());
    assert_eq!(edge["visual"]["style"], "solid");
    assert_eq!(edge["visual"]["show_arrow"], true);
}

// AC-007-06: Round-trip test
#[test]
fn roundtrip_serialization() {
    let ir = sample_graph_ir();
    let json1 = serde_json::to_string_pretty(&ir).unwrap();
    let deserialized: GraphIR = serde_json::from_str(&json1).unwrap();
    let json2 = serde_json::to_string_pretty(&deserialized).unwrap();

    assert_eq!(json1, json2, "round-trip serialization should produce identical JSON");
}

// AC-007-07: None optional fields omitted from JSON
#[test]
fn none_fields_omitted() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    // Neither node should have content
    let thinker = &value["nodes"][0];
    assert!(thinker.get("content").is_none() || thinker["content"].is_null(),
        "content should be omitted when absent");

    // Nodes without notes should not have notes key
    assert!(thinker.get("notes").is_none() || thinker["notes"].is_null());
}

// Edge case: empty graph
#[test]
fn empty_graph_serializes() {
    let ir = GraphIR {
        version: "1.0".to_string(),
        metadata: Metadata {
            title: None,
            source_file: None,
            parsed_at: None,
            generations: vec![],
            streams: vec![],
            external_shocks: vec![],
            structural_observations: vec![],
            network_stats: None,
        },
        nodes: vec![],
        edges: vec![],
    };

    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert_eq!(value["nodes"].as_array().unwrap().len(), 0);
    assert_eq!(value["edges"].as_array().unwrap().len(), 0);
}

// AC-007-08: Node content object serialized when present, omitted when absent
#[test]
fn content_serialized_when_present() {
    let mut ir = sample_graph_ir();
    ir.nodes[0].content = Some(NodeContent {
        summary: Some("Argyris developed theories of organizational learning.".to_string()),
        key_works: Some(vec![
            "Organizational Learning (1978)".to_string(),
            "Overcoming Organizational Defenses (1990)".to_string(),
        ]),
        critiques: Some(vec!["Difficult to implement in practice".to_string()]),
        connections_prose: Some(vec![
            ConnectionProse {
                target_id: "senge".to_string(),
                text: "Senge built learning organisation concept on Argyris' double-loop theory".to_string(),
            },
        ]),
    });

    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    let thinker = &value["nodes"][0];
    assert!(thinker["content"].is_object(), "content should be present");
    assert!(thinker["content"]["summary"].is_string());
    assert_eq!(thinker["content"]["key_works"].as_array().unwrap().len(), 2);
    assert_eq!(thinker["content"]["critiques"].as_array().unwrap().len(), 1);
    assert_eq!(thinker["content"]["connections_prose"].as_array().unwrap().len(), 1);
    assert_eq!(thinker["content"]["connections_prose"][0]["target_id"], "senge");

    let concept = &value["nodes"][1];
    assert!(concept.get("content").is_none() || concept["content"].is_null(),
        "content should be omitted when absent");
}

// AC-007-08: Content omitted when all sub-fields are None
#[test]
fn content_omitted_when_absent() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();

    assert!(!json.contains("\"content\""), "content key should not appear in JSON");
}

// AC-007-09: Edge weight field serialized as float
#[test]
fn edge_weight_serialized() {
    let mut ir = sample_graph_ir();
    ir.edges[0].weight = 0.7;

    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    let weight = value["edges"][0]["weight"].as_f64().unwrap();
    assert!((weight - 0.7).abs() < f64::EPSILON, "weight should be 0.7, got {}", weight);
}

// AC-016-07: Round-trip with content fields
#[test]
fn roundtrip_with_content() {
    let mut ir = sample_graph_ir();
    ir.nodes[0].content = Some(NodeContent {
        summary: Some("Test summary with unicode: émigré, naïve".to_string()),
        key_works: None,
        critiques: None,
        connections_prose: None,
    });

    let json1 = serde_json::to_string_pretty(&ir).unwrap();
    let deserialized: GraphIR = serde_json::from_str(&json1).unwrap();
    let json2 = serde_json::to_string_pretty(&deserialized).unwrap();

    assert_eq!(json1, json2, "round-trip with content should produce identical JSON");
}

// Fields are stored as key-value pairs in the fields HashMap
#[test]
fn fields_stored_as_hashmap() {
    let ir = sample_graph_ir();
    let json = serde_json::to_string(&ir).unwrap();
    let value: serde_json::Value = serde_json::from_str(&json).unwrap();

    let concept = &value["nodes"][1];
    assert_eq!(concept["fields"]["originator_id"], "argyris");
    assert_eq!(concept["fields"]["concept_type"], "distinction");
    assert_eq!(concept["fields"]["abstraction_level"], "theoretical");
    assert_eq!(concept["fields"]["status"], "active");
}
