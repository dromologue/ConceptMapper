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
| REQ-001 | AC-001-09 | — | — | pending (requires external taxonomy file) |
| REQ-002 | AC-002-01 | `tests/sections_tests.rs` | `h2_headers_create_top_level_sections` | passing |
| REQ-002 | AC-002-02 | `tests/sections_tests.rs` | `h3_headers_create_subsections` | passing |
| REQ-002 | AC-002-03 | `tests/sections_tests.rs` | `preamble_before_first_header` | passing |
| REQ-002 | AC-002-04 | `tests/sections_tests.rs` | `section_paths_from_header_text` | passing |
| REQ-002 | AC-002-05 | — | — | pending (requires external taxonomy file) |
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
| REQ-018 | AC-018-16 (undo) | `src/__tests__/stores/useGraphStore.test.ts` | `undo restores previous state` | passing |
| REQ-018 | AC-018-17 (redo) | `src/__tests__/stores/useGraphStore.test.ts` | `redo restores undone state` | passing |
| REQ-018 | AC-018-18..20 (edit state) | `src/__tests__/editing.test.ts` | — | pending |
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
| REQ-026 | AC-026-01..15 (attribute filtering) | `src/__tests__/filter-panel.test.ts` | — | pending |
| REQ-027 | AC-027-01..08 | `src/__tests__/edge-hover.test.ts` | — | pending |
| REQ-028 | AC-028-01..08 | `src/__tests__/persistence.test.ts` | — | pending |
| REQ-029 | AC-029-01..06 | `src/__tests__/accessibility.test.ts` | — | pending |
| REQ-030 | AC-030-01..08 (thinker editing) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-030 | AC-030-09..15 (concept editing) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-030 | AC-030-16..20 (edit state) | `src/__tests__/editing.test.ts` | — | pending |
| REQ-031 | AC-031-01..05 | `src/__tests__/center-on-node.test.ts` | — | pending |
| REQ-032 | AC-032-01..07 | `src/__tests__/summary-panel.test.ts` | — | pending |

## UI Features (New)

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-047 | AC-047-01..08 (edge click editing) | `src/__tests__/edge-popover.test.tsx` | 5 tests | passing |
| REQ-048 | AC-048-01..07 (wizard flow) | `src/__tests__/taxonomy-wizard.test.tsx` | 19 tests: dimensions, title, node types, streams, generations, edges, review, create, edit mode | passing |
| REQ-049 | AC-049-01..03 (start screen map text) | — | — | pending (requires integration test) |
| REQ-050 | AC-050-01..05 (edge types persisted) | `src/__tests__/migration.test.ts` | `dataFromGraphIR includes edge_types` | passing |
| REQ-051 | AC-051-01..03 (activity bar labels) | `src/__tests__/activity-bar.test.tsx` | `displays custom icons from node type configs` | passing |
| REQ-052 | AC-052-01..04 (graph layout) | — | — | pending (canvas rendering, manual verification) |
| REQ-053 | AC-053-01..05 (notes persistence) | `src/__tests__/migration.test.ts` | `preserves node notes through round-trip` | passing |
| REQ-054 | AC-054-01..03 (sidebar template labels) | `src/__tests__/sidebar.test.tsx` | `shows categories section` (now "Streams") | passing |
| REQ-041 | AC-041-05..06 (weight round-trip) | `src/__tests__/migration.test.ts` | `preserves edge weight through round-trip` | passing |

## Generic Model & New Features

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-046 | AC-046-01..07 (generic-only nodes) | `tests/node_parser_tests.rs` | 14 tests: generic thinker/concept parsing, fields in HashMap | passing |
| REQ-046 | AC-046-06 (generic edge types) | `tests/edge_parser_tests.rs` | `custom_edge_types_accepted` | passing |
| REQ-055 | AC-055-01..02 (extended shapes) | `src/__tests__/taxonomy-wizard.test.tsx` | shape options in wizard | pending (manual canvas verification) |
| REQ-056 | AC-056-01..02 (per-type date range) | `src/__tests__/sidebar.test.tsx` | `renders date range filter...` | passing |
| REQ-057 | AC-057-01..05 (integration test) | `tests/integration_tests.rs` | `parse_organisational_learning_example` | passing |
| REQ-058 | AC-058-01..08 (build pipeline) | — | `scripts/build-app.sh` manual verification | passing |
| REQ-059 | AC-059-01..06 (App Store sandbox) | — | entitlements + project.yml manual verification | passing |
| REQ-060 | AC-060-01..05 (zoom controls) | — | manual verification (canvas overlay) | passing |
| REQ-061 | AC-061-01..07 (organic look) | `src/__tests__/theme.test.tsx` | organic theme exists, look field on all themes | passing |
| REQ-062 | AC-062-01..08 (image export) | `src/__tests__/export-image-modal.test.tsx` | 7 tests: format, background, resolution, export handler | passing |
| REQ-063 | AC-063-01..10 (analysis engine) | `src/__tests__/graph-analysis.test.ts` | 31 tests: degree, betweenness, closeness, eigenvector, paths, communities, k-core, density, diameter | passing |
| REQ-064 | AC-064-01..07 (analysis panel) | — | manual verification (panel UI) | passing |
| REQ-065 | AC-065-01..06 (canvas integration) | — | manual verification (path highlight, community overlay, edge dimming) | passing |
| REQ-066 | AC-066-01..04 (label toggle) | — | manual verification (Aa button in zoom controls) | passing |
| REQ-067 | AC-067-01..08 (outline notes) | `src/__tests__/detail-panel-notes.test.tsx` | outline editor, indent hint, outline items | passing |
| REQ-068 | AC-068-01..04 (edge notes pane) | `src/__tests__/edge-popover.test.tsx` | popover has weight+delete only, notes in bottom pane | passing |
| REQ-069 | AC-069-01..05 (node selection highlight) | — | manual verification (strong dimming, mutual exclusivity) | passing |
| REQ-070 | AC-070-01..11 (MCP server) | — | `swift build` + stdio tests (initialize, tools/list, tools/call) | passing |

## Architecture Improvements

| Spec | Criteria | Test File | Test Name | Status |
|------|----------|-----------|-----------|--------|
| REQ-071 | AC-071-01..04 (CI/CD) | — | `.github/workflows/ci.yml` exists | passing |
| REQ-072 | AC-072-01..04 (error boundary) | `src/__tests__/error-boundary.test.tsx` | 3 tests: renders children, fallback UI, reload button | passing |
| REQ-073 | AC-073-01..04 (unified properties) | `src/__tests__/migration.test.ts` | `maps thinker node with fields as properties` | passing |
| REQ-074 | AC-074-01..04 (typed filters) | `src/__tests__/filters.test.ts` | ~20 tests: typed AttributeFilter, DateRangeFilter arrays | passing |
| REQ-075 | AC-075-01..05 (Zustand stores) | `src/__tests__/stores/useGraphStore.test.ts` | 30 tests: state, mutations, undo/redo, filters | passing |
| REQ-075 | AC-075-02 (UI store) | `src/__tests__/stores/useUIStore.test.ts` | 18 tests: modals, panels, search, zoom | passing |
| REQ-076 | AC-076-01..03 (declarative canvas) | — | manual verification (props added to GraphCanvas) | passing |
| REQ-077 | AC-077-01..05 (LLM client) | `src/__tests__/llm-client.test.ts` | 7 tests: OllamaLLMClient, createLLMClient factory | passing |
| REQ-078 | AC-078-01..06 (undo/redo) | `src/__tests__/stores/useGraphStore.test.ts` | `undo restores previous state`, `redo restores undone state`, `history capped at 50` | passing |
| REQ-079 | AC-079-01 (Rust safety) | `tests/edge_parser_tests.rs` | all edge parser tests | passing |

## Additional Passing Tests (not yet mapped to spec requirements)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/__tests__/detail-panel-notes.test.tsx` | 12 tests | Detail panel editing, notes pane, edge notes |
| `src/__tests__/detail-panel.test.tsx` | ~15 tests | Config-driven detail panel, custom fields |
| `src/__tests__/add-node-modal.test.tsx` | 7 tests | Node creation modal, field validation |
| `src/__tests__/add-edge-modal.test.tsx` | 7 tests | Edge creation modal, template edge types |
| `src/__tests__/chat-pane.test.tsx` | 4 tests | LLM chat UI, send button state |
| `src/__tests__/collapse-logic.test.ts` | 11 tests | Node collapse/expand, cascade hiding |
| `src/__tests__/filters.test.ts` | ~20 tests | Attribute filtering, date range, OR logic |
| `src/__tests__/llm-context.test.tsx` | 3 tests | LLM context provider |
| `src/__tests__/llm-prompts.test.ts` | 6 tests | Prompt construction for mapping and chat |
| `src/__tests__/llm-provider.test.ts` | ~5 tests | LLM provider configuration |
| `src/__tests__/normalize.test.ts` | 8 tests | Fenced KV normalization |
| `src/__tests__/mapping-modal.test.tsx` | ~5 tests | Content mapping modal |
| `src/__tests__/settings-modal.test.tsx` | ~5 tests | Settings modal rendering |
| `src/__tests__/help-panel.test.tsx` | 1 test | Help panel search field |
| `src/__tests__/theme.test.tsx` | 4 tests | Theme configuration |
| `src/__tests__/error-boundary.test.tsx` | 3 tests | Error boundary fallback UI, reload |
| `src/__tests__/stores/useGraphStore.test.ts` | 30 tests | Graph mutations, undo/redo, filters |
| `src/__tests__/stores/useUIStore.test.ts` | 18 tests | Modals, panels, search, zoom triggers |
| `src/__tests__/llm-client.test.ts` | 7 tests | LLM client interface, Ollama, factory |

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
