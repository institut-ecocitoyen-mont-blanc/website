import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { clearManifestCache, datasetNeedsAttention, loadPublishedData, parseSnapshot } from "../lib/published-data.ts";
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
