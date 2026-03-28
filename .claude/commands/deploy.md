Build a release version of the macOS app:

1. Run `cargo test --all` and `cd web && npm test` — verify everything passes
2. Run `./scripts/build-app.sh` — full pipeline including WASM, web, MCP server, and macOS app
3. If `--archive` flag was passed, note that it will create an exportable archive
4. Report the location of the built app
