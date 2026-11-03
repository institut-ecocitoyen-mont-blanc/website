import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { insideCcpmb } from '../lib/ccpmb-territory.ts';
const { chromium } = createRequire(import.meta.url)('playwright');

// Published catalogues are shared with other pages and importers: the atlas itself
// must still clip every point to the ten communes. Inject one point per catalogue in
// Chamonix (outside the territory) and compare the sidebar with the real inside counts.
const OUTSIDE = { lat: 45.9237, lng: 6.8694 }, NAME = 'Hors périmètre test';
const CATALOGUES = {
  inventory: { field: 'sites', at: s => s.coordinates, add: s => ({ ...s, id: 'OUTSIDE', name: NAME, commune: 'CHAMONIX', coordinates: OUTSIDE }), text: n => new RegExp(`^${n} sites cartographiés`) },
  bathing: { field: 'points', at: p => p, add: p => ({ ...p, id: 'outside', name: NAME, commune: 'Chamonix', ...OUTSIDE }), text: n => new RegExp(`^${n} sites · \\d+ prélèvements récupérés\\.$`) },
  rivers: { field: 'points', at: p => p, add: p => ({ ...p, id: 'outside', name: NAME, ...OUTSIDE }), text: n => new RegExp(`^${n} stations · Catalogue chargé`) },
  drinking: { field: 'points', at: p => p, add: p => ({ ...p, id: '74056', name: NAME, ...OUTSIDE }), text: n => new RegExp(`^${n} communes · Catalogue chargé`) },
  groundwater: { field: 'stations', at: s => s, add: s => ({ ...s, id: 'OUTSIDE', name: NAME, commune: 'Chamonix', ...OUTSIDE }), text: n => new RegExp(`^${n} points avec analyses disponibles\\.$`) },
};
const original = async (route, path) => process.env.ATLAS_DATA_DIR ? JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, path), 'utf8')) : (await route.fetch()).json();

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [], expected = {};
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/iec-atlas-data/**', async route => {
      const path = new URL(route.request().url()).pathname.split('/iec-atlas-data/')[1];
      if (!/^(manifest\.json|data\/[a-z0-9-]+\.json)$/.test(path)) return route.abort();
      const json = await original(route, path), key = path.match(/^data\/([a-z0-9-]+)\.json$/)?.[1], catalogue = CATALOGUES[key];
      if (catalogue) {
        const items = json.data[catalogue.field];
        expected[key] = items.filter(item => insideCcpmb(catalogue.at(item).lat, catalogue.at(item).lng)).length;
        assert.ok(items.length > 0, `${key}: published catalogue is empty`);
        json.data = { ...json.data, [catalogue.field]: [...items, catalogue.add(items[0])] };
      }
      await route.fulfill({ json });
    });
    await page.goto(`${process.env.ATLAS_URL ?? 'http://localhost:3000/atlas'}?layers=${Object.keys(CATALOGUES).join(',')}`, { waitUntil: 'domcontentloaded' });
    if (width < 1024) await page.getByRole('button', { name: /^Couches/ }).click();
    const panel = width < 1024 ? page.getByRole('dialog', { name: 'Couches de l’atlas' }) : page.getByRole('complementary', { name: 'Couches de l’atlas' });
    for (const [key, catalogue] of Object.entries(CATALOGUES)) {
      await panel.getByText(catalogue.text('\\d+')).first().waitFor({ timeout: 30000 });
      assert.ok(expected[key] > 0, `${key}: no published point inside the territory`);
      await panel.getByText(catalogue.text(expected[key])).first().waitFor();
    }
    if (width < 1024) await page.getByRole('button', { name: 'Voir la carte' }).click();
    assert.equal(await page.locator(`.leaflet-marker-icon[title*="${NAME}"]`).count(), 0, 'No pin outside the ten communes');
    await page.screenshot({ path: `/tmp/atlas-territory-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: ${Object.entries(expected).map(([key, n]) => `${n} ${key}`).join(', ')} inside; injected outside points hidden`);
    await page.close();
  }
} finally { await browser.close(); }
