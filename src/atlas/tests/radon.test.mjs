import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CCPMB_COMMUNES } from "../lib/ccpmb-territory.ts";
import { parseRadonResponse, radonApiUrl, radonCategory, radonCommuneUrl } from "../lib/radon.ts";

const snapshot = JSON.parse(readFileSync(new URL("../lib/data/radon.json", import.meta.url), "utf8"));
const response = () => structuredClone(snapshot.response);

test("official snapshot covers exactly the ten pinned communes with the verified categories", () => {
  const data = parseRadonResponse(snapshot.response, snapshot.fetchedAt);
  assert.deepEqual(data.communes.map(({ code, name }) => ({ code, name })), CCPMB_COMMUNES.map(({ code, nom }) => ({ code, name: nom })));
  assert.deepEqual(Object.fromEntries(data.communes.map(({ code, category }) => [code, category])), {
    "74083": 1, "74085": 2, "74089": 1, "74099": 1, "74103": 1,
    "74173": 1, "74208": 3, "74215": 1, "74236": 3, "74256": 1,
  });
  assert.equal(data.fetchedAt, snapshot.fetchedAt);
});
test("source queries stay bounded to the exact communes and detail URLs encode their identifier", () => {
  const url = new URL(radonApiUrl());
  assert.equal(url.protocol, "https:");
  assert.deepEqual(url.searchParams.get("code_insee").split(","), CCPMB_COMMUNES.map(({ code }) => code));
  assert.equal(new URL(radonCommuneUrl("74208&extra=1")).searchParams.get("code_insee"), "74208&extra=1");
});
test("incomplete, duplicate, foreign, truncated and error responses cannot replace the snapshot", () => {
  const short = response(); short.data.pop(); short.results--;
  const duplicate = response(); duplicate.data[0] = duplicate.data[1];
  const foreign = response(); foreign.data[0].code_insee = "75056";
  const invalidRow = response(); invalidRow.data[0] = null;
  for (const value of [null, {}, short, duplicate, foreign, invalidRow,
    { ...response(), response_code: 500 }, { ...response(), next: "https://example.com/page2" },
    { ...response(), total_pages: 2 }, { ...response(), page: 2 }, { ...response(), results: 11 },
  ]) assert.throws(() => parseRadonResponse(value, snapshot.fetchedAt));
  assert.throws(() => parseRadonResponse(response(), "invalid-date"));
});
test("missing categories stay unknown; unsupported categories fail rather than resembling category 1", () => {
  for (const missing of [null, undefined, ""]) {
    const value = response(); value.data[0].classe_potentiel = missing;
    const data = parseRadonResponse(value, snapshot.fetchedAt);
    assert.equal(data.communes.find(({ code }) => code === value.data[0].code_insee).category, null);
    assert.equal(radonCategory(null), undefined);
  }
  for (const invalid of ["0", "4", "faible", false, [], {}]) {
    const value = response(); value.data[0].classe_potentiel = invalid;
    assert.throws(() => parseRadonResponse(value, snapshot.fetchedAt), /Catégorie radon inconnue/);
  }
});
