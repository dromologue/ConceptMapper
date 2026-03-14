# Traceability Matrix

> Maps specifications → tests → implementation status

## Legend
- Status: `pending` | `tested` | `passing` | `failing`

## Rust Backend — Taxonomy Parser

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-001 | AC-001-01 | `tests/lexer_tests.rs` | `header_lines_classified_with_level` | passing |
| REQ-001 | AC-001-02 | `tests/lexer_tests.rs` | `fence_lines_toggle_open_close`, `multiple_fence_blocks_alternate_correctly` | passing |
| REQ-001 | AC-001-03 | `tests/lexer_tests.rs` | `table_rows_classified`, `table_row_cells_extracted` | passing |
| REQ-001 | AC-001-04 | `tests/lexer_tests.rs` | `kv_pairs_inside_fence`, `kv_pairs_outside_fence_are_not_kv` | passing |
| REQ-001 | AC-001-05 | `tests/lexer_tests.rs` | `bullet_items_classified`, `bullet_item_text_extracted` | passing |
| REQ-001 | AC-001-06 | `tests/lexer_tests.rs` | `blank_lines_classified` | passing |
| REQ-001 | AC-001-07 | `tests/lexer_tests.rs` | `prose_lines_classified` | passing |
| REQ-001 | AC-001-08 | `tests/lexer_tests.rs` | `line_numbers_are_one_indexed`, `raw_content_preserved` | passing |
| REQ-001 | AC-001-09 | `tests/lexer_tests.rs` | `lexer_processes_full_taxonomy` | passing |
| REQ-002 | AC-002-01 | `tests/sections_tests.rs` | `h2_headers_create_top_level_sections` | passing |
| REQ-002 | AC-002-02 | `tests/sections_tests.rs` | `h3_headers_create_subsections` | passing |
| REQ-002 | AC-002-03 | `tests/sections_tests.rs` | `preamble_before_first_header` | passing |
| REQ-002 | AC-002-04 | `tests/sections_tests.rs` | `section_paths_from_header_text` | passing |
| REQ-002 | AC-002-05 | `tests/sections_tests.rs` | `taxonomy_sections_structure` | passing |
| REQ-003 | AC-003-01..10 | `tests/node_parser_tests.rs` | `parse_argyris_thinker_node` | passing |
| REQ-003 | AC-003-11 | `tests/node_parser_tests.rs` | `thinker_missing_id_produces_error`, `thinker_missing_name_produces_error` | passing |
| REQ-003 | AC-003-12 | `tests/node_parser_tests.rs` | `thinker_unknown_fields_ignored` | passing |
| REQ-003 | AC-003-13 | `tests/node_parser_tests.rs` | `parse_argyris_thinker_node`, `parse_stacey_thinker_node`, `parse_senge_thinker_node_birth_only` | passing |
| REQ-004 | AC-004-01..09 | `tests/node_parser_tests.rs` | `parse_double_loop_concept`, `parse_cynefin_concept` | passing |
| REQ-004 | AC-004-10 | `tests/node_parser_tests.rs` | `concept_missing_id_produces_error` | passing |
| REQ-004 | AC-004-11 | `tests/node_parser_tests.rs` | 4 concept tests | passing |
| REQ-005 | AC-005-01..06 | `tests/edge_parser_tests.rs` | `parse_single_edge_inline_format`, `parse_multiple_edges_in_one_block` | passing |
| REQ-005 | AC-005-07 | `tests/edge_parser_tests.rs` | `parse_thinker_thinker_edges` | passing |
| REQ-005 | AC-005-08 | `tests/edge_parser_tests.rs` | `parse_thinker_concept_edges` | passing |
| REQ-005 | AC-005-09 | `tests/edge_parser_tests.rs` | `parse_concept_concept_edges` | passing |
| REQ-005 | AC-005-10 | — | — | pending |
| REQ-006 | AC-006-01..14 | `tests/assembly_tests.rs` | — | pending |
| REQ-006 | AC-006-15..16 | — | — | pending |
| REQ-006 | AC-006-17..20 (unknown author) | `tests/assembly_tests.rs` | — | pending |
| REQ-007 | AC-007-01..07 | `tests/serialization_tests.rs` | 8 tests | passing |
| REQ-007 | AC-007-08..09 | — | — | pending |
| REQ-008 | AC-008-01..06 | `tests/cli_tests.rs` | — | pending |
| REQ-014 | AC-014-01..06 | `tests/error_tests.rs` | — | pending |

## LLM-Assisted Extraction Pipeline

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-015 | AC-015-01..05 (LLM core) | `tests/extractor_tests.rs` | — | pending |
| REQ-015 | AC-015-06..09 (thinker extraction) | `tests/extractor_tests.rs` | — | pending |
| REQ-015 | AC-015-10..12 (concept extraction) | `tests/extractor_tests.rs` | — | pending |
| REQ-015 | AC-015-13..16 (edge extraction) | `tests/extractor_tests.rs` | — | pending |
| REQ-015 | AC-015-17..20 (rich content) | `tests/extractor_tests.rs` | — | pending |
| REQ-015 | AC-015-21..26 (assembly/validation) | `tests/extractor_tests.rs` | — | pending |
| REQ-015 | AC-015-27..30 (format agnosticism) | `tests/extractor_tests.rs` | — | pending |

## Graph IR Extensions

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-016 | AC-016-01..07 | `tests/serialization_tests.rs` | — | pending |
| REQ-017 | AC-017-01..06 | `tests/node_parser_tests.rs`, `tests/assembly_tests.rs` | — | pending |

## React Frontend

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-009 | AC-009-01..11 | `src/__tests__/renderer.test.ts` | — | pending |
| REQ-010 | AC-010-01..08 | `src/__tests__/interaction.test.ts` | — | pending |
| REQ-011 | AC-011-01..09 | `src/__tests__/lod.test.ts` | — | pending |
| REQ-012 | AC-012-01..09 | `src/__tests__/clusters.test.ts` | — | pending |
| REQ-013 | AC-013-01..06 | `src/__tests__/search.test.ts` | — | pending |
| REQ-018 | AC-018-01..06 (node editing) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-018 | AC-018-07..10 (unknown author) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-018 | AC-018-11..15 (create/delete) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-018 | AC-018-16..20 (edit state) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-019 | AC-019-01..09 | `src/__tests__/export-image.test.ts` | — | pending |
| REQ-020 | AC-020-01..07 (structure) | `src/__tests__/export-markdown.test.ts`, `tests/export_tests.rs` | — | pending |
| REQ-020 | AC-020-08..13 (content fidelity) | `tests/export_tests.rs` | — | pending |
| REQ-020 | AC-020-14..16 (round-trip) | `tests/export_tests.rs` | — | pending |
| REQ-020 | AC-020-17..19 (metadata) | `tests/export_tests.rs` | — | pending |
| REQ-021 | AC-021-01..03a (toggle + sim) | `src/__tests__/view-modes.test.ts` | — | pending |
| REQ-021 | AC-021-04..08 (people view) | `src/__tests__/view-modes.test.ts` | — | pending |
| REQ-021 | AC-021-09..13 (concept view) | `src/__tests__/view-modes.test.ts` | — | pending |
| REQ-021 | AC-021-14..16 (full view) | `src/__tests__/view-modes.test.ts` | — | pending |
| REQ-022 | AC-022-01..09 | `src/__tests__/edge-labels.test.ts` | — | pending |
| REQ-023 | AC-023-01..04 (layout/view) | `src/__tests__/toolbar.test.ts` | — | pending |
| REQ-023 | AC-023-05..08 (add controls) | `src/__tests__/toolbar.test.ts` | — | pending |
| REQ-023 | AC-023-09..11 (export controls) | `src/__tests__/toolbar.test.ts` | — | pending |
| REQ-023 | AC-023-12..14 (edit controls) | `src/__tests__/toolbar.test.ts` | — | pending |
| REQ-023 | AC-023-15..18 (notes) | `src/__tests__/toolbar.test.ts` | — | pending |
| REQ-024 | AC-024-01..08 | `src/__tests__/search.test.ts` | — | pending |
| REQ-025 | AC-025-01..08 | `src/__tests__/import.test.ts` | — | pending |
| REQ-026 | AC-026-01..07 | `src/__tests__/canvas-labels.test.ts` | — | pending |
| REQ-027 | AC-027-01..08 | `src/__tests__/edge-hover.test.ts` | — | pending |
| REQ-028 | AC-028-01..08 | `src/__tests__/persistence.test.ts` | — | pending |
| REQ-029 | AC-029-01..06 | `src/__tests__/accessibility.test.ts` | — | pending |

## Principle Compliance

| Spec | Architecture | Development | Security |
|------|-------------|-------------|----------|
| REQ-001–005 | Rust-only, no frontend concerns | Result types, no unwrap | Input validation at boundary |
| REQ-006 | IR is the contract, visual props computed server-side; concept hierarchy supported (P10) | Typed enums | Sanitized node content |
| REQ-007 | JSON contract matches shared schema; rich content and edge weight serialized (P8, P9) | Round-trip tested | No secrets in output |
| REQ-008 | Thin CLI wrapper around core lib | Errors to stderr | File path validated |
| REQ-009–013 | React-only, reads IR contract; edge LOD independent of node LOD (P9) | TS strict, React Testing Library | No dangerouslySetInnerHTML |
| REQ-014 | Parser concerns only | Actionable messages | No internal detail exposure |
| REQ-015 | Separate extraction tool, not part of parser (P7); preserves rich content (P8); sets edge weight (P9) | Tested against concept library | Sanitizes extracted content |
| REQ-016 | Rich content model in IR (P8) | Content fields round-trip tested | Content escaped for rendering |
| REQ-017 | Concept hierarchy support (P10); collapsible clusters in viz | Hierarchy validation tested | — |
| REQ-018 | Mutation layer on IR (P4); notes persist through export | Undo/redo tested; round-trip notes | Edited content escaped |
| REQ-019 | React-only export from canvas | Image export tested | No user paths in filenames |
| REQ-020 | Export produces valid taxonomy (P6) | Round-trip parse-export-reparse | Content sanitized in export |
| REQ-021 | View modes filter IR, no re-parse; React-only (P1) | View toggle tested per mode | No hidden data exposure |
| REQ-022 | Edge labels from taxonomy enum set (P2 contract) | Label mapping tested | Labels escaped for canvas |
| REQ-023 | Toolbar is React-only; actions dispatch to existing REQs | Toolbar integration tests | Export buttons validate state |
