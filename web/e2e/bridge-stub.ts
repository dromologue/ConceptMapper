import type { Page } from "@playwright/test";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Repo root, two levels up from web/e2e.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const mapB64 = readFileSync(path.join(repoRoot, "Maps", "tasks-and-notes.cm")).toString("base64");
const tmplB64 = readFileSync(path.join(repoRoot, "templates", "tasks-and-notes.cmt")).toString("base64");

/**
 * Install a fake Swift bridge before the SPA loads. Both native shells talk to
 * the web app through `window.webkit.messageHandlers.bridge` (JS→Swift, a JSON
 * string) and `window.__bridge_receive` (Swift→JS). This stub records every
 * outbound request on `window.__bridgeLog` and answers the handful the app
 * needs at startup, so an e2e test can drive the real file-feature wiring
 * (attach, export) in a browser and assert the exact bridge calls — the part
 * XCUITest cannot reliably reach inside the WKWebView. See REQ-124.
 */
export async function installBridgeStub(page: Page): Promise<void> {
  await page.addInitScript(
    ({ mapB64, tmplB64 }: { mapB64: string; tmplB64: string }) => {
      const w = window as unknown as Record<string, unknown>;
      w.__bridgeLog = [];
      const reply = (obj: unknown) => {
        const fn = w.__bridge_receive as ((s: string) => void) | undefined;
        if (fn) fn(JSON.stringify(obj));
      };
      w.webkit = {
        messageHandlers: {
          bridge: {
            postMessage: (raw: unknown) => {
              const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
              (w.__bridgeLog as unknown[]).push(msg);
              const { id, method } = msg as { id: string; method: string };
              setTimeout(() => {
                if (method === "listMaps") {
                  reply({ version: 1, kind: "event", method: "mapsAvailable", payload: { maps: [{ name: "tasks-and-notes", path: "/stub/tasks-and-notes.cm" }] } });
                } else if (method === "listTemplates") {
                  reply({ version: 1, kind: "event", method: "templatesAvailable", payload: { templates: [] } });
                } else if (method === "loadMap") {
                  reply({ version: 1, kind: "event", method: "mapLoaded", payload: { mapContent: mapB64, templateContent: tmplB64, filename: "tasks-and-notes.cm", filePath: "/stub/tasks-and-notes.cm" } });
                }
                // Acknowledge every request so awaited sendToSwift() promises resolve.
                reply({ version: 1, kind: "response", id, result: null });
              }, 10);
            },
          },
        },
      };
    },
    { mapB64, tmplB64 },
  );
}

/** The requests the SPA posted to the (stubbed) bridge, in order. */
export async function bridgeLog(page: Page): Promise<Array<{ method: string; payload: unknown }>> {
  return page.evaluate(() => (window as unknown as { __bridgeLog: Array<{ method: string; payload: unknown }> }).__bridgeLog);
}
