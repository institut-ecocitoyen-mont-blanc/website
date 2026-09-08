import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas");
    const toggle = page.getByRole("checkbox", { name: "Eaux de baignade · ARS Ministère de la Santé", exact: true });
    await toggle.check();
    await page.getByText(/^6 sites · \d+ prélèvements récupérés\.$/).waitFor();
    assert.equal(await page.locator(".bathing-station-pin").count(), 6);
    const pin = page.getByRole("button", { name: "Baignade · Lac de Passy · Îles", exact: true });
    await pin.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /PASSY ILES/);
    assert.match(await dialog.innerText(), /27\/08\/2026/);
    const current = dialog.getByRole("table", { name: "Résultats de baignade 2026 · PASSY ILES" });
    assert.match(await current.getByRole("row").nth(1).innerText(), /27\/08\/2026\s+45\s+30\s+Bon/);
    assert.match(await dialog.innerText(), /<15/);
    assert.equal(await dialog.getByRole("table").count(), 2);
    assert.equal(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth), false);
    await page.screenshot({ path: `/tmp/atlas-bathing-${width}.png` });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await pin.evaluate((el) => el === document.activeElement));
    await toggle.uncheck();
    assert.equal(await page.locator(".bathing-station-pin").count(), 0);
    for (const name of ["Thyez · Baignade municipale", "Morillon · Baignade municipale", "Samoëns · Lac des Dames"]) {
      await toggle.check();
      const addedPin = page.getByRole("button", { name: `Baignade · ${name}`, exact: true });
      await addedPin.focus(); await page.keyboard.press("Enter");
      await page.getByRole("dialog").waitFor();
      assert.equal(await page.getByRole("dialog").getByRole("table").count(), 2);
      assert.equal(await page.getByRole("dialog").getByRole("alert").count(), 0);
      await page.keyboard.press("Escape");
    }
    console.log(`PASS bathing: ${width}px, real data, six pins, two seasons, modal and keyboard`);
    await page.close();
  }
} finally { await browser.close(); }
