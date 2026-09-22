import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLayer } from '../lib/environmental-layers.ts';
import { loadRiverCatalogue } from '../lib/river-catalogue.ts';

test('river catalogue recovers from a transient HTTP 500 using the same request', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return urls.length === 1 ? new Response('Provider error', {status:500}) : Response.json({data:[{code_station:'06061000',libelle_station:'ARVE A MAGLAND',latitude:45.97,longitude:6.62}],next:null});
  };
  try {
    const points = await loadLayer('rivers', new AbortController().signal);
    assert.equal(points.length,1);
    assert.equal(points[0].id,'06061000');
    assert.equal(urls.length,2);
    assert.equal(urls[0],urls[1]);
  } finally {globalThis.fetch = original;}
});

test('persistent outages stop after three attempts; failed builds do not invent a catalogue', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => {calls++; return new Response('Unavailable',{status:503});};
  try {
    const snapshot = await loadRiverCatalogue();
    assert.deepEqual(snapshot,{points:[],fetchedAt:null});
    assert.equal(calls,3);
  } finally {globalThis.fetch=original;}
});

test('bad requests and malformed payloads are not retried', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [() => new Response('Bad request',{status:400}), () => new Response('bad json'), () => Response.json({data:[],next:'another-page'})]) {
      let calls = 0;
      globalThis.fetch = async () => {calls++;return response();};
      await assert.rejects(loadLayer('rivers',new AbortController().signal));
      assert.equal(calls,1);
    }
  } finally {globalThis.fetch=original;}
});

test('disabling the layer during backoff cancels retries', async () => {
  const original = globalThis.fetch; let calls = 0;
  const controller = new AbortController();
  globalThis.fetch = async () => {calls++;setTimeout(()=>controller.abort(),20);return new Response('Unavailable',{status:500});};
  try {
    await assert.rejects(loadLayer('rivers',controller.signal), {name:'AbortError'});
    assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
