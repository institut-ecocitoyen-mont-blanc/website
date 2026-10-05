import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { usePublishedFixture } from "./published-fixture.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [], upstream = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (/geodair\.fr\/api-ext|services3\.arcgis\.com/.test(request.url())) upstream.push(request.url()); });
    await usePublishedFixture(page);
    await page.goto(`${process.env.ATLAS_URL || "http://localhost:3000/atlas"}?layers=atmo&pin=atmo:FR33220`);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "Autres gaz mesurés", exact: true }).waitFor();
    for (const name of ["PM₂.₅", "PM₁₀", "NO₂", "O₃", "NO", "NOₓ (équivalent NO₂)"]) {
      assert.equal(await dialog.getByRole("heading", { name, exact: true }).count(), 1);
    }
    assert.equal(await dialog.getByRole("link", { name: "Données sources · Geod’air / Atmo", exact: true }).count(), 6);
    await dialog.locator("summary").filter({ hasText: /^Moyennes annuelles/ }).click();
    await dialog.locator("summary").filter({ hasText: /^Benzo/ }).click();
    assert.ok((await dialog.innerText()).includes("ng/m³"));
    assert.ok((await dialog.innerText()).includes("qualité"));
    assert.ok((await dialog.innerText()).includes("45.92361, 6.71361"));
    assert.deepEqual(errors, []); assert.deepEqual(upstream, []);
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "detail dialog must not overflow on mobile");
    await page.screenshot({ path: `/tmp/atlas-geodair-${width}.png` });
    console.log(`PASS ${width}px: six pollutants, coordinates, validation, annual/BaP history, no credentialed upstream requests`);
    await page.close();
  }
} finally { await browser.close(); }
