use concept_mapper_core::graph::assemble::parse_document;

// SPEC: REQ-006 - Stream parsing: backticks stripped, named colors normalized

#[test]
fn stream_id_backticks_stripped() {
    let input = r#"# Test Taxonomy

## Streams

| Stream ID | Name | Colour | Description |
|-----------|------|--------|-------------|
| `mgmt` | Management | Blue | How orgs work |
| `psych` | Psychology | Amber | How people think |

## Thinker Nodes

```
id: t1
name: Test Thinker
stream: mgmt
generation: 1
eminence: minor
```
"#;

    let result = parse_document(input, None).expect("should parse");
    let streams = &result.graph.metadata.streams;

    assert_eq!(streams.len(), 2);
    assert_eq!(streams[0].id, "mgmt", "backticks should be stripped from stream ID");
    assert_eq!(streams[1].id, "psych", "backticks should be stripped from stream ID");
}

#[test]
fn named_colors_normalized_to_hex() {
    let input = r#"# Test Taxonomy

## Streams

| Stream ID | Name | Colour | Description |
|-----------|------|--------|-------------|
| mgmt | Management | Blue | How orgs work |
| psych | Psychology | Amber | How people think |
| sys | Systems | Green | How systems work |
| sense | Sensemaking | Purple | How meaning is made |
| crit | Critical | Red | Critique |
| already | Already Hex | #ABCDEF | Already hex |

## Thinker Nodes

```
id: t1
name: Test Thinker
stream: mgmt
generation: 1
eminence: minor
```
"#;

    let result = parse_document(input, None).expect("should parse");
    let streams = &result.graph.metadata.streams;

    assert_eq!(streams[0].color.as_deref(), Some("#4A90D9"), "Blue → #4A90D9");
    assert_eq!(streams[1].color.as_deref(), Some("#E6A23C"), "Amber → #E6A23C");
    assert_eq!(streams[2].color.as_deref(), Some("#4AD94A"), "Green → #4AD94A");
    assert_eq!(streams[3].color.as_deref(), Some("#9B59B6"), "Purple → #9B59B6");
    assert_eq!(streams[4].color.as_deref(), Some("#D94A4A"), "Red → #D94A4A");
    assert_eq!(streams[5].color.as_deref(), Some("#ABCDEF"), "Hex preserved as-is");
}

#[test]
fn stream_id_matches_node_stream_field() {
    let input = r#"# Test Taxonomy

## Streams

| Stream ID | Name | Colour | Description |
|-----------|------|--------|-------------|
| `mgmt` | Management | Blue | How orgs work |

## Thinker Nodes

```
id: t1
name: Test Thinker
stream: mgmt
generation: 1
eminence: minor
```
"#;

    let result = parse_document(input, None).expect("should parse");
    let stream_id = &result.graph.metadata.streams[0].id;
    let node_stream = result.graph.nodes[0].stream.as_deref().unwrap();

    assert_eq!(stream_id, node_stream,
        "stream table ID '{}' should match node stream field '{}'", stream_id, node_stream);
}
