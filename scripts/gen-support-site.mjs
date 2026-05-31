#!/usr/bin/env node
// Generate the public marketing + support + privacy site for Concept Mapper.
//
// Source of truth for help: web/src/help/content.ts (the same HELP_SECTIONS
// the in-app Help panel renders). Marketing screenshots come from Previews/.
// Emits a self-contained static site:
//   index.html    — marketing landing page (hero + feature sections)
//   help.html     — support hub: all help sections + client search
//   privacy.html  — privacy policy (app collects nothing)
//   images/       — web-resized copies of the Previews/*.jpg screenshots
//   styles.css    — shared styling
//
// Usage: node scripts/gen-support-site.mjs [outDir]   (default: ./support-site)
// Output is published to the public conceptmapper-support repo via GitHub Pages.

import { readFile, writeFile, mkdir, rm, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, process.argv[2] || "support-site");
const PREVIEWS = resolve(ROOT, "Previews");

const META = {
  appName: "Concept Mapper",
  version: "1.0",
  contact: "dromologue@gmail.com",
  effectiveDate: "31 May 2026",
  // Set once the app is live on the Mac App Store; until then the hero shows
  // a "coming soon" note instead of a dead button.
  appStoreUrl: "",
  minOS: "macOS 14 Sonoma",
};

// Marketing feature blocks, each tied to a real screenshot in Previews/.
const FEATURES = [
  {
    img: "preview1.jpg",
    alt: "Concept Mapper showing a force-directed map of 83 nodes across the complexity sciences",
    kicker: "The whole picture",
    title: "See an entire field at a glance",
    body: "A force-directed engine finds the structure on its own. Node colour comes from whichever classifier you choose — domain, decade, prominence — and pales with depth, so hierarchy reads at a glance without losing category. The map here holds 83 nodes and 104 typed edges and stays legible.",
  },
  {
    img: "preview2.jpg",
    alt: "A single node selected, its lineage edges highlighted, with the notes pane open below",
    kicker: "Focus",
    title: "Follow a single thread",
    body: "Select any node and the canvas concentrates on it and its neighbours, dimming the rest. Edges carry their relationship type — intellectual lineage, contribution — as labels, and the notes pane gathers the relationship context for the selected idea in one place.",
  },
  {
    img: "preview3.jpg",
    alt: "The Properties inspector showing typed attributes, tag pills, and a list of typed connections",
    kicker: "Structure",
    title: "Every node is real data, not a label",
    body: "Behind each node is a typed record: classifier dropdowns, free-text fields, and tags with autocomplete drawn from the rest of the map. The Properties panel lists every connection by type and direction, so you can read a node's place in the network without hunting across the canvas.",
  },
  {
    img: "preview4.jpg",
    alt: "The Network Analysis panel with overview metrics, node rankings, communities, and a path finder",
    kicker: "Analysis",
    title: "Graph theory, built in",
    body: "Density, average degree, diameter, modularity. Per-node degree, betweenness (bridge), eigenvector (influence), and closeness (reach). Community detection you can paint onto the canvas, and a path finder that surfaces the single weakest link between any two ideas — the structure you cannot see by looking, made measurable.",
  },
  {
    img: "preview5.jpg",
    alt: "The taxonomy wizard defining node types, shapes, fields, and the field that drives node size",
    kicker: "Your schema",
    title: "Design the taxonomy; the map follows",
    body: "Nothing is hardcoded. Define your own node types, give each a shape, icon, and field set, and choose which field drives node size. The taxonomy lives in a separate JSON template — the single source of structural truth — so one schema can describe many maps.",
  },
  {
    img: "preview6.jpg",
    alt: "The taxonomy wizard open over a region-grouped map, with the tag filter list down the side",
    kicker: "Layouts & tags",
    title: "Edit the structure over a living map",
    body: "Re-open the taxonomy at any time, even with a populated map behind it. Region layouts group nodes by classifier into labelled zones; the tag list filters the canvas to the themes you discover as you work. Switching layout is a re-projection of the same data, never a rebuild.",
  },
];

// ── Load HELP_SECTIONS from the TypeScript source ────────────────────
async function loadSections() {
  const src = await readFile(resolve(ROOT, "web/src/help/content.ts"), "utf8");
  const m = src.match(/HELP_SECTIONS:\s*HelpSection\[\]\s*=\s*/);
  if (!m) throw new Error("Could not locate HELP_SECTIONS in content.ts");
  const arrayLiteral = src.slice(m.index + m[0].length); // begins at '[' … ends '];'
  const tmp = resolve(tmpdir(), `cm-help-${process.pid}.mjs`);
  await writeFile(tmp, `export default ${arrayLiteral}`);
  const mod = await import(pathToFileURL(tmp).href);
  await rm(tmp, { force: true });
  return mod.default;
}

// ── Resize the Previews screenshots for the web (macOS `sips`) ────────
async function processImages() {
  try {
    await access(PREVIEWS);
  } catch {
    throw new Error(
      `Previews/ not found at ${PREVIEWS}. Marketing screenshots are required.`
    );
  }
  const imgDir = resolve(OUT, "images");
  await mkdir(imgDir, { recursive: true });
  for (const f of FEATURES) {
    const src = resolve(PREVIEWS, f.img);
    const dest = resolve(imgDir, f.img);
    // Max dimension 1400px, JPEG quality ~80 — keeps the page light.
    execFileSync("sips", [
      "-Z", "1400",
      "--setProperty", "formatOptions", "80",
      src, "--out", dest,
    ]);
  }
}

// ── Minimal, dependency-free Markdown → HTML ─────────────────────────
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inline formatting. Split on backtick code spans first so code contents are
// never touched by bold/italic/link/escape passes — and there are no numeric
// placeholders to collide with bare numbers in prose.
function inline(text) {
  const parts = text.split(/`([^`]+)`/); // even index = text, odd index = code
  let out = "";
  for (let k = 0; k < parts.length; k++) {
    if (k % 2 === 1) {
      out += `<code>${escapeHtml(parts[k])}</code>`;
      continue;
    }
    let seg = escapeHtml(parts[k]);
    seg = seg.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = href.replace(/"/g, "%22");
      return `<a href="${safe}">${label}</a>`;
    });
    seg = seg.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    seg = seg.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    out += seg;
  }
  return out;
}

function renderMarkdown(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br>")}</p>`);
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      flushPara();
      out.push("<hr>");
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = Math.min(6, h[1].length + 2);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${buf.map(inline).join("<br>")}</blockquote>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${buf.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${buf.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      i++;
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara();
  return out.join("\n");
}

// ── Page shell ───────────────────────────────────────────────────────
function page({ title, body, active, wide }) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' class="on"' : ""}>${label}</a>`;
  const nav = `
    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="index.html">${META.appName}</a>
        <nav>
          ${link("index.html", "Overview", "home")}
          ${link("help.html", "Help &amp; Support", "help")}
          ${link("privacy.html", "Privacy", "privacy")}
        </nav>
      </div>
    </header>`;
  const footer = `
    <footer class="site-footer">
      <div class="wrap">
        <p>${META.appName} ${META.version} · Support: <a href="mailto:${META.contact}">${META.contact}</a></p>
        <p class="muted">Documentation and privacy policy for ${META.appName}, a macOS application.</p>
      </div>
    </footer>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${META.appName} — build, edit, and reason over typed concept maps on macOS. Plain-text maps, a separate schema, and graph analysis built in.">
<link rel="stylesheet" href="styles.css">
</head>
<body>
${nav}
<main class="${wide ? "full" : "wrap"}">
${body}
</main>
${footer}
</body>
</html>`;
}

// ── Marketing landing page ───────────────────────────────────────────
function buildHome() {
  const cta = META.appStoreUrl
    ? `<a class="btn" href="${META.appStoreUrl}">Download on the Mac App Store</a>`
    : `<span class="btn btn-soft">Coming to the Mac App Store</span>`;

  const hero = `
    <section class="hero">
      <div class="wrap hero-inner">
        <h1>Think in typed graphs.</h1>
        <p class="lede">${META.appName} is a macOS tool for building, editing, and reasoning over concept maps where every node and edge has a type. Maps are plain-text Markdown; the schema they obey lives in a separate template. Your thinking stays portable, greppable, and yours.</p>
        <div class="cta-row">${cta}<span class="req">Requires ${META.minOS} or later.</span></div>
        <img class="hero-shot" src="images/${FEATURES[0].img}" alt="${FEATURES[0].alt}" loading="eager">
      </div>
    </section>`;

  const features = FEATURES.slice(1)
    .map(
      (f, idx) => `
      <section class="feature ${idx % 2 ? "rev" : ""}">
        <div class="feature-text">
          <p class="kicker">${escapeHtml(f.kicker)}</p>
          <h2>${escapeHtml(f.title)}</h2>
          <p>${escapeHtml(f.body)}</p>
        </div>
        <figure class="feature-shot">
          <img src="images/${f.img}" alt="${f.alt}" loading="lazy">
        </figure>
      </section>`
    )
    .join("\n");

  const closer = `
    <section class="closer">
      <div class="wrap">
        <h2>A concept map is a knowledge artefact, not a picture.</h2>
        <p>It should survive being grepped, version-controlled, edited in a plain text editor, and re-rendered by a tool that does not exist yet. ${META.appName} is built on that assumption.</p>
        <div class="cta-row">${cta}<a class="link" href="help.html">Read the documentation →</a></div>
      </div>
    </section>`;

  return page({
    title: `${META.appName} — Typed concept maps for macOS`,
    body: hero + `<div class="wrap features">${features}</div>` + closer,
    active: "home",
    wide: true,
  });
}

// ── Help hub ─────────────────────────────────────────────────────────
function buildHelp(sections) {
  const toc = sections
    .map((s) => `<li><a href="#${s.id}">${escapeHtml(s.title)}</a></li>`)
    .join("\n");

  const articles = sections
    .map(
      (s) => `
    <article class="section" id="${s.id}" data-tags="${escapeHtml((s.tags || []).join(" "))}" data-title="${escapeHtml(s.title.toLowerCase())}">
      <h2>${escapeHtml(s.title)} <a class="anchor" href="#${s.id}" aria-label="Link to section">#</a></h2>
      ${renderMarkdown(s.content)}
    </article>`
    )
    .join("\n");

  const body = `
    <section class="intro">
      <h1>${META.appName} — Help &amp; Support</h1>
      <p>This page mirrors the in-app help. For anything not answered here, email <a href="mailto:${META.contact}">${META.contact}</a>.</p>
      <input id="q" type="search" placeholder="Search help…" autocomplete="off" aria-label="Search help">
      <p id="noresults" class="muted" hidden>No sections match your search.</p>
    </section>
    <div class="layout">
      <nav class="toc" aria-label="Contents">
        <p class="toc-title">Contents</p>
        <ul>${toc}</ul>
      </nav>
      <div class="content">${articles}</div>
    </div>
    <script>
      (function () {
        var q = document.getElementById('q');
        var sections = Array.prototype.slice.call(document.querySelectorAll('.section'));
        var none = document.getElementById('noresults');
        q.addEventListener('input', function () {
          var term = q.value.trim().toLowerCase();
          var shown = 0;
          sections.forEach(function (el) {
            if (!term) { el.hidden = false; shown++; return; }
            var hay = el.getAttribute('data-title') + ' ' + el.getAttribute('data-tags') + ' ' + el.textContent.toLowerCase();
            var match = hay.indexOf(term) !== -1;
            el.hidden = !match;
            if (match) shown++;
          });
          none.hidden = shown !== 0;
        });
      })();
    </script>`;
  return page({ title: `${META.appName} — Help & Support`, body, active: "help" });
}

// ── Privacy policy ───────────────────────────────────────────────────
function buildPrivacy() {
  const body = `
    <article class="legal">
      <h1>Privacy Policy</h1>
      <p class="muted">Effective ${META.effectiveDate} · ${META.appName} ${META.version}</p>

      <p><strong>${META.appName} does not collect, store, transmit, or process any personal data.</strong> The application runs entirely on your Mac. There are no accounts, no sign-in, no analytics, no tracking, no advertising identifiers, and no telemetry of any kind.</p>

      <h2>Your data stays on your device</h2>
      <p>Concept maps and templates are ordinary files (<code>.cm</code> and <code>.cmt</code>) saved wherever you choose on your own Mac. ${META.appName} reads and writes only the files you explicitly open or save through the standard macOS file dialogs. It does not scan your disk, upload your files, or send their contents anywhere.</p>

      <h2>No network activity</h2>
      <p>This version of ${META.appName} operates fully offline. It makes no outbound network connections to us or to any third party. (The application bundle requests a network entitlement only because macOS requires it for the embedded web view component to start; the application performs no actual network communication.)</p>

      <h2>No third-party services</h2>
      <p>${META.appName} contains no third-party analytics, crash-reporting, advertising, or social SDKs. Nothing about your use of the app is shared with anyone, because nothing is collected in the first place.</p>

      <h2>Required-reason APIs</h2>
      <p>In line with Apple's privacy requirements, the app declares the system APIs it uses: file timestamps (to sort your recently opened maps) and the system boot time (used internally by the Swift runtime). Neither is used for tracking, fingerprinting, or any form of data collection, and neither leaves your device.</p>

      <h2>Children's privacy</h2>
      <p>${META.appName} collects no data from anyone, including children. It is suitable for all ages.</p>

      <h2>Optional AI features</h2>
      <p>This version includes no built-in artificial-intelligence or cloud features. The in-app help describes an optional manual workflow in which <em>you</em> may copy text into a third-party AI tool of your own choosing; that takes place entirely outside ${META.appName} and under that provider's own policies. Should a future version add an optional integration with an AI provider, it would use credentials you supply and send content only to the provider you select, at your explicit request — and this policy would be updated to describe it before any such feature ships.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, the updated version will be posted on this page with a new effective date.</p>

      <h2>Contact</h2>
      <p>Questions about this policy or the app: <a href="mailto:${META.contact}">${META.contact}</a>.</p>
    </article>`;
  return page({ title: `${META.appName} — Privacy Policy`, body, active: "privacy" });
}

const STYLES = `:root{
  --bg:#fbfbfd; --panel:#fff; --ink:#1d1d1f; --muted:#6e6e73;
  --accent:#0b6bcb; --border:#e3e3e8; --code-bg:#f4f4f7;
  --ink-deep:#0b1020; --maxw:1080px;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
main.full{padding:0}
main.wrap{padding-top:32px;padding-bottom:48px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.muted{color:var(--muted)}
img{max-width:100%;height:auto;display:block}

.site-header{background:var(--panel);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10}
.site-header .wrap{display:flex;align-items:center;justify-content:space-between;height:56px}
.brand{font-weight:600;color:var(--ink);font-size:17px}
.site-header nav a{margin-left:20px;color:var(--muted);font-size:15px}
.site-header nav a.on{color:var(--ink);font-weight:600}

/* Hero */
.hero{background:radial-gradient(1200px 500px at 50% -10%,#1b2a4a 0%,var(--ink-deep) 60%);color:#fff;
  padding:64px 0 0;overflow:hidden}
.hero-inner{text-align:center}
.hero h1{font-size:52px;line-height:1.05;margin:0 0 18px;letter-spacing:-.02em}
.hero .lede{max-width:64ch;margin:0 auto 26px;font-size:19px;color:#c9d2e3}
.cta-row{display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.btn{display:inline-block;background:var(--accent);color:#fff;padding:12px 22px;border-radius:980px;
  font-weight:600;font-size:16px}
.btn:hover{text-decoration:none;filter:brightness(1.08)}
.btn-soft{background:rgba(255,255,255,.12);color:#fff;cursor:default}
.req{color:#9fb0cc;font-size:14px}
.hero-shot{max-width:1000px;width:92%;margin:0 auto;border-radius:14px 14px 0 0;
  box-shadow:0 30px 80px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-bottom:none}

/* Features */
.features{padding:72px 24px 8px}
.feature{display:grid;grid-template-columns:1fr 1.15fr;gap:48px;align-items:center;margin:0 0 72px}
.feature.rev .feature-text{order:2}
.feature.rev .feature-shot{order:1}
.kicker{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0 0 8px}
.feature h2{font-size:30px;line-height:1.15;margin:0 0 14px;letter-spacing:-.01em}
.feature-text p{font-size:17px;color:#33384a;max-width:48ch}
.feature-shot{margin:0}
.feature-shot img{border-radius:12px;border:1px solid var(--border);box-shadow:0 18px 50px rgba(20,30,60,.16)}

/* Closer */
.closer{background:var(--ink-deep);color:#fff;padding:72px 0;text-align:center;margin-top:24px}
.closer h2{font-size:30px;max-width:24ch;margin:0 auto 14px;line-height:1.2}
.closer p{max-width:60ch;margin:0 auto 28px;color:#c9d2e3;font-size:18px}
.closer .link{color:#9ec3ff}

/* Help hub */
.intro h1{font-size:30px;line-height:1.2;margin:0 0 12px}
.intro p{max-width:70ch;color:#333}
#q{width:100%;max-width:480px;margin-top:18px;padding:11px 14px;font-size:15px;
  border:1px solid var(--border);border-radius:10px;background:#fff}
#q:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent}
.layout{display:grid;grid-template-columns:240px 1fr;gap:40px;margin-top:32px}
.toc{position:sticky;top:80px;align-self:start;max-height:calc(100vh - 100px);overflow:auto}
.toc-title{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.toc ul{list-style:none;margin:0;padding:0}
.toc li{margin:0 0 2px}
.toc a{display:block;padding:5px 10px;border-radius:7px;color:#333;font-size:14px}
.toc a:hover{background:#eef1f5;text-decoration:none}
.section{background:var(--panel);border:1px solid var(--border);border-radius:14px;
  padding:24px 28px;margin:0 0 20px;scroll-margin-top:72px}
.section h2{font-size:21px;margin:0 0 14px;display:flex;align-items:baseline;gap:8px}
.section .anchor{color:var(--border);font-weight:400;font-size:16px;opacity:0;transition:opacity .15s}
.section:hover .anchor{opacity:1}
.section h3{font-size:16px;margin:20px 0 8px}
.section h4{font-size:15px;margin:16px 0 6px;color:#333}
.section p{margin:10px 0}
.section ul,.section ol{margin:10px 0;padding-left:22px}
.section li{margin:4px 0}
.section blockquote{margin:12px 0;padding:8px 16px;border-left:3px solid var(--accent);
  background:#f5f8fc;color:#333;border-radius:0 8px 8px 0}
.section hr{border:0;border-top:1px solid var(--border);margin:20px 0}
code{background:var(--code-bg);padding:2px 6px;border-radius:6px;
  font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
pre{background:var(--code-bg);border:1px solid var(--border);border-radius:10px;
  padding:14px 16px;overflow:auto;margin:12px 0}
pre code{background:none;padding:0;font-size:13px}

/* Privacy */
.legal{background:var(--panel);border:1px solid var(--border);border-radius:14px;
  padding:28px 32px;max-width:78ch}
.legal h1{font-size:28px;margin:0 0 4px}
.legal h2{font-size:18px;margin:26px 0 8px}
.legal p{margin:10px 0;color:#333}

.site-footer{border-top:1px solid var(--border);background:var(--panel);margin-top:24px}
.site-footer .wrap{padding-top:20px;padding-bottom:28px}
.site-footer p{margin:4px 0;font-size:14px;color:var(--muted)}

@media (max-width:820px){
  .hero h1{font-size:38px}
  .feature{grid-template-columns:1fr;gap:22px;margin-bottom:52px}
  .feature.rev .feature-text{order:1}
  .feature.rev .feature-shot{order:2}
  .layout{grid-template-columns:1fr}
  .toc{position:static;max-height:none;margin-bottom:8px}
}`;

async function main() {
  const sections = await loadSections();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await processImages();
  await writeFile(resolve(OUT, "styles.css"), STYLES);
  await writeFile(resolve(OUT, "index.html"), buildHome());
  await writeFile(resolve(OUT, "help.html"), buildHelp(sections));
  await writeFile(resolve(OUT, "privacy.html"), buildPrivacy());
  await writeFile(resolve(OUT, ".nojekyll"), "");
  console.log(`Generated marketing + ${sections.length} help sections → ${OUT}`);
  console.log("  index.html  help.html  privacy.html  styles.css  images/  .nojekyll");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
