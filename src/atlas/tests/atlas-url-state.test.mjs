import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_URL_LAYERS, parseAtlasUrlState, writeAtlasUrlState, withAtlasLayer, withAtlasPin } from '../lib/atlas-url-state.ts';

test('absent layers keep the inventory default, explicitly empty layers keep everything off', () => {
  assert.deepEqual(parseAtlasUrlState(''), { layers:['inventory'], pin:null });
  assert.deepEqual(parseAtlasUrlState('?layers='), { layers:[], pin:null });
  assert.deepEqual(parseAtlasUrlState('?layers=wood,bogus,inventory,inventory,georisques'), { layers:['inventory','georisques'], pin:null });
});
test('all production layers round trip, with no illustrative layers', () => {
  const state={layers:[...ATLAS_URL_LAYERS],pin:null};
  assert.deepEqual(parseAtlasUrlState(writeAtlasUrlState('',state)),state);
  assert.equal(ATLAS_URL_LAYERS.length,14);
});
test('direct pin links enable their source and preserve opaque IDs', () => {
  for(const layer of ATLAS_URL_LAYERS.filter(id=>!id.startsWith('atmo-model-'))){
    const pin={layer,id:'ID:é/123 + &?'};
    const state=withAtlasPin({layers:[],pin:null},pin);
    assert.deepEqual(parseAtlasUrlState(writeAtlasUrlState('',state)),state);
  }
  assert.deepEqual(parseAtlasUrlState('?pin=georisques:AIOT0003204031'),{layers:['inventory','georisques'],pin:{layer:'georisques',id:'AIOT0003204031'}});
  assert.deepEqual(parseAtlasUrlState('?layers=&pin=groundwater:BSS001SGWX').layers,['groundwater']);
});
test('unknown, empty, oversized or malformed pins are ignored safely', () => {
  for(const raw of ['unknown:id','atmo-model-o3:id','georisques:','inventory','',`inventory:${'x'.repeat(513)}`,'inventory:\n']) {
    assert.equal(parseAtlasUrlState(`?pin=${encodeURIComponent(raw)}`).pin,null);
  }
});
test('turning off a selected source closes its detail, other toggles do not', () => {
  const state=parseAtlasUrlState('?layers=inventory,georisques&pin=georisques:AIOT0003204031');
  assert.deepEqual(withAtlasLayer(state,'georisques',false),{layers:['inventory'],pin:null});
  assert.deepEqual(withAtlasLayer(state,'inventory',false),{layers:['georisques'],pin:state.pin});
  assert.deepEqual(withAtlasPin(state,null),{layers:state.layers,pin:null});
  assert.deepEqual(withAtlasPin(state,{layer:'bathing',id:'lake'}).layers,['inventory','bathing','georisques']);
});
test('URL updates preserve unrelated parameters and remove only the closed pin', () => {
  const search=writeAtlasUrlState('?campaign=test&pin=inventory:S001', {layers:[],pin:null});
  const params=new URLSearchParams(search);
  assert.equal(params.get('campaign'),'test');
  assert.equal(params.get('layers'),'');
  assert.equal(params.has('pin'),false);
});
