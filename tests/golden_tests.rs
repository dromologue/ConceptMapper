//! Golden-file snapshot tests for the parser.
//!
//! Each test parses a known .cm fixture and compares the resulting GraphIR
//! against a stored JSON snapshot. The comparison is structural (parsed
//! JSON values, sorted maps, ignoring volatile fields like `parsed_at`),
//! not byte-exact, so cosmetic JSON differences don't cause spurious
//! failures.
//!
//! To regenerate snapshots after an intentional change:
//!
//!     UPDATE_GOLDEN=1 cargo test --test golden_tests
//!
//! SPEC: REQ-117 - Snapshot coverage for known .cm fixtures

use concept_mapper_core::graph::assemble::parse_document;
use concept_mapper_core::graph::ir::GraphIR;
use serde_json::{json, Value};
use std::fs;
use std::path::Path;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Project root resolved from CARGO_MANIFEST_DIR so tests work from any cwd.
fn project_root() -> &'static Path {
    Path::new(env!("CARGO_MANIFEST_DIR"))
}

/// Strip non-deterministic fields from a GraphIR before snapshotting.
/// At present that's `metadata.parsed_at` (Utc::now) and `metadata.source_file`
/// (an absolute-ish path that varies by checkout).
fn normalise(graph: &GraphIR) -> Value {
    let mut v = serde_json::to_value(graph).expect("GraphIR serialises");
    if let Some(meta) = v.get_mut("metadata").and_then(|m| m.as_object_mut()) {
        meta.remove("parsed_at");
        meta.remove("source_file");
    }
    v
}

/// Compare two JSON values structurally. serde_json::Value already implements
/// PartialEq with map-as-set semantics for objects, so this is enough.
fn assert_json_structurally_equal(actual: &Value, expected: &Value, golden_path: &Path) {
    if actual != expected {
        // Build a compact diff hint: show both sides on a few headline fields
        // so failures are debuggable without dumping the entire JSON blob.
        let actual_pretty = serde_json::to_string_pretty(actual).unwrap_or_default();
        let expected_pretty = serde_json::to_string_pretty(expected).unwrap_or_default();
        panic!(
            "golden mismatch for {}\n\
             To accept the new output, rerun with UPDATE_GOLDEN=1.\n\
             --- expected (first 2000 chars) ---\n{}\n\
             --- actual (first 2000 chars) ---\n{}\n",
            golden_path.display(),
            &expected_pretty.chars().take(2000).collect::<String>(),
            &actual_pretty.chars().take(2000).collect::<String>()
        );
    }
}

/// Common golden-test driver: parse the fixture, normalise, and either
/// write the golden (when UPDATE_GOLDEN=1) or compare to it.
fn run_golden(fixture_rel: &str, golden_rel: &str) {
    let root = project_root();
    let fixture_path = root.join(fixture_rel);
    let golden_path = root.join(golden_rel);

    let input = fs::read_to_string(&fixture_path)
        .unwrap_or_else(|e| panic!("failed to read fixture {}: {}", fixture_path.display(), e));

    let output = parse_document(&input, Some(fixture_rel))
        .unwrap_or_else(|errs| panic!("fixture {} failed to parse: {:?}", fixture_rel, errs));

    let actual = normalise(&output.graph);

    let update_requested = std::env::var("UPDATE_GOLDEN").as_deref() == Ok("1");
    let golden_missing = !golden_path.exists();

    if update_requested || golden_missing {
        if let Some(parent) = golden_path.parent() {
            fs::create_dir_all(parent).expect("create golden dir");
        }
        let pretty = serde_json::to_string_pretty(&actual).expect("serialise golden");
        fs::write(&golden_path, pretty + "\n").expect("write golden");
        if update_requested {
            eprintln!("UPDATE_GOLDEN: wrote {}", golden_path.display());
        } else {
            eprintln!(
                "golden_tests: created missing snapshot {} (review and commit)",
                golden_path.display()
            );
        }
        return;
    }

    let raw = fs::read_to_string(&golden_path).unwrap_or_else(|e| {
        panic!(
            "golden file {} unreadable ({}). Run `UPDATE_GOLDEN=1 cargo test --test golden_tests` to regenerate it.",
            golden_path.display(),
            e
        )
    });
    let expected: Value = serde_json::from_str(&raw)
        .unwrap_or_else(|e| panic!("golden {} is not valid JSON: {}", golden_path.display(), e));

    assert_json_structurally_equal(&actual, &expected, &golden_path);
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

// SPEC: REQ-117-17 - organisational-learning.cm matches its stored snapshot.
#[test]
fn golden_organisational_learning() {
    run_golden(
        "Maps/organisational-learning.cm",
        "tests/golden/organisational-learning.json",
    );
}

// SPEC: REQ-117-18 - tasks-and-notes.cm matches its stored snapshot.
// A second fixture with a different template (group/task nodes) catches
// taxonomy-specific regressions that the first golden would miss.
#[test]
fn golden_tasks_and_notes() {
    run_golden(
        "Maps/tasks-and-notes.cm",
        "tests/golden/tasks-and-notes.json",
    );
}

// ---------------------------------------------------------------------------
// Spot-check: the snapshot is not vacuous
// ---------------------------------------------------------------------------

// SPEC: REQ-117-19 - The golden file actually contains the structures it
// claims to. Guards against an accidentally-empty snapshot slipping through.
#[test]
fn organisational_learning_golden_is_substantive() {
    let root = project_root();
    let golden_path = root.join("tests/golden/organisational-learning.json");
    let raw = match fs::read_to_string(&golden_path) {
        Ok(s) => s,
        Err(_) => {
            // First run: the snapshot driver above will create it; skip.
            return;
        }
    };
    let value: Value = serde_json::from_str(&raw).expect("golden is JSON");

    let nodes = value
        .get("nodes")
        .and_then(|n| n.as_array())
        .expect("nodes array");
    let edges = value
        .get("edges")
        .and_then(|n| n.as_array())
        .expect("edges array");

    assert!(
        nodes.len() >= 50,
        "snapshot looks empty — expected 50+ nodes, got {}",
        nodes.len()
    );
    assert!(
        edges.len() >= 60,
        "snapshot looks empty — expected 60+ edges, got {}",
        edges.len()
    );

    // Volatile fields must be stripped.
    let meta = value
        .get("metadata")
        .and_then(|m| m.as_object())
        .expect("metadata object");
    assert!(
        !meta.contains_key("parsed_at"),
        "snapshot must strip parsed_at (it changes every run)"
    );
    assert!(
        !meta.contains_key("source_file"),
        "snapshot must strip source_file"
    );

    // Sanity: the JSON shape we promise downstream consumers is stable.
    assert_eq!(
        value.get("version"),
        Some(&json!("1.0")),
        "schema version must remain 1.0"
    );
}
