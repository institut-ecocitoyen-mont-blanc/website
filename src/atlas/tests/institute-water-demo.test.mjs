import assert from 'node:assert/strict';
import test from 'node:test';
import { INSTITUTE_WATER_LAYERS, INSTITUTE_WATER_SITES } from '../lib/institute-water-demo.ts';
import { insideCcpmb } from '../lib/ccpmb-territory.ts';

test('both Institut demo water layers have distinct local samples and three illustrative colours', () => {
  assert.equal(new Set(INSTITUTE_WATER_SITES.map(site => site.id)).size, 8);
  for (const layer of INSTITUTE_WATER_LAYERS) {
    const sites = INSTITUTE_WATER_SITES.filter(site => site.kind === layer.id);
    assert.equal(sites.length, layer.id === 'bathing' ? 3 : 5);
    assert.deepEqual(new Set(sites.map(site => site.level)), new Set(['good', 'moderate', 'poor']));
    for (const site of sites) {
      assert.ok(insideCcpmb(site.lat, site.lng));
      assert.ok(Number.isFinite(Date.parse(site.date)));
      assert.equal(site.readings.length, 4);
      assert.ok(site.readings.every(reading => Number.isFinite(reading.value) && reading.value >= 0));
    }
  }
});
