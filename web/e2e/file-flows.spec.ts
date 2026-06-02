import { test, expect } from "@playwright/test";
import { installBridgeStub, bridgeLog } from "./bridge-stub";

// End-to-end coverage for the iOS/macOS file features that are *triggered from
// the web UI* — attach a markdown note, and export an image. XCUITest can drive
// the native document picker / share sheet presentation (see the iOS Open File
// test) but cannot reliably tap web content inside the WKWebView, so the web
// side of these flows is verified here against the production build, with a fake
// bridge that records the exact JS→Swift requests. REQ-124.

const NODE = "Write alert runbooks";

async function openMapOnPhone(page: import("@playwright/test").Page) {
  await installBridgeStub(page);
  await page.goto("/");
  await expect(page.locator(".empty-state-title")).toHaveText("Concept Mapper");
  // The stubbed listMaps response populates the Maps column.
  await page.getByRole("button", { name: "tasks-and-notes" }).click();
  // Phone layout: the bottom tab bar is the primary navigation.
  await expect(page.locator(".phone-tab-bar")).toBeVisible();
}

test.describe("iOS file features (web side)", () => {
  test("attach .md: select node → Notes tab → Attach posts attachNotesFile", async ({ page }) => {
    await openMapOnPhone(page);

    // Select a node in the outline (Map tab, textmap is the phone default).
    await page.locator("button.textmap-name", { hasText: NODE }).first().click();
    // Its Notes surface is its own tab on phone.
    await page.locator(".phone-tab-btn", { hasText: "Notes" }).click();

    const attach = page.getByRole("button", { name: /Attach \.md/ });
    await expect(attach).toBeVisible();
    await attach.click();

    const log = await bridgeLog(page);
    const req = log.find((m) => m.method === "attachNotesFile");
    expect(req, "attachNotesFile was not posted to the bridge").toBeTruthy();
    expect((req!.payload as { nodeId?: string }).nodeId).toBeTruthy();
  });

  test("export image: PNG and PDF post saveToDownloads", async ({ page }) => {
    await openMapOnPhone(page);

    // Export reads the graph <canvas>, which only exists in a network view.
    await page.locator('[title="Full Network"]').click();
    await page.waitForSelector("canvas", { timeout: 15000 });
    await page.waitForTimeout(800); // let the simulation paint a frame

    for (const fmt of ["PNG", "PDF"]) {
      await page.locator('[title="Export Image"]').click();
      await page.getByRole("button", { name: fmt, exact: true }).click();
      await page.getByRole("button", { name: "Export", exact: true }).click();
      await page.waitForTimeout(200);
    }

    const log = await bridgeLog(page);
    const files = log
      .filter((m) => m.method === "saveToDownloads")
      .map((m) => (m.payload as { filename: string }).filename);
    expect(files.some((f) => f.endsWith(".png")), "no PNG export reached the bridge").toBeTruthy();
    expect(files.some((f) => f.endsWith(".pdf")), "no PDF export reached the bridge").toBeTruthy();
  });
});
