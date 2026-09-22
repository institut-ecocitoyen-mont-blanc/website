import assert from 'node:assert/strict';
import test from 'node:test';
import {BIO_DEMO_SITES, bioDemoBand} from '../lib/bio-monitoring-demo.ts';
test('prototype demo displays five lichen sites and six bioacc sites including UVE, with bounded fake values', () => {
  assert.equal(BIO_DEMO_SITES.lichens.length,5);
  assert.equal(BIO_DEMO_SITES.bioacc.length,6);
  const sites=Object.values(BIO_DEMO_SITES).flat();
  assert.equal(new Set(sites.map(s=>s.id)).size,11);
  for(const site of sites) {
    assert.ok(site.lat>=45.7 && site.lat<=46.1 && site.lng>=6.45 && site.lng<=7.1);
    assert.ok(site.index>=0 && site.index<=100);
    assert.equal(site.readings.length,2);
    assert.ok(site.readings.every(r=>r.label.includes('simulation') && Number.isFinite(r.value)));
  }
  for(const sites of Object.values(BIO_DEMO_SITES)) {
    assert.equal(new Set(sites.map(s=>bioDemoBand(s.index).color)).size,3);
    assert.equal(new Set(sites.map(s=>s.commune)).size,5);
  }
});
test('the extra bioacc example is near the supplied UVE location, not a claimed facility measurement', () => {
  const site = BIO_DEMO_SITES.bioacc.find(site => site.id === 'bioacc-4');
  assert.match(site.name, /UVE de Passy · proximité/);
  assert.equal(site.commune, 'Passy');
  assert.ok(Math.abs(site.lat - 45.922035111483865) < 0.002);
  assert.ok(Math.abs(site.lng - 6.726736828628408) < 0.002);
  assert.equal(site.index, 39);
  assert.ok(site.readings.every(reading => reading.unit === 'u. fictives'));
});
