import test from 'node:test';
import assert from 'node:assert/strict';
import { clipAtlasInventory } from '../lib/atlas-inventory.ts';
import { loadLayer } from '../lib/environmental-layers.ts';
import { loadAirStations, combineAirStations } from '../lib/atmo-stations.ts';
import { insideCcpmb } from '../lib/ccpmb-territory.ts';
import { BIO_DEMO_SITES } from '../lib/bio-monitoring-demo.ts';
import { SOIL_DEMO_SITES } from '../lib/soil-demo.ts';

const passy={lat:45.923535,lng:6.713642};
const servoz={lat:45.93,lng:6.762};
test('atlas inventory is clipped without mutating the separate inventory source', () => {
  const source=Object.freeze({sites:Object.freeze([
    Object.freeze({id:'inside',coordinates:passy}),Object.freeze({id:'outside',coordinates:servoz}),
  ]),unmappedSites:Object.freeze([{id:'unmapped',coordinates:null}]),lastUpdated:'2026-09-10'});
  const clipped=clipAtlasInventory(source);
  assert.deepEqual(clipped.sites,[source.sites[0]]);
  assert.equal(source.sites.length,2);
  assert.equal(clipped.unmappedSites,source.unmappedSites);
  assert.equal(clipped.lastUpdated,source.lastUpdated);
});
test('river and drinking catalogues discard outside points before counts or detail fetches', async(t) => {
  t.mock.method(globalThis,'fetch',async(url)=>Response.json(String(url).includes('hubeau')?{data:[
    {code_station:'in',libelle_station:'Passy',latitude:passy.lat,longitude:passy.lng},
    {code_station:'out',libelle_station:'Servoz',latitude:servoz.lat,longitude:servoz.lng},
  ]}:[{code:'74208',nom:'Passy',centre:{coordinates:[passy.lng,passy.lat]}},{code:'74266',nom:'Servoz',centre:{coordinates:[servoz.lng,servoz.lat]}}]));
  const signal=new AbortController().signal;
  assert.deepEqual((await loadLayer('rivers',signal)).map(p=>p.id),['in']);
  assert.deepEqual((await loadLayer('drinking',signal)).map(p=>p.id),['74208']);
});
test('Atmo hourly readings outside the territory never enter the displayed dataset', async(t) => {
  const time=Date.parse('2026-09-09T12:00:00Z');
  t.mock.method(globalThis,'fetch',async()=>Response.json({features:[passy,servoz].map((p,i)=>({attributes:{
    code_station:i?'OUTSIDE':'INSIDE',nom_station:i?'Servoz':'Passy',x_wgs84:p.lng,y_wgs84:p.lat,date_debut:time,valeur:10,unite:'µg/m³',
  }}))}));
  const stations=await loadAirStations('no2',{west:6.45,east:7.1,south:45.7,north:46.1},new AbortController().signal);
  assert.deepEqual(stations.map(s=>s.id),['INSIDE']);
  const groups=combineAirStations({no2:{stations:[...stations,{id:'CACHED-OUTSIDE',name:'Servoz',...servoz,readings:[]}]}});
  assert.ok(groups.every(g=>insideCcpmb(g.station.lat,g.station.lng)));
});
test('all biosurveillance and soil demo locations obey the same perimeter', () => {
  for(const site of [...BIO_DEMO_SITES.lichens,...BIO_DEMO_SITES.bioacc,...SOIL_DEMO_SITES]) assert.ok(insideCcpmb(site.lat,site.lng),site.id);
});
