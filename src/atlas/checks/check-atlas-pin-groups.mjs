import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data/**", async route => {
      const path = new URL(route.request().url()).pathname.replace("/iec-atlas-data/", "");
      if (!/^(manifest\.json|data\/[a-z0-9-]+\.json)$/.test(path)) return route.abort();
      const json = JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, path), "utf8"));
      if (path === "data/inventory.json") json.data.sites = json.data.sites.filter(site => ["S037", "S039"].includes(site.id));
      // A third pin at the same location tests overlap across independent layers.
      if (path === "data/groundwater.json") {
        json.data.stations = json.data.stations.slice(0, 1).map(station => ({ ...station, lat: 45.92638703721547, lng: 6.72859612947576 }));
      }
      await route.fulfill({ json });
    });
    await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas");
    const group = page.locator("[data-pin-group]");
    await group.waitFor();
    assert.equal((await group.textContent()).trim(), "2");
    const groupSize = await group.boundingBox();
    assert.equal(groupSize.width, 38);
    assert.equal(groupSize.height, 38);
    const pechiney = page.locator('.leaflet-marker-icon[aria-label^="Pechiney Bâtiment"]');
    const carbon = page.locator('.leaflet-marker-icon[aria-label^="SGL Carbon"]');
    assert.equal(await pechiney.isVisible(), false);
    await group.focus(); await page.keyboard.press("Enter");
    await pechiney.waitFor({ state: "visible" });
    assert.equal(await group.getAttribute("aria-expanded"), "true");
    await page.locator(".atlas-pin-connector").first().waitFor({ state: "attached" });
    assert.equal(await page.locator(".atlas-pin-connector").count(), 2);
    const a = await pechiney.boundingBox(), b = await carbon.boundingBox();
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 60);
    await page.screenshot({ path: `/tmp/atlas-pin-groups-${width}.png` });
    for (const [pin, name] of [[pechiney, "Pechiney Bâtiment"], [carbon, "SGL Carbon"]]) {
      await pin.focus(); await page.keyboard.press("Enter");
      await page.getByRole("dialog").getByRole("heading", { name, exact: true }).waitFor();
      await page.keyboard.press("Escape");
      assert.ok(await pin.evaluate(el => document.activeElement === el));
    }
    await page.keyboard.press("Escape");
    assert.equal(await pechiney.isVisible(), false);
    assert.equal(await page.locator(".atlas-pin-connector").count(), 0);
    await group.click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-pin-group]')?.getAttribute('aria-expanded') === 'false');
    assert.equal(await pechiney.isVisible(), false, "Zoom collapses displaced pins");
    const toggleWater = async checked => {
      if (width < 1024) await page.getByRole("button", { name: /^Couches/ }).click();
      await page.getByRole("checkbox", { name: /Eaux souterraines/ }).setChecked(checked);
      if (width < 1024) await page.getByRole("button", { name: "Voir la carte", exact: true }).click();
    };
    await toggleWater(true);
    await page.waitForFunction(() => document.querySelector('[data-pin-group]')?.textContent.trim() === '3');
    await group.click();
    await page.locator(".groundwater-pin").waitFor({ state: "visible" });
    assert.equal(await page.locator(".atlas-pin-connector").count(), 3);
    await toggleWater(false);
    await page.waitForFunction(() => document.querySelector('[data-pin-group]')?.textContent.trim() === '2');
    assert.equal(await page.locator(".atlas-pin-connector").count(), 0);
    if (width < 1024) await page.getByRole("button", { name: /^Couches/ }).click();
    for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
    if (width < 1024) await page.getByRole("button", { name: "Voir la carte", exact: true }).click();
    for (const className of ["custom-marker", "atmo-station-pin", "rivers-station-pin", "drinking-station-pin", "bathing-station-pin", "lichens-demo-pin", "bioacc-demo-pin", "soil-demo-pin", "georisques-pin", "groundwater-pin"]) {
      const pins = page.locator(`.${className}`);
      await pins.first().waitFor({ state: "attached" });
      const sizes = await pins.evaluateAll(elements => elements.map(el => ({ width: el.style.width, height: el.style.height, anchorX: el.style.marginLeft, anchorY: el.style.marginTop, svgWidth: el.querySelector("svg").getAttribute("width"), svgHeight: el.querySelector("svg").getAttribute("height") })));
      for (const size of sizes) assert.deepEqual(size, { width: "38px", height: "38px", anchorX: "-19px", anchorY: "-38px", svgWidth: "38", svgHeight: "38" }, className);
    }
    const silhouettes = await page.locator(".leaflet-marker-icon > svg > path:first-child").evaluateAll(paths => paths.map(path => path.getAttribute("d")));
    assert.equal(new Set(silhouettes).size, 1, "All layers and groups share the same visible pin silhouette");
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: badge, fan-out, distinct details, keyboard/focus, zoom collapse, cross-layer grouping/removal, all pin sizes and silhouettes`);
    await page.close();
  }
} finally { await browser.close(); }
