Run the full build pipeline for concept-mapper:

1. Run `cargo test --all` — fail fast if Rust tests break
2. Run `cd web && npm test` — fail fast if frontend tests break
3. Run `cd web && npm run build` — build the React SPA
4. Run `rm -rf macos/Resources/web/assets && cp -R web/dist/* macos/Resources/web/` — copy web assets
5. Run `cd macos && xcodebuild -project ConceptLLM.xcodeproj -scheme ConceptLLM -configuration Debug build` — build macOS app
6. Run `open` on the built .app in DerivedData

Report any failures clearly. Do not skip the copy step.
