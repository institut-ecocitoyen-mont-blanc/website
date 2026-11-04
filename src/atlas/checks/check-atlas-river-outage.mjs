import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');

// Published-data outages: the river catalogue fails, recovers, then fails again on
// refresh (last catalogue kept); other datasets failing never read as empty data.
const atlas = process.env.ATLAS_URL || 'http://localhost:3000/atlas';
const station = { id: '06000001', name: 'ARVE A SALLANCHES', lat: 45.940332337, lng: 6.642029698, properties: { code_station: '06000001', libelle_station: 'ARVE A SALLANCHES' } };
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let outage = true;
  await page.route('**/iec-atlas-data/data/rivers.json*', route => outage ? route.fulfill({ status: 500, body: 'Unavailable' })
    : route.fulfill({ json: { schemaVersion: 1, key: 'rivers', data: { points: [station], fetchedAt: '2026-11-01T06:00:00Z' } } }));
  await page.route(`**/iec-atlas-data/data/river-${station.id}.json*`, route => route.fulfill({ status: 500, body: 'Unavailable' }));
  await page.goto(`${atlas}?layers=rivers`);
  const toggle = page.getByRole('checkbox', { name: 'Cours d’eau', exact: true });
  await page.getByRole('alert').filter({ hasText: 'Les données publiées sont temporairement indisponibles.' }).waitFor();
  assert.equal(await page.locator('.rivers-station-pin').count(), 0, 'No station is invented during an initial outage');
  outage = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await page.getByText(/^1 stations · Catalogue chargé le/).waitFor();
  assert.equal(await page.locator('.rivers-station-pin').count(), 1);
  await page.getByRole('button', { name: `Cours d’eau · ${station.name}`, exact: true }).click();
  await page.getByRole('dialog').getByText(/Les analyses sont temporairement indisponibles/).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.ok(!new URL(page.url()).searchParams.has('pin'), 'Closing the fiche removes it from the URL');
  outage = true;
  await toggle.uncheck();
  assert.equal(await page.locator('.rivers-station-pin').count(), 0);
  await toggle.check();
  await page.getByText('Le catalogue publié est temporairement indisponible. Le dernier catalogue chargé reste affiché ; les analyses détaillées peuvent être indisponibles.', { exact: true }).waitFor();
  await page.getByText(/^1 repères conservés · catalogue enregistré le/).waitFor();
  assert.equal(await page.locator('.rivers-station-pin').count(), 1, 'A failed refresh keeps the last loaded catalogue');
  await page.screenshot({ path: '/tmp/atlas-river-outage.png' });
  await page.close();

  // Failed datasets with no earlier success: explicit messages, never zero counts.
  const failed = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  failed.on('pageerror', e => errors.push(e.message));
  await failed.route(/\/iec-atlas-data\/data\/(inventory|bathing|traffic|groundwater|river-assessments)\.json/, route => route.fulfill({ status: 500, body: 'Unavailable' }));
  await failed.goto(`${atlas}?layers=inventory,bathing,traffic,groundwater,rivers`);
  for (const text of ['Inventaire indisponible. Les autres couches restent accessibles.', 'Sites de baignade indisponibles. Les autres couches restent accessibles.', 'Comptages routiers indisponibles. Les autres couches restent accessibles.', 'Catalogue des eaux souterraines indisponible. Les autres couches restent accessibles.', 'Évaluations officielles indisponibles : les stations sont affichées sans classe.']) {
    await failed.getByRole('alert').filter({ hasText: text }).first().waitFor({ timeout: 30000 });
  }
  for (const zero of [/^0 sites · /, /^0 tronçons/, /^0 points avec analyses/]) assert.equal(await failed.getByText(zero).count(), 0, `No empty count for an unavailable dataset: ${zero}`);
  await failed.getByText(/stations · Catalogue chargé/).waitFor();
  await failed.screenshot({ path: '/tmp/atlas-dataset-outage.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: initial river outage, retry recovery, failed analyses, retained catalogue on refresh failure, explicit messages for unavailable datasets');
} finally { await browser.close(); }
