use std::collections::HashMap;
use crate::parser::lexer::{ClassifiedLine, LineType};
use crate::parser::errors::ParseError;

/// Extract key-value pairs from classified lines within a fenced block.
fn extract_kv_map(lines: &[ClassifiedLine]) -> HashMap<String, (String, usize)> {
    let mut map = HashMap::new();
    for line in lines {
        if let LineType::KVPair { key, value } = &line.line_type {
            map.insert(key.clone(), (value.clone(), line.line_number));
        }
    }
    map
}

/// A generic node — only id and name are required, everything else goes into a HashMap.
#[derive(Debug, Clone)]
pub struct GenericNode {
    pub id: String,
    pub name: String,
    pub node_type: String,
    pub generation: Option<i32>,
    pub stream: Option<String>,
    pub fields: HashMap<String, String>,
    pub notes: Option<String>,
}

/// Parse a fenced block's lines into a GenericNode.
/// Only `id` and `name` are required. All other key-value pairs go into `fields`.
pub fn parse_generic_node(lines: &[ClassifiedLine], node_type: &str) -> Result<GenericNode, Vec<ParseError>> {
    let kv = extract_kv_map(lines);
    let mut errors = Vec::new();
    let block_line = lines.first().map(|l| l.line_number).unwrap_or(0);

    let id = match kv.get("id") {
        Some((v, _)) => v.clone(),
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'id'".to_string(),
                suggestion: Some("add 'id: unique_identifier' to the block".to_string()),
            });
            String::new()
        }
    };

    let name = match kv.get("name") {
        Some((v, _)) => v.clone(),
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'name'".to_string(),
                suggestion: Some("add 'name: Display Name' to the block".to_string()),
            });
            String::new()
        }
    };

    if !errors.is_empty() {
        return Err(errors);
    }

    let generation = kv.get("generation")
        .and_then(|(v, _)| v.trim().parse::<i32>().ok());
    let stream = kv.get("stream").map(|(v, _)| v.clone());
    let notes = kv.get("notes").map(|(v, _)| v.clone());

    // All other fields go into the HashMap
    let reserved = ["id", "name", "generation", "stream", "notes"];
    let fields: HashMap<String, String> = kv.iter()
        .filter(|(k, _)| !reserved.contains(&k.as_str()))
        .map(|(k, (v, _))| (k.clone(), v.clone()))
        .collect();

    Ok(GenericNode {
        id,
        name,
        node_type: node_type.to_string(),
        generation,
        stream,
        fields,
        notes,
    })
}
