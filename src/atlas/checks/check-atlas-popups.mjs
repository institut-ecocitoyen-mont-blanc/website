// Kept under its original command name; atlas details now use a native modal,
// not Leaflet popups. Fixtures are isolated from application/provider data.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');

async function assertOverlayFits(page, label) {
  await page.waitForTimeout(350); // Settle Leaflet focus panning and browser scrolling before geometry/capture.
  const geometry = await page.getByRole('dialog').evaluate((el) => {
    const r = el.getBoundingClientRect(), body = el.querySelector('[data-atlas-detail-body]');
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width,
      viewport: { width: innerWidth, height: innerHeight },
      clientWidth: body.clientWidth, scrollWidth: body.scrollWidth,
      footerBottom: el.querySelector('footer').getBoundingClientRect().bottom,
      headerColor: getComputedStyle(el.querySelector('header')).backgroundColor,
      modal: el.matches(':modal'), locked: document.body.style.overflow === 'hidden' };
  });
  assert.ok(geometry.modal && geometry.locked, label + ': native modal and scroll lock');
  assert.equal(geometry.headerColor, 'rgb(29, 106, 178)', label + ': site brand blue');
  assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.viewport.height + 1, label + ': fits vertically');
  assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport.width + 1, label + ': fits horizontally');
  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, label + ': no horizontal content overflow');
  assert.ok(geometry.footerBottom <= geometry.viewport.height + 1, label + ': close/return controls fit');
  assert.equal(await page.locator('.leaflet-popup').count(), 0);
  console.log('PASS:', label, JSON.stringify(geometry));
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 1000 } });
    await page.route('**/hubeau.eaufrance.fr/**', async (route) => {
      if (route.request().url().includes('/station_pc?')) {
        return route.fulfill({ json: { data: [{ code_station: 'test-station', libelle_station: 'L’Arve à Sallanches', latitude: 45.92, longitude: 6.73 }], next: null } });
      }
      await page.getByText('Chargement des analyses…', { exact: true }).waitFor();
      await route.fulfill({ json: { data: Array.from({ length: 10 }, (_, index) => ({
        libelle_parametre: ['Azote Kjeldahl', 'Nitrates', 'Phosphore total', 'Cadmium'][index % 4],
        date_prelevement: '2026-02-01', resultat: 0.005, symbole_unite: 'µg/L',
        mnemo_remarque: 'Résultat inférieur au seuil de quantification',
      })) } });
    });
    await page.route('**/services3.arcgis.com/**', (route) => route.fulfill({ json: {
      features: Array.from({ length: 20 }, (_, index) => ({ attributes: {
        code_station: 'test-air', nom_station: 'Passy', x_wgs84: 6.73, y_wgs84: 45.92,
        influence: 'Fond', typologie: 'Urbaine', date_debut: Date.UTC(2026, 1, 1, index),
        valeur: index, unite: 'µg/m³', statut_valid: 't',
      } })),
    } }));
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas');
    // Existing inventory markers also open full atlas details without navigation.
    const inventoryPin = page.locator('.leaflet-marker-icon[title]').first();
    await inventoryPin.focus();
    await inventoryPin.press('Enter');
    await page.getByRole('dialog').getByRole('link', { name: 'Ouvrir la fiche de l’inventaire', exact: true }).waitFor();
    await assertOverlayFits(page, 'inventory');
    await page.getByRole('button', { name: 'Fermer la fiche', exact: true }).click();

    await page.getByRole('checkbox', { name: 'Sources de pollution Inventaire écocitoyen', exact: true }).uncheck();
    if (mobile) await page.getByRole('checkbox', { name: 'Chauffage au bois Démonstration · données fictives', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Qualité des cours d’eau Agence de l’eau · Hub’Eau · Naïades', exact: true }).check();
    const riverPin = page.getByRole('button', { name: 'Cours d’eau · L’Arve à Sallanches', exact: true });
    await riverPin.focus();
    await riverPin.press('Enter');
    assert.equal(await page.locator('.rivers-station-pin svg > path').getAttribute('fill'), 'white', 'Unmatched station must remain outlined');
    await page.getByText('10 derniers résultats au maximum', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').locator('details').count(), 4, 'Repeated parameters grouped without losing results');
    await page.getByRole('dialog').locator('summary').first().click();
    assert.equal(await page.getByRole('dialog').locator('details[open] li').count(), 3);
    await assertOverlayFits(page, mobile ? 'mobile water + heatmap' : 'desktop async water');
    await page.screenshot({ path: mobile ? '/tmp/atlas-water-overlay-mobile.png' : '/tmp/atlas-water-overlay-desktop.png' });
    await page.setViewportSize({ width: mobile ? 360 : 950, height: 650 });
    await assertOverlayFits(page, 'viewport resize');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.ok(await riverPin.evaluate((el) => el === document.activeElement), 'Focus returned to triggering pin');

    await page.getByRole('checkbox', { name: 'Particules et gaz Atmo Auvergne-Rhône-Alpes', exact: true }).check();
    const airPin = page.getByRole('button', { name: 'Station Atmo · Passy', exact: true });
    await airPin.click();
    await page.waitForFunction(() => document.querySelectorAll('dialog svg[role="img"]').length === 4);
    for (const pollutant of ['PM₂.₅', 'PM₁₀', 'NO₂', 'O₃']) {
      assert.equal(await page.getByRole('dialog').getByRole('heading', { name: pollutant, exact: true }).count(), 1);
    }
    assert.equal(await page.getByRole('dialog').getByRole('radio').count(), 0);
    await assertOverlayFits(page, 'all Atmo pollutants');
    // Native modal keeps keyboard focus out of the underlying page.
    await page.getByRole('button', { name: 'Revenir à la carte', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), 'Focus remains inside modal');
    await page.getByRole('dialog').locator('summary').first().click();
    await assertOverlayFits(page, 'expanded history');
    const body = page.locator('[data-atlas-detail-body]');
    assert.ok(await body.evaluate((el) => el.scrollHeight > el.clientHeight), 'Long details scroll in the overlay');
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1400, height: 1000 });
    await page.getByRole('dialog').locator('summary').first().click();
    await body.evaluate((el) => { el.scrollTop = 0; });
    await page.screenshot({ path: mobile ? '/tmp/atlas-air-overlay-mobile.png' : '/tmp/atlas-air-overlay-desktop.png' });
    if (mobile) {
      await page.getByRole('button', { name: 'Revenir à la carte', exact: true }).click();
    } else {
      await page.mouse.click(5, 5); // Actual backdrop, outside the overlay.
    }
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.close();
  }
  console.log('PASS: inventory, asynchronous water, all pollutants, resizing, keyboard, backdrop, focus restoration and mobile overlay');
} finally {
  await browser.close();
}
