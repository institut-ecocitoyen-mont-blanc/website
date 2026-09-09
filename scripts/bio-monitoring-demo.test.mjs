import assert from 'node:assert/strict';
import test from 'node:test';
import {BIO_DEMO_SITES, bioDemoBand} from '../src/lib/bio-monitoring-demo.ts';
test('prototype demo retains 13 lichen and 10 deposition sites with distinct IDs and bounded fake values', () => {
  assert.equal(BIO_DEMO_SITES.lichens.length,13);
  assert.equal(BIO_DEMO_SITES.bioacc.length,10);
  const sites=Object.values(BIO_DEMO_SITES).flat();
  assert.equal(new Set(sites.map(s=>s.id)).size,23);
  for(const site of sites) {
    assert.ok(site.lat>=45.7 && site.lat<=46.1 && site.lng>=6.45 && site.lng<=7.1);
    assert.ok(site.index>=0 && site.index<=100);
    assert.equal(site.readings.length,2);
    assert.ok(site.readings.every(r=>r.label.includes('simulation') && Number.isFinite(r.value)));
  }
  for(const sites of Object.values(BIO_DEMO_SITES)) assert.equal(new Set(sites.map(s=>bioDemoBand(s.index).color)).size,3);
});
