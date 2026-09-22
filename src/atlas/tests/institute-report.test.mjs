import test from 'node:test';
import assert from 'node:assert/strict';
import { bioInstituteReport, soilInstituteReport, waterInstituteReport } from '../lib/institute-report.ts';
import { BIO_DEMO_SITES } from '../lib/bio-monitoring-demo.ts';
import { SOIL_DEMO_SITES } from '../lib/soil-demo.ts';
import { INSTITUTE_WATER_SITES } from '../lib/institute-water-demo.ts';

test('report adapters preserve every existing value, unit, location and date without inventing compliance', () => {
  const cases = [
    ...SOIL_DEMO_SITES.map(site => [site, soilInstituteReport(site)]),
    ...INSTITUTE_WATER_SITES.map(site => [site, waterInstituteReport(site)]),
    ...Object.values(BIO_DEMO_SITES).flat().map(site => [site, bioInstituteReport(site)]),
  ];
  for (const [site, report] of cases) {
    assert.equal(report.id, site.id);
    assert.equal(report.lat, site.lat); assert.equal(report.lng, site.lng);
    assert.equal(report.campaign, site.date || 'Scénario non daté');
    const readings = report.groups.flatMap(group => group.readings);
    assert.deepEqual(readings.map(r => [r.value, r.unit]), site.readings.map(r => [r.value, r.unit]));
    assert.ok(readings.every(r => r.note.includes('Aucun seuil')));
    assert.equal(report.index, site.index);
  }
});
test('soil reports keep soil matrix, dry-matter units and sampling depths explicit', () => {
  const report = soilInstituteReport(SOIL_DEMO_SITES[0]);
  assert.equal(report.medium, 'Sol');
  assert.match(report.context, /pas sur les légumes/);
  assert.match(report.context, /0–10 cm/);
  assert.deepEqual(report.groups.map(group => group.title), ['Métaux', 'Hydrocarbures', 'Pesticides']);
});
