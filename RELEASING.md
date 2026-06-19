# Releasing — Developer ID DMG → direct download

Concept Mapper (macOS) is distributed as a **free, notarised Developer ID DMG**
downloaded from [conceptmapper.dromologue.com](https://conceptmapper.dromologue.com).
The DMG is hosted on **fly.io**. The app is **no longer on the Mac App Store**, and
there is no iOS product. Updates are **manual re-download** — there is no in-app
update check, so the app makes no network connections.

> Maintainer note: the fly.io hosting (`fly/`) and `scripts/deploy-downloads.sh`
> are **gitignored** — they live only on the release machine, since the public
> repo only needs what's required to build and run the app. The build/sign/notarise
> step (`scripts/release-macos.sh`) is tracked, so anyone can produce their own
> notarised build.

> Legacy: the old App Store path used Xcode Cloud on `master`. That workflow is
> retired — disable it in App Store Connect so pushes stop uploading builds. The
> `ci_scripts/ci_pre_xcodebuild.sh` build-number stamper is no longer used.

## One-time setup

1. **Developer ID Application certificate** (team `4EDT4L4DYU`). In Xcode ▸
   Settings ▸ Accounts ▸ *Manage Certificates* ▸ **+** ▸ *Developer ID Application*.
   Confirm with `security find-identity -v -p codesigning` (look for
   "Developer ID Application").
2. **Notarisation credentials.** In App Store Connect ▸ Users and Access ▸
   *Integrations / Keys*, create an API key with *Developer* access; download the
   `.p8` and note the Key ID and Issuer ID. Then once:

   ```bash
   xcrun notarytool store-credentials "ConceptMapper-Notary" \
     --key AuthKey_XXXX.p8 --key-id KEYID --issuer ISSUER-UUID
   ```

   The release script references the `ConceptMapper-Notary` keychain profile
   (override with `NOTARY_PROFILE=...`).
3. **fly.io app.** `scripts/deploy-downloads.sh` creates `conceptmapper-downloads`
   on first run (`flyctl apps create`). You must be logged in (`flyctl auth whoami`).

## Cut a release

```bash
# 1. Build, sign (Developer ID), DMG, notarise, staple, verify Gatekeeper.
scripts/release-macos.sh
#    → macos/build/ConceptMapper-<version>.dmg  (notarised + stapled)
#    Use --skip-notarize for a local signing smoke test (not shippable).

# 2. Publish the DMG + version.json to fly.io.
scripts/deploy-downloads.sh
#    → https://conceptmapper-downloads.fly.dev/ConceptMapper.dmg

# 3. Regenerate the support/marketing site and publish to both targets.
node scripts/gen-support-site.mjs
netlify deploy --dir support-site \
  --site bce0dc7d-c74f-4796-a046-4840da2bc7c5 --prod
#    then push support-site/ to the public dromologue/conceptmapper-support repo
#    (GitHub Pages) per the support-site publishing notes.
```

Verify a clean Gatekeeper pass before announcing:

```bash
# Simulate a freshly downloaded copy (quarantine flag set by the browser).
cp macos/build/ConceptMapper-<version>.dmg /tmp/ && \
  xattr -w com.apple.quarantine "0001;0;Safari;" /tmp/ConceptMapper-<version>.dmg
open /tmp/ConceptMapper-<version>.dmg   # mounts; drag to Applications; launches with no block
```

## Versioning

We own the version train now — no App Store constraint. To cut a new version,
edit `CFBundleShortVersionString` in
[`macos/ConceptMapper/Info.plist`](macos/ConceptMapper/Info.plist) and keep
`MARKETING_VERSION` in [`macos/project.yml`](macos/project.yml) in sync, then run
`scripts/release-macos.sh` (it regenerates the project via `xcodegen`). The DMG
filename and `version.json` are stamped from `CFBundleShortVersionString`.
`CFBundleVersion` is a simple monotonic build number you bump as you like.
