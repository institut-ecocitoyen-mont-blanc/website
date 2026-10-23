import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { clearManifestCache, datasetNeedsAttention, loadPublishedData, parseSnapshot, expandSnapshot } from "../lib/published-data.ts";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; clearManifestCache(); });
const entry = { path: "data/rivers.json", hash: "abc", source: "provider", intervalHours: 24, lastAttemptAt: "2026-09-24T10:00:00Z", lastSuccessAt: "2026-09-23T10:00:00Z", status: "error" };
const manifest = { schemaVersion: 1, checkedAt: "2026-09-24T10:00:00Z", datasets: { rivers: entry } };

test("last successful data remain readable during an import failure", async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return Response.json(url.includes("manifest.json") ? manifest : { schemaVersion: 1, key: "rivers", data: { points: [{ id: "test" }], fetchedAt: "old", measurementDate: "2020-01-01" } });
  };
  const data = await loadPublishedData("rivers");
  assert.equal(data.points.length, 1);
  assert.equal(data.fetchedAt, entry.lastSuccessAt);
  assert.equal(data.measurementDate, "2020-01-01");
  assert.ok(urls.every((url) => !url.includes("hubeau")));
  assert.equal(datasetNeedsAttention(entry), true);
});
test("missing first import is an error, not a false empty dataset", async () => {
  globalThis.fetch = async () => Response.json({ ...manifest, datasets: { rivers: { ...entry, path: undefined } } });
  await assert.rejects(loadPublishedData("rivers"), /Aucun import réussi/);
});
test("unsupported schema, wrong dataset and unsafe paths are rejected", async () => {
  assert.throws(() => parseSnapshot({ schemaVersion: 2, key: "rivers", data: [] }, "rivers"));
  assert.throws(() => parseSnapshot({ schemaVersion: 1, key: "drinking", data: [] }, "rivers"));
  globalThis.fetch = async () => Response.json({ ...manifest, datasets: { rivers: { ...entry, path: "https://other.example/data.json" } } });
  await assert.rejects(loadPublishedData("rivers"), /Chemin/);
});
test("successful but overdue imports still need attention", () => {
  assert.equal(datasetNeedsAttention({ ...entry, status: "ok" }, Date.parse("2026-09-23T11:00:00Z")), false);
  assert.equal(datasetNeedsAttention({ ...entry, status: "ok" }, Date.parse("2026-09-27T11:00:00Z")), true);
});
test("retired datasets do not generate stale or failed-import warnings", async () => {
  const retired = { ...entry, retiredAt: "2026-10-10T20:00:00Z" };
  assert.equal(datasetNeedsAttention(retired), false);
  globalThis.fetch = async (url) => Response.json(url.includes("manifest.json")
    ? { ...manifest, datasets: { rivers: retired } }
    : { schemaVersion: 1, key: "rivers", data: { points: [{ id: "saved" }] } });
  assert.equal((await loadPublishedData("rivers")).points[0].id, "saved");
});
test("manifest requests are shared, and a failed request can be retried", async () => {
  let count = 0;
  globalThis.fetch = async (url) => {
    if (url.includes("manifest.json")) { count++; return count === 1 ? new Response("unavailable", { status: 503 }) : Response.json(manifest); }
    return Response.json({ schemaVersion: 1, key: "rivers", data: [] });
  };
  await assert.rejects(loadPublishedData("rivers"));
  await Promise.all([loadPublishedData("rivers"), loadPublishedData("rivers")]);
  assert.equal(count, 2);
});

test("loads the complete compressed archive rather than the backwards-compatible preview", async () => {
  const records = Array.from({length: 1001}, (_, i) => ({parameter: String(i), value: i === 0 ? null : i}));
  const bodies = records.reduce((chunks, row, i) => { (chunks[Math.floor(i/500)] ??= []).push(row); return chunks; }, []).map(rows => gzipSync(JSON.stringify(rows)));
  const parts = bodies.map((bytes, i) => { const hash = createHash('sha256').update(bytes).digest('hex'); return {path:`history/groundwater-test/${hash}.json.gz`,hash,count:Math.min(500, records.length - i*500)}; });
  globalThis.fetch = async url => new Response(bodies[parts.findIndex(p => url.endsWith(p.path))]);
  const snapshot = {schemaVersion:1,key:'groundwater-test',data:{analyses:records.slice(0,100),total:records.length,more:true},archive:{version:1,complete:true,field:'analyses',count:records.length,parts}};
  const data = await expandSnapshot(snapshot, 'groundwater-test');
  assert.deepEqual(data.analyses, records); assert.equal(data.more, false); assert.equal(data.total, 1001);
  await assert.rejects(expandSnapshot({...snapshot,archive:{...snapshot.archive,count:1002}},'groundwater-test'), /incomplet/);
  await assert.rejects(expandSnapshot({...snapshot,archive:{...snapshot.archive,parts:[{...parts[0],path:'https://other.invalid'}]}},'groundwater-test'), /invalide/);
  globalThis.fetch = async () => new Response(gzipSync('[]'));
  await assert.rejects(expandSnapshot(snapshot,'groundwater-test'), /corrompu/);
});
