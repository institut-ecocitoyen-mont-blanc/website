import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], upstream = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/hubeau\.eaufrance|services3\.arcgis|baignades\.sante|geo\.api\.gouv|geo-ide|georisques\.gouv/.test(request.url())) upstream.push(request.url());
  });
  // Optional local snapshots allow browser QA before public publication is approved.
  if (process.env.ATLAS_DATA_DIR) await page.route("https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/iec-atlas-data/", "");
    if (!/^(manifest\.json|data\/[a-z0-9-]+\.json)$/.test(path)) return route.abort();
    try {
      const data = JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, path), "utf8"));
      // Test-only stale readings exercise the actual marker rendering path.
      if (process.env.ATLAS_TEST_STALE_AIR && path.startsWith("data/air-")) for (const station of data.data) for (const reading of station.readings) reading.time = Date.UTC(2020, 0, 1);
      await route.fulfill({ json: data, headers: { "access-control-allow-origin": "*" } });
    }
    catch { await route.fulfill({ status: 404 }); }
  });
  await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas", { timeout: 60000 });
  await page.locator(".leaflet-container").waitFor();
  await page.getByText("Chargement des jeux de données publiés…", { exact: true }).waitFor({ state: "hidden" });
  await page.getByText(/sites cartographiés/).waitFor();
  const sidebar = page.getByRole("complementary", { name: "Couches de l’atlas" });
  for (const label of [/Particules et gaz/, /Qualité des cours d’eau/, /Eau potable · contrôle ARS/, /Eaux de baignade · ARS/, /Qualité des eaux souterraines/, /^Géorisques/]) {
    await sidebar.getByRole("checkbox", { name: label }).check();
  }
  await page.locator('.atmo-station-pin').first().waitFor();
  await page.locator('.rivers-station-pin').first().waitFor();
  await page.locator('.drinking-station-pin').first().waitFor();
  await page.locator('.groundwater-pin').first().waitFor();
  await page.locator('.georisques-pin').first().waitFor();
  if (process.env.ATLAS_TEST_STALE_AIR) {
    await sidebar.getByText('Bleu si le créneau', { exact: false }).waitFor();
    const qualities = await page.locator('.atmo-station-pin svg').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-quality')));
    assert.ok(qualities.length > 0 && qualities.every(q => q === 'unknown'), 'Stale air pins must not use illustrative quality colours');
  }
  await page.locator('.groundwater-pin').first().press("Enter");
  await page.getByRole("dialog").waitFor();
  await page.getByText(/résultats récupérés|résultats affichés|analyses affichées|derniers résultats/).first().waitFor();
  assert.deepEqual(upstream, [], "All data reads must use published snapshots, not providers");
  assert.deepEqual(errors, []);
  console.log("PASS published catalogue, all API layer markers and groundwater detail; zero direct provider calls");
} finally { await browser.close(); }
