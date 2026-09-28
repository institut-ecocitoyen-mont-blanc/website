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
fixture.sites.push({ id: "AIOT0003204031", name: "Installation de test", commune: "Passy", communeCode: "74208", address: "Adresse publiée", geometry: { type: "Point", coordinates: [6.692092,45.921347] }, records: [
  { id: "0003204031", kind: "installation", status: "", regime: "Non ICPE", seveso: "", inspectionService: "DREAL AURA", lastInspectionAt: "2021-06-15", updatedAt: "2026-04-26", url: "https://www.georisques.gouv.fr/risques/installations/donnees/details/0003204031" },
] });
fixture.installations = { total: 1, mapped: 1, missingCoordinates: 0, outsideTerritory: 0 };
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
    await page.getByText(/2 entrées cartographiées · 3 dossiers officiels/).waitFor();
    await page.getByRole("slider", { name: "Opacité · Géorisques", exact: true }).fill("0.5");
    await closeLayers();
    const pins = page.locator(".georisques-pin");
    const pin = pins.first();
    assert.equal(await pins.count(), 2);
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
    await pins.nth(1).press("Enter");
    await dialog.waitFor();
    const installationText = await dialog.innerText();
    assert.match(installationText, /Non ICPE/);
    assert.match(installationText, /15\/06\/2021/);
    assert.match(installationText, /26\/04\/2026/);
    assert.match(installationText, /pas une mesure de pollution/);
    assert.doesNotMatch(installationText, /Dossier de pollution des sols/);
    assert.equal(await dialog.getByRole("link", { name: "Ouvrir la fiche officielle" }).getAttribute("href"), "https://www.georisques.gouv.fr/risques/installations/donnees/details/0003204031");
    assert.equal(await dialog.locator("[data-atlas-detail-body]").evaluate((el) => el.scrollWidth > el.clientWidth), false);
    await page.screenshot({ path: `/tmp/atlas-georisques-installations-${width}.png` });
    await page.keyboard.press("Escape");
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
    console.log(`PASS ${width}px: opt-in, polygon, installation status/dates, opacity, dossiers, keyboard, unavailable state, no provider calls`);
    await page.close();
  }
} finally { await browser.close(); }
