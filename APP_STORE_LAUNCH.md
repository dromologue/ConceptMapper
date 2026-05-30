# Mac App Store Launch Plan — Concept Mapper 1.0

Operational guide for submitting Concept Mapper to the Mac App Store. Assumes: free app, Apple Developer Program enrolment complete, no LLM features in 1.0.

## Project audit (done)

Already applied:

- Entitlements trimmed to sandbox + `files.user-selected.read-write` + `network.client` — see [ConceptMapper.entitlements](macos/ConceptMapper/ConceptMapper.entitlements). Dropped `files.downloads.read-write` (now redundant — see next item). **`network.client` must stay**: WKWebView's WebContent process on macOS Sequoia crashes during startup without it, even though the Swift app makes no outbound calls and the SPA is fully offline. When justifying it to App Store review, the answer is "required by WKWebView for embedded SPA — no actual network traffic; app is fully offline".
- PNG/PDF export now routes through `NSSavePanel` instead of writing to `~/Downloads` directly — see [FileHandler.swift:340](macos/ConceptMapper/FileHandler.swift#L340) and [WebViewBridge.swift:55](macos/ConceptMapper/WebViewBridge.swift#L55). Save dialog defaults to Downloads, so user-visible behaviour is unchanged; sandbox compliance is now via the user-selected entitlement.
- `PrivacyInfo.xcprivacy` declares the two Required-Reason API categories the code actually touches: file timestamps (for recent-maps sort) and system boot time (Swift runtime). Verified bundled in `Contents/Resources/`.

## 1 — Accept agreements and complete banking (blocking)

App Store Connect → Agreements, Tax, and Banking. The "Paid Applications" agreement is mandatory even for free apps. Sign it. Fill in tax and banking details — Apple will not let you submit without these complete, despite never paying you anything for a free app. This is the single most common reason a first submission stalls.

## 2 — Create the App Store Connect record

App Store Connect → My Apps → **+** → New App.

- Platform: macOS
- Name: "Concept Mapper" (can differ from `CFBundleDisplayName`)
- Primary language: English (U.K.)
- Bundle ID: pick `com.dromologue.ConceptMapper` from the dropdown. If absent, go to developer.apple.com → Identifiers → + → App IDs → App and register it manually first.
- SKU: any internal string (`concept-mapper-mac-1` is fine)

## 3 — Fill the App Store metadata

Submission-blocking fields:

- **App Information**: Category Productivity (already set in Info.plist as `LSApplicationCategoryType`). Privacy Policy URL is required — publish a single page on dromologue.com stating the app is fully offline, stores everything locally, and collects no data. URL existence is what's checked, not prose volume.
- **Pricing**: Free. All territories unless restricting.
- **App Privacy**: walk the wizard. Every answer is "Data Not Collected". Two minutes.
- **Version 1.0** section:
  - Description (up to 4000 chars) — one or two paragraphs of what the app does and who it's for
  - Keywords (100 chars) — five or six high-signal terms: concept mapping, knowledge graph, mind map, taxonomy, productivity
  - Support URL — dromologue.com or a GitHub link
  - Screenshots — see step 4
  - "What's New" — skip for 1.0

## 4 — Screenshots

At least one, up to ten. Required resolution is one of 2880×1800, 2560×1600, 1440×900, or 1280×800 — pick one and stick to it across all screenshots.

1. Resize the app window to a sensible aspect (16:10 works well).
2. Cmd-Shift-4, then space, click the app window — saves a window screenshot with shadow.
3. Open in Preview, crop to the exact pixel dimensions. Apple rejects images that are even one pixel off the standard sizes.

Three to five screenshots showing the canvas, the detail panel, the notes pane, an example map, and the start screen read better than one of each feature in isolation.

## 5 — Archive and upload

```bash
cd ~/code/concept-mapper
./scripts/build-app.sh --skip-tests  # refresh web/dist and copy to macos/Resources/web
open macos/ConceptMapper.xcodeproj
```

In Xcode:

1. Top bar scheme: ConceptMapper. Destination: **Any Mac**.
2. **Product → Archive**. Five-minute build.
3. Organizer opens → select the archive → **Distribute App** → **App Store Connect** → **Upload** → keep "Automatically manage signing" → **Upload**. Xcode mints the Mac App Distribution certificate and provisioning profile on demand.
4. Upload runs 2-5 min. Validation errors come back explicit; fix and re-archive.

After success, wait 15-30 min then refresh App Store Connect. The build appears under TestFlight → macOS, processing.

## 6 — TestFlight pass

Worth doing for a first submission. Sandbox edge cases only surface under App Store signing, not Debug builds.

1. App Store Connect → app → **TestFlight** → select the processed build → fill in Test Information (email, one line of notes).
2. **Internal Testing** → add yourself as a tester.
3. Install TestFlight.app on Mac, sign in with the same Apple ID, install the Concept Mapper build.
4. Round trips to test: open a .cm file, save, attach an .md note, export PNG, export PDF, open a .cmt template. Anything that fails under TestFlight will fail under store distribution.

## 7 — Submit for review

App Store Connect → app → **App Store** tab → 1.0 version → "Build" section → **+ Add Build** → select build → **Save**. Top right → **Add for Review** → answer the export compliance question (the `ITSAppUsesNonExemptEncryption=false` plist entry pre-answers it) → **Submit for Review**.

Release mode: **Manually release this version** unless you want it live the moment Apple says yes. Manual release preserves the launch moment (Substack post, announce, etc.).

## 8 — Wait

First Mac app submissions typically take 24-72 hours. App Store Connect → app shows current status.

Most likely rejection causes, declining likelihood:

- Privacy Policy URL returns 404 (always verify before submitting)
- Screenshots wrong size or showing chrome that isn't yours
- Description claims a feature the binary doesn't deliver
- App fails to handle missing receipt under sandbox — the SwiftUI `App` protocol handles this automatically, but TestFlight rules it out

## Versioning convention

For every subsequent upload, bump `CURRENT_PROJECT_VERSION` in [project.yml](macos/project.yml). Build numbers must be unique per Bundle ID — Apple rejects re-uploads with the same one. `MARKETING_VERSION` bumps follow semver and only need to change for user-visible releases.
