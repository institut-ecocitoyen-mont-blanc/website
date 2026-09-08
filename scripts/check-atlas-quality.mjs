// Isolated fixtures verify colours; these are never part of the application data.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const [level, concentration, conformity, age] of [
    ['good', 0, 'C', 3600000], ['moderate', 30, 'D', 3600000],
    ['poor', 61, 'N', 3600000], ['unknown', 0, 'C', 150 * 86400000],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    const time = Date.now() - age;
    let summaryRequests = 0;
    await page.route('**/services3.arcgis.com/**', (route) => route.fulfill({ json: { features: [{ attributes: {
      code_station: 'air', nom_station: 'Station air test', x_wgs84: 6.73, y_wgs84: 45.92,
      influence: 'Fond', date_debut: time, valeur: route.request().url().includes('/1/query') ? concentration : 0,
      unite: 'µg/m³', statut_valid: 't',
    } }] } }));
    await page.route('**/geo.api.gouv.fr/communes?**', (route) => route.fulfill({ json: [
      { code: '74001', nom: 'Commune test', centre: { coordinates: [6.62, 45.95] } },
    ] }));
    await page.route('**/hubeau.eaufrance.fr/**', (route) => {
      if (new URL(route.request().url()).searchParams.get('size') === '1') summaryRequests++;
      return route.fulfill({ json: { data: [{ code_prelevement: 'sample', date_prelevement: new Date(time).toISOString(),
        libelle_parametre: 'Paramètre test', resultat_alphanumerique: '0', libelle_unite: 'µg/L',
        conformite_limites_bact_prelevement: 'C', conformite_limites_pc_prelevement: conformity,
        conformite_references_bact_prelevement: 'C', conformite_references_pc_prelevement: 'C',
        reseaux: [{ code: 'network', nom: 'Réseau test' }], conclusion_conformite_prelevement: 'Conclusion de test',
      }] } });
    });
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas');
    await page.getByRole('checkbox', { name: 'Sources de pollution Inventaire écocitoyen', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Qualité de l’air Atmo Auvergne-Rhône-Alpes', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Eau potable · contrôle ARS Ministère de la Santé · Hub’Eau', exact: true }).check();
    const previewLevel = level === 'unknown' ? 'good' : level;
    await page.locator(`.atmo-station-pin svg[data-quality="${previewLevel}"]`).waitFor();
    await page.locator(`.drinking-station-pin svg[data-quality="${previewLevel}"]`).waitFor();
    const expectedColor = { good: '#16a34a', moderate: '#d97706', poor: '#dc2626' }[previewLevel];
    for (const kind of ['atmo', 'drinking']) {
      assert.equal(await page.locator(`.${kind}-station-pin svg > path`).getAttribute('fill'), expectedColor);
    }
    await page.getByRole('button', { name: 'Eau potable · Commune test', exact: true }).click();
    await page.getByText('Conclusion de test', { exact: true }).first().waitFor();
    await page.getByText('10 derniers résultats au maximum', { exact: true }).waitFor();
    if (level === 'unknown') assert.match(await page.getByRole('dialog').innerText(), /Dernier prélèvement ancien/);
    assert.match(await page.getByRole('dialog').innerText(), /Prélèvement sample · Réseau test/);
    assert.equal(summaryRequests, 1, 'Only one summary row is requested per commune');
    if (level === 'poor') await page.screenshot({ path: '/tmp/atlas-quality-details.png' });
    console.log(`PASS: ${level} air and drinking-water pins, sample scope and lazy details`);
    await page.close();
  }
} finally {
  await browser.close();
}
