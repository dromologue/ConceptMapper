use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// The top-level Graph IR — the contract between Rust and React.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphIR {
    pub version: String,
    pub metadata: Metadata,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub title: Option<String>,
    pub source_file: Option<String>,
    pub parsed_at: Option<String>,
    /// Optional document-level notes (the .cm body can carry a free-form
    /// `## Notes` section). Anything more structured belongs in a node
    /// defined by the template — there are no privileged content types.
    #[serde(default)]
    pub notes: Vec<String>,
    pub network_stats: Option<NetworkStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub node_count: i32,
    pub edge_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub node_type: String,
    pub name: String,
    /// All custom key-value fields for this node, including classifier references.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<BTreeMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub edge_type: String,
    pub directed: bool,
    #[serde(default = "default_weight")]
    pub weight: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub visual: EdgeVisual,
}

fn default_weight() -> f64 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EdgeVisual {
    pub style: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub show_arrow: bool,
}
