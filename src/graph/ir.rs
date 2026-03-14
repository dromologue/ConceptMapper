use serde::{Deserialize, Serialize};

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
    pub generations: Vec<Generation>,
    pub streams: Vec<Stream>,
    pub external_shocks: Vec<ExternalShock>,
    pub structural_observations: Vec<String>,
    pub network_stats: Option<NetworkStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Generation {
    pub number: i32,
    pub period: Option<String>,
    pub label: Option<String>,
    pub attention_space_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalShock {
    pub date: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub chain_depth: Option<i32>,
    pub node_count: i32,
    pub edge_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub node_type: NodeType,
    pub name: String,
    pub generation: Option<i32>,
    pub stream: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thinker_fields: Option<ThinkerFields>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub concept_fields: Option<ConceptFields>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<NodeContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Rich content for a node, populated from concept library extraction or manual authoring.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_works: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub critiques: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connections_prose: Option<Vec<ConnectionProse>>,
}

/// A prose description of a connection to another node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionProse {
    pub target_id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    Thinker,
    Concept,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkerFields {
    pub dates: Option<String>,
    pub eminence: String,
    pub structural_roles: Vec<String>,
    pub active_period: Option<String>,
    pub key_concept_ids: Vec<String>,
    pub institutional_base: Option<String>,
    /// True for auto-generated placeholder nodes (e.g., "Unknown Author")
    #[serde(default, skip_serializing_if = "is_false")]
    pub is_placeholder: bool,
}

fn is_false(v: &bool) -> bool {
    !v
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConceptFields {
    pub originator_id: String,
    pub date_introduced: Option<String>,
    pub concept_type: String,
    pub abstraction_level: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_concept_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub edge_type: String,
    pub edge_category: EdgeCategory,
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
#[serde(rename_all = "snake_case")]
pub enum EdgeCategory {
    ThinkerThinker,
    ThinkerConcept,
    ConceptConcept,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EdgeVisual {
    pub style: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub show_arrow: bool,
}
