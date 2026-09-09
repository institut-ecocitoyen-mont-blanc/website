import assert from 'node:assert/strict';
import test from 'node:test';
import {SOIL_DEMO_SITES, soilDemoBand} from '../src/lib/soil-demo.ts';

test('15 distinct fictional soil samples have valid local coordinates, dates, depths and all parameter families', () => {
  assert.equal(SOIL_DEMO_SITES.length,15);
  assert.equal(new Set(SOIL_DEMO_SITES.map(s=>s.id)).size,15);
  assert.equal(new Set(SOIL_DEMO_SITES.map(s=>s.setting)).size,3);
  assert.equal(new Set(SOIL_DEMO_SITES.map(s=>soilDemoBand(s.index).color)).size,3);
  for(const site of SOIL_DEMO_SITES) {
    assert.ok(site.lat>=45.7 && site.lat<=46.1 && site.lng>=6.45 && site.lng<=7.1);
    assert.ok(site.index>=0 && site.index<=100);
    assert.ok(Number.isFinite(Date.parse(site.date)));
    assert.ok(site.depth[0]>=0 && site.depth[1]>site.depth[0]);
    assert.deepEqual([...new Set(site.readings.map(r=>r.family))],['Métaux','Hydrocarbures','Pesticides']);
    assert.ok(site.readings.every(r=>Number.isFinite(r.value) && r.value>=0 && r.unit==='mg/kg MS'));
  }
});
test('illustrative soil colour boundaries remain stable', () => {
  assert.equal(soilDemoBand(33).label,'Faible');
  assert.equal(soilDemoBand(34).label,'Intermédiaire');
  assert.equal(soilDemoBand(66).label,'Intermédiaire');
  assert.equal(soilDemoBand(67).label,'Élevée');
});
