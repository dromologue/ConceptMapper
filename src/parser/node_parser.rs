use std::collections::HashMap;
use crate::parser::lexer::{ClassifiedLine, LineType};
use crate::parser::errors::ParseError;

/// A parsed thinker node.
#[derive(Debug, Clone)]
pub struct ThinkerNode {
    pub id: String,
    pub name: String,
    pub dates: Option<String>,
    pub eminence: Eminence,
    pub generation: i32,
    pub stream: String,
    pub structural_roles: Vec<String>,
    pub active_period: Option<String>,
    pub key_concept_ids: Vec<String>,
    pub institutional_base: Option<String>,
    pub notes: Option<String>,
}

/// A parsed concept node.
#[derive(Debug, Clone)]
pub struct ConceptNode {
    pub id: String,
    pub name: String,
    pub originator_id: String,
    pub date_introduced: Option<String>,
    pub concept_type: ConceptType,
    pub abstraction_level: AbstractionLevel,
    pub status: ConceptStatus,
    /// Optional for sub-concepts — inherited from parent at assembly time (REQ-017)
    pub generation: Option<i32>,
    /// Optional for sub-concepts — inherited from parent at assembly time (REQ-017)
    pub stream: Option<String>,
    pub parent_concept_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Eminence {
    Dominant,
    Major,
    Secondary,
    Minor,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ConceptType {
    Framework,
    Principle,
    Distinction,
    Mechanism,
    Prescription,
    Synthesis,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AbstractionLevel {
    Concrete,
    Operational,
    Theoretical,
    MetaTheoretical,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ConceptStatus {
    Active,
    Absorbed,
    Contested,
    Dormant,
    Superseded,
}

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

/// Parse a list value like `[a, b, c]` or `a, b, c` into Vec<String>.
fn parse_list_value(value: &str) -> Vec<String> {
    let trimmed = value.trim();
    let inner = if trimmed.starts_with('[') && trimmed.ends_with(']') {
        &trimmed[1..trimmed.len() - 1]
    } else {
        trimmed
    };
    inner
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn parse_eminence(value: &str, line: usize) -> Result<Eminence, ParseError> {
    match value.trim().to_lowercase().as_str() {
        "dominant" => Ok(Eminence::Dominant),
        "major" => Ok(Eminence::Major),
        "secondary" => Ok(Eminence::Secondary),
        "minor" => Ok(Eminence::Minor),
        other => Err(ParseError {
            line,
            context: format!("eminence: {}", other),
            message: format!("invalid eminence value '{}'", other),
            suggestion: Some("valid values are: dominant, major, secondary, minor".to_string()),
        }),
    }
}

fn parse_concept_type(value: &str, line: usize) -> Result<ConceptType, ParseError> {
    match value.trim().to_lowercase().as_str() {
        "framework" => Ok(ConceptType::Framework),
        "principle" => Ok(ConceptType::Principle),
        "distinction" => Ok(ConceptType::Distinction),
        "mechanism" => Ok(ConceptType::Mechanism),
        "prescription" => Ok(ConceptType::Prescription),
        "synthesis" => Ok(ConceptType::Synthesis),
        other => Err(ParseError {
            line,
            context: format!("concept_type: {}", other),
            message: format!("invalid concept_type value '{}'", other),
            suggestion: Some("valid values are: framework, principle, distinction, mechanism, prescription, synthesis".to_string()),
        }),
    }
}

fn parse_abstraction_level(value: &str, line: usize) -> Result<AbstractionLevel, ParseError> {
    match value.trim().to_lowercase().as_str() {
        "concrete" => Ok(AbstractionLevel::Concrete),
        "operational" => Ok(AbstractionLevel::Operational),
        "theoretical" => Ok(AbstractionLevel::Theoretical),
        "meta-theoretical" => Ok(AbstractionLevel::MetaTheoretical),
        other => Err(ParseError {
            line,
            context: format!("abstraction_level: {}", other),
            message: format!("invalid abstraction_level value '{}'", other),
            suggestion: Some("valid values are: concrete, operational, theoretical, meta-theoretical".to_string()),
        }),
    }
}

fn parse_concept_status(value: &str, line: usize) -> Result<ConceptStatus, ParseError> {
    match value.trim().to_lowercase().as_str() {
        "active" => Ok(ConceptStatus::Active),
        "absorbed" => Ok(ConceptStatus::Absorbed),
        "contested" => Ok(ConceptStatus::Contested),
        "dormant" => Ok(ConceptStatus::Dormant),
        "superseded" => Ok(ConceptStatus::Superseded),
        other => Err(ParseError {
            line,
            context: format!("status: {}", other),
            message: format!("invalid status value '{}'", other),
            suggestion: Some("valid values are: active, absorbed, contested, dormant, superseded".to_string()),
        }),
    }
}

/// Parse a fenced block's lines into a ThinkerNode.
pub fn parse_thinker_node(lines: &[ClassifiedLine]) -> Result<ThinkerNode, Vec<ParseError>> {
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

    let eminence = match kv.get("eminence") {
        Some((v, ln)) => match parse_eminence(v, *ln) {
            Ok(e) => e,
            Err(e) => { errors.push(e); Eminence::Minor }
        },
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'eminence'".to_string(),
                suggestion: Some("add 'eminence: dominant|major|secondary|minor'".to_string()),
            });
            Eminence::Minor
        }
    };

    let generation = match kv.get("generation") {
        Some((v, ln)) => v.trim().parse::<i32>().unwrap_or_else(|_| {
            errors.push(ParseError {
                line: *ln,
                context: format!("generation: {}", v),
                message: format!("invalid integer '{}'", v),
                suggestion: Some("generation must be a positive integer".to_string()),
            });
            0
        }),
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'generation'".to_string(),
                suggestion: None,
            });
            0
        }
    };

    let stream = match kv.get("stream") {
        Some((v, _)) => v.clone(),
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'stream'".to_string(),
                suggestion: None,
            });
            String::new()
        }
    };

    if !errors.is_empty() {
        return Err(errors);
    }

    let structural_roles = kv.get("structural_role")
        .map(|(v, _)| parse_list_value(v))
        .unwrap_or_default();

    let key_concept_ids = kv.get("key_concept_ids")
        .map(|(v, _)| parse_list_value(v))
        .unwrap_or_default();

    Ok(ThinkerNode {
        id,
        name,
        dates: kv.get("dates").map(|(v, _)| v.clone()),
        eminence,
        generation,
        stream,
        structural_roles,
        active_period: kv.get("active_period").map(|(v, _)| v.clone()),
        key_concept_ids,
        institutional_base: kv.get("institutional_base").map(|(v, _)| v.clone()),
        notes: kv.get("notes").map(|(v, _)| v.clone()),
    })
}

/// Parse a fenced block's lines into a ConceptNode.
pub fn parse_concept_node(lines: &[ClassifiedLine]) -> Result<ConceptNode, Vec<ParseError>> {
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

    // originator_id defaults to "unknown_author" when absent (REQ-004, REQ-006)
    let originator_id = kv.get("originator_id")
        .map(|(v, _)| v.clone())
        .unwrap_or_else(|| "unknown_author".to_string());

    let concept_type = match kv.get("concept_type") {
        Some((v, ln)) => match parse_concept_type(v, *ln) {
            Ok(ct) => ct,
            Err(e) => { errors.push(e); ConceptType::Framework }
        },
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'concept_type'".to_string(),
                suggestion: None,
            });
            ConceptType::Framework
        }
    };

    let abstraction_level = match kv.get("abstraction_level") {
        Some((v, ln)) => match parse_abstraction_level(v, *ln) {
            Ok(al) => al,
            Err(e) => { errors.push(e); AbstractionLevel::Theoretical }
        },
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'abstraction_level'".to_string(),
                suggestion: None,
            });
            AbstractionLevel::Theoretical
        }
    };

    let status = match kv.get("status") {
        Some((v, ln)) => match parse_concept_status(v, *ln) {
            Ok(s) => s,
            Err(e) => { errors.push(e); ConceptStatus::Active }
        },
        None => {
            errors.push(ParseError {
                line: block_line,
                context: String::new(),
                message: "missing required field 'status'".to_string(),
                suggestion: None,
            });
            ConceptStatus::Active
        }
    };

    // generation and stream are optional for concepts — sub-concepts inherit from parent (REQ-017)
    let generation = match kv.get("generation") {
        Some((v, ln)) => Some(v.trim().parse::<i32>().unwrap_or_else(|_| {
            errors.push(ParseError {
                line: *ln,
                context: format!("generation: {}", v),
                message: format!("invalid integer '{}'", v),
                suggestion: None,
            });
            0
        })),
        None => None,
    };

    let stream = kv.get("stream").map(|(v, _)| v.clone());

    let parent_concept_id = kv.get("parent_concept_id").map(|(v, _)| v.clone());

    if !errors.is_empty() {
        return Err(errors);
    }

    Ok(ConceptNode {
        id,
        name,
        originator_id,
        date_introduced: kv.get("date_introduced").map(|(v, _)| v.clone()),
        concept_type,
        abstraction_level,
        status,
        generation,
        stream,
        parent_concept_id,
        notes: kv.get("notes").map(|(v, _)| v.clone()),
    })
}
