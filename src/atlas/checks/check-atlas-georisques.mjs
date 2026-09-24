import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
// Synthetic UI fixture only: never written to published provider datasets.
const fixture = { sites: [{ id: "SSPTEST", name: "Site de test", commune: "Passy", communeCode: "74208", address: "Adresse de test", geometry: { type: "MultiPolygon", coordinates: [[[[6.725,45.919],[6.727,45.919],[6.727,45.921],[6.725,45.921],[6.725,45.919]]]] }, records: [
  { id: "SSPTEST", kind: "instruction", sisId: "", status: "En cours", updatedAt: "2017-05-22", url: "https://fiches-risques.brgm.fr/georisques/infosols/instruction/SSPTEST" },
  { id: "SSPTEST01", kind: "sis", sisId: "SIS de test", status: "Secteur SIS", updatedAt: "2020-09-30", url: "https://fiches-risques.brgm.fr/georisques/infosols/classification/SSPTEST01" },
] }], fetchedAt: "2026-09-24T00:00:00Z", errors: [] };
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [], upstream = [];
    let unavailable = false;
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (r.url().includes("georisques.gouv.fr/api/")) upstream.push(r.url()); });
    await page.route("https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/iec-atlas-data/", "");
      if (!/^(manifest\.json|data\/[a-z0-9-]+\.json)$/.test(path)) return route.abort();
      if (path === "data/georisques.json") return route.fulfill({ json: { schemaVersion: 1, key: "georisques", data: fixture } });
      const body = JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, path), "utf8"));
      if (path === "manifest.json") body.datasets.georisques = unavailable
        ? { source: "Géorisques", intervalHours: 24, status: "error", lastAttemptAt: fixture.fetchedAt }
        : { path: "data/georisques.json", source: "Géorisques", intervalHours: 24, status: "ok", lastSuccessAt: fixture.fetchedAt };
      return route.fulfill({ json: body });
    });
    const openLayers = async () => { if (width < 1024) await page.getByRole("button", { name: /^Couches/ }).click(); };
    const closeLayers = async () => { if (width < 1024) await page.getByRole("button", { name: "Voir la carte", exact: true }).click(); };
    await page.goto(process.env.ATLAS_URL || "http://localhost:3000/atlas");
    await page.locator(".leaflet-container").waitFor();
    await page.getByText("Chargement des jeux de données publiés…", { exact: true }).waitFor({ state: "hidden" });
    await openLayers();
    const checkbox = page.getByRole("checkbox", { name: /^Géorisques/ });
    assert.equal(await checkbox.isChecked(), false);
    assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 1);
    await checkbox.check();
    await page.getByText("1 sites · 2 dossiers officiels regroupés.", { exact: true }).waitFor();
    await page.getByRole("slider", { name: "Opacité · Géorisques", exact: true }).fill("0.5");
    await closeLayers();
    const pin = page.locator(".georisques-pin");
    assert.equal(await pin.count(), 1);
    assert.equal(await page.locator('path[stroke="#7c3aed"]').getAttribute("stroke-opacity"), "0.5");
    await pin.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /SIS de test/);
    assert.match(await dialog.innerText(), /22\/05\/2017/);
    assert.equal(await dialog.getByRole("link", { name: "Ouvrir la fiche officielle" }).count(), 2);
    assert.equal(await dialog.locator("[data-atlas-detail-body]").evaluate((el) => el.scrollWidth > el.clientWidth), false);
    await page.screenshot({ path: `/tmp/atlas-georisques-restored-${width}.png` });
    await page.keyboard.press("Escape");
    assert.ok(await pin.evaluate((el) => document.activeElement === el));
    await openLayers(); await checkbox.uncheck(); await closeLayers();
    assert.equal(await pin.count(), 0);
    unavailable = true;
    await page.reload();
    await page.locator(".leaflet-container").waitFor();
    await page.getByText("Chargement des jeux de données publiés…", { exact: true }).waitFor({ state: "hidden" });
    await openLayers(); await checkbox.check();
    await page.getByText(/Catalogue indisponible ou en cours de chargement/).waitFor();
    assert.equal(await pin.count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(upstream, []);
    console.log(`PASS ${width}px: opt-in, polygon, opacity, dossiers, keyboard, unavailable state, no provider calls`);
    await page.close();
  }
} finally { await browser.close(); }
