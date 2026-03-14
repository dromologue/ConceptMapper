#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm")]
use crate::graph::assemble;

/// WASM entry point: parse a markdown taxonomy document and return Graph IR as JSON.
///
/// Returns a JSON string on success, or throws a JS error with diagnostics on failure.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn parse_markdown_to_json(input: &str) -> Result<String, JsValue> {
    match assemble::parse_document(input, None) {
        Ok(result) => {
            // Collect warnings into a wrapper so the JS side can access them
            let output = serde_json::json!({
                "graph": result.graph,
                "warnings": result.warnings.iter().map(|w| {
                    serde_json::json!({
                        "line": w.line,
                        "message": w.message
                    })
                }).collect::<Vec<_>>()
            });
            serde_json::to_string(&output)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        }
        Err(errors) => {
            let msgs: Vec<String> = errors.iter().map(|e| e.to_string()).collect();
            Err(JsValue::from_str(&msgs.join("\n")))
        }
    }
}
