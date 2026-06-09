/**
 * Bridge parity drift guard (REQ-112 follow-up).
 *
 * The typed bridge has two mirror declarations that MUST enumerate the same set
 * of methods, or a JS↔Swift message silently has no handler on one side:
 *   - Swift: `enum BridgeMethod` in macos/ConceptMapper/BridgeProtocol.swift
 *   - TS:    `BridgeRequestMap` + `BridgeEventMap` keys in
 *            web/src/types/bridge-protocol.ts
 *
 * Adding a method on one side without the other is the exact drift this guards.
 * Both files are plain text here (the TS maps are interfaces — no runtime value
 * to import), so we parse them and diff the method sets. The Swift file is
 * shared verbatim into the iOS target, so this one check covers both apps.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");

const SWIFT_PROTOCOL = resolve(REPO_ROOT, "macos/ConceptMapper/BridgeProtocol.swift");
const TS_PROTOCOL = resolve(REPO_ROOT, "web/src/types/bridge-protocol.ts");

/** All `case foo` names inside `enum BridgeMethod { ... }`. */
function swiftBridgeMethods(src: string): Set<string> {
  const enumMatch = src.match(/enum\s+BridgeMethod\s*:[^{]*\{([\s\S]*?)\n\}/);
  if (!enumMatch) throw new Error("could not locate `enum BridgeMethod` in BridgeProtocol.swift");
  const methods = new Set<string>();
  for (const m of enumMatch[1].matchAll(/^\s*case\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
    methods.add(m[1]);
  }
  return methods;
}

/** Keys of a `interface <Name> { ... }` block, ignoring nested object braces. */
function tsInterfaceKeys(src: string, name: string): Set<string> {
  const start = src.indexOf(`interface ${name}`);
  if (start === -1) throw new Error(`could not locate interface ${name} in bridge-protocol.ts`);
  const open = src.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = src.slice(open + 1, end);
  const keys = new Set<string>();
  // Top-level keys only: a key sits at brace depth 1 and is followed by `:`.
  let d = 0;
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (d === 0) {
      const k = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
      if (k) keys.add(k[1]);
    }
    for (const ch of line) {
      if (ch === "{") d++;
      else if (ch === "}") d--;
    }
  }
  return keys;
}

describe("bridge protocol parity (REQ-112)", () => {
  const swiftSrc = readFileSync(SWIFT_PROTOCOL, "utf-8");
  const tsSrc = readFileSync(TS_PROTOCOL, "utf-8");

  const swift = swiftBridgeMethods(swiftSrc);
  const tsRequest = tsInterfaceKeys(tsSrc, "BridgeRequestMap");
  const tsEvent = tsInterfaceKeys(tsSrc, "BridgeEventMap");
  const ts = new Set<string>([...tsRequest, ...tsEvent]);

  it("parses a non-trivial method set from each side (sanity)", () => {
    expect(swift.size).toBeGreaterThan(10);
    expect(tsRequest.size).toBeGreaterThan(0);
    expect(tsEvent.size).toBeGreaterThan(0);
  });

  it("every Swift BridgeMethod case has a TS declaration", () => {
    const missingInTs = [...swift].filter((m) => !ts.has(m)).sort();
    expect(missingInTs, `Swift methods with no TS BridgeRequestMap/BridgeEventMap entry`).toEqual([]);
  });

  it("every TS bridge method has a Swift BridgeMethod case", () => {
    const missingInSwift = [...ts].filter((m) => !swift.has(m)).sort();
    expect(missingInSwift, `TS methods with no Swift BridgeMethod case`).toEqual([]);
  });

  it("request and event method sets are disjoint on the TS side", () => {
    const overlap = [...tsRequest].filter((m) => tsEvent.has(m)).sort();
    expect(overlap, `methods declared as both request and event`).toEqual([]);
  });
});
