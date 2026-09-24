import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(process.env.INVENTORY_URL || "http://localhost:3000/carte");
    await page.locator("[data-pin-group]").first().waitFor();
    const map = page.locator(".leaflet-container");
    await map.scrollIntoViewIfNeeded();
    const pechiney = page.locator('.leaflet-marker-icon[aria-label^="Pechiney Bâtiment"]');
    const carbon = page.locator('.leaflet-marker-icon[aria-label^="SGL Carbon"]');
    // Find their group among the full live inventory rather than assuming a count.
    for (const group of await page.locator("[data-pin-group]").all()) {
      await group.focus();
      await page.keyboard.press("Enter");
      if (await pechiney.isVisible()) break;
    }
    await pechiney.waitFor({ state: "visible" });
    await carbon.waitFor({ state: "visible" });
    const a = await pechiney.boundingBox(), b = await carbon.boundingBox();
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 40);
    for (const [pin, name] of [[pechiney, "Pechiney Bâtiment"], [carbon, "SGL Carbon"]]) {
      await pin.click();
      const popup = page.locator(".leaflet-popup").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await popup.waitFor();
      await popup.getByRole("button", { name: "Voir les détails" }).click();
      await page.getByRole("dialog").getByRole("heading", { name, exact: true }).waitFor();
      await page.getByRole("button", { name: "Fermer la fiche", exact: true }).click();
      await popup.locator(".leaflet-popup-close-button").click();
      await popup.waitFor({ state: "detached" });
    }
    await page.screenshot({ path: `/tmp/inventory-pin-groups-${width}.png` });
    await page.getByRole("searchbox").fill("Pechiney Bâtiment");
    await page.waitForFunction(() => document.querySelectorAll('[data-pin-group]').length === 0);
    await pechiney.waitFor({ state: "visible" });
    assert.equal(await carbon.count(), 0, "Filtered-out sites leave the group");
    assert.equal(await page.locator(".atlas-pin-connector").count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS inventory ${width}px: overlap fan-out, both popups/details and filtering`);
    await page.close();
  }
} finally { await browser.close(); }
