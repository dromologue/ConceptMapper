# Concept Mapper — What's New

Plain-English notes on what has changed in each release. Newest first.

## 1.4 — 19 September 2026

Concept Mapper moves to GitHub and changes its licence.

- **Now installed from source.** The hosted disk image is retired. Concept Mapper lives at [github.com/dromologue/ConceptMapper](https://github.com/dromologue/ConceptMapper): clone the repository and run `./scripts/build-app.sh --open`, which runs the tests, builds the app, and opens it. Because you build it on your own Mac it is signed with your own developer identity, so the "cannot verify the developer" warning the download used to raise no longer applies. Old download links redirect to the repository.
- **Relicensed to Apache 2.0, with attribution.** Concept Mapper was MIT-licensed; it is now released under the Apache License 2.0. You can still use it, change it, and build commercial products on it for free and without asking. What the licence now asks in return is credit: anyone redistributing Concept Mapper, or something built from it, carries the attribution notice with it — in a commercial product, on an About or Credits screen. The licence also adds an express patent grant, which MIT does not have. See `LICENSE` and `NOTICE` in the repository.
- **Updated internals.** Every dependency brought up to date, clearing four security advisories in the build tooling. The test suite runs about three times faster.

## 1.3.1 — 4 August 2026

A maintenance release. Nothing changes in how the app looks or works.

- **Updated internals.** The libraries Concept Mapper is built on have been brought up to date, including security fixes to components used when building the app.
- **Faster, tidier build.** Housekeeping to the build and test tooling. Your maps, templates, and settings are untouched.
- **One extra step on first launch.** This build is signed with an Apple Developer ID but has not been through Apple's notary service, so macOS will say it cannot verify the developer the first time you open it. Open System Settings ▸ Privacy & Security, find Concept Mapper under Security, and choose Open Anyway. You only need to do this once.

## 1.3 — 19 June 2026

This release moves Concept Mapper to a direct download and opens up the source.

- **Now a free, direct download.** Concept Mapper is no longer on the Mac App Store — you download it straight from the website. It's signed and notarised by Apple, so it opens cleanly with no security warnings. Updates are a simple re-download from the same page.
- **Now open source.** Concept Mapper is released under the MIT licence. You're free to read, modify, and share the code.
- **Textmap outline view.** Every map can now be read as a nested, expandable outline — the same nodes and typed relationships as the canvas, one click away. Follow a single thread of connections at a time and edit a node's notes inline.
- **Clearer grouping in the outline.** The textmap now groups a node's connections by type, so related links sit together and are easier to scan.
- **Second Brain panel.** A dedicated panel for working alongside your maps.
- **Redesigned app icons** and a number of layout fixes for a tidier canvas.

## 1.0 — 31 May 2026

- **First release.** Build, edit, and reason over concept maps where every node and edge has a type. Maps are plain-text Markdown; the schema they follow lives in a separate template you control. Includes the force-directed canvas, a Properties inspector, tag filtering, custom taxonomies, and built-in network analysis (centrality, communities, path finding).
