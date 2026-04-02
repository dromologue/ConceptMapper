use crate::parser::lexer::{ClassifiedLine, LineType};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalShock {
    pub date: String,
    pub description: String,
}

/// Parse external shock blocks (fenced blocks with date: and description:).
pub fn parse_external_shocks(lines: &[ClassifiedLine]) -> Vec<ExternalShock> {
    let mut shocks = Vec::new();
    let mut current: Option<HashMap<String, Vec<String>>> = None;

    for line in lines {
        match &line.line_type {
            LineType::KVPair { key, value } if key == "date" => {
                // Flush previous
                if let Some(map) = current.take() {
                    if let Some(date) = map.get("date").and_then(|v| v.first()) {
                        let desc = map.get("description")
                            .map(|v| v.join(" "))
                            .unwrap_or_default();
                        shocks.push(ExternalShock {
                            date: date.clone(),
                            description: desc,
                        });
                    }
                }
                let mut map = HashMap::new();
                map.insert("date".to_string(), vec![value.clone()]);
                current = Some(map);
            }
            LineType::KVPair { key, value } if key == "description" => {
                if let Some(ref mut map) = current {
                    map.entry("description".to_string())
                        .or_default()
                        .push(value.clone());
                }
            }
            LineType::Prose { text } => {
                // Continuation of description
                if let Some(ref mut map) = current {
                    if let Some(desc) = map.get_mut("description") {
                        desc.push(text.clone());
                    }
                }
            }
            _ => {}
        }
    }

    // Flush last
    if let Some(map) = current {
        if let Some(date) = map.get("date").and_then(|v| v.first()) {
            let desc = map.get("description")
                .map(|v| v.join(" "))
                .unwrap_or_default();
            shocks.push(ExternalShock {
                date: date.clone(),
                description: desc,
            });
        }
    }

    shocks
}

/// Parse bullet items into structural observations.
pub fn parse_observations(lines: &[ClassifiedLine]) -> Vec<String> {
    lines.iter()
        .filter_map(|l| match &l.line_type {
            LineType::BulletItem { text, .. } => Some(text.clone()),
            _ => None,
        })
        .collect()
}
