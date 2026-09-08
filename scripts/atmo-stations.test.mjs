import assert from "node:assert/strict";
import test from "node:test";
import { combineAirStations, groupAirStations, latestAirValue, airChartSegments, airQueryUrl, loadAirStations, airIsStale } from "../src/lib/atmo-stations.ts";

const bounds = { west: 6.45, east: 7.1, south: 45.7, north: 46.1 };
const time = Date.parse("2026-02-03T09:00:00Z");
const row = (extra = {}) => ({ code_station: "FR33220", nom_station: "Passy", x_wgs84: 6.713642, y_wgs84: 45.923535, date_debut: time, date_fin: time + 3600000, valeur: 12.9, unite: "µg/m³", statut_valid: "t", ...extra });

test("all pollutants share one pin per station without losing their separate histories", () => {
  const no2 = groupAirStations([row()], bounds);
  const pm25 = groupAirStations([row({ valeur: 8 })], bounds);
  const pm10 = groupAirStations([row({ code_station: "FR33232", nom_station: "Bossons" })], bounds);
  const groups = combineAirStations({ no2: { stations: no2 }, pm25: { stations: pm25 }, pm10: { stations: pm10 }, o3: { stations: [] } });
  assert.equal(groups.length, 2);
  const passy = groups.find((group) => group.station.id === "FR33220");
  assert.deepEqual(passy.measurements.map((m) => m.pollutant), ["pm25", "no2"]);
  assert.deepEqual(passy.measurements.map((m) => m.station.readings[0].value), [8, 12.9]);
});

test("published coordinates, chronological histories, missing values and raw validation codes are preserved", () => {
  const stations = groupAirStations([
    row({ date_debut: time + 3600000, valeur: null, statut_valid: null }),
    row({ valeur: 0, statut_valid: "f" }),
    row({ date_debut: time - 3600000, valeur: 2.1 }),
    row({ code_station: "elsewhere", y_wgs84: 48 }),
    row({ code_station: "missing-coordinates", x_wgs84: null }),
  ], bounds);
  assert.equal(stations.length, 1);
  assert.equal(stations[0].lat, 45.923535);
  assert.equal(stations[0].lng, 6.713642);
  assert.deepEqual(stations[0].readings.map((r) => r.value), [2.1, 0, null]);
  assert.deepEqual(stations[0].readings.map((r) => r.validation), ["t", "f", null]);
  assert.equal(latestAirValue(stations[0]).value, 0);
  assert.equal(latestAirValue(stations[0]).time, time);
  assert.ok(airIsStale(time, time + 49 * 3600000));
  assert.equal(airIsStale(time, time + 3600000), false);
});

test("charts break across null readings, missing hours and unit changes", () => {
  const readings = [0, 1, 2, 4, 5, 6].map((hour) => ({ time: time + hour * 3600000, value: hour === 1 ? null : hour, unit: hour === 6 ? "other" : "µg/m³", validation: null, end: null }));
  assert.deepEqual(airChartSegments(readings).map((segment) => segment.length), [1, 1, 2, 1]);
});

test("pollutants target distinct verified service layers", () => {
  for (const [pollutant, layer] of [["pm25", 2], ["pm10", 4], ["no2", 1], ["o3", 3]]) {
    const url = new URL(airQueryUrl(pollutant, bounds, 2000));
    assert.ok(url.pathname.endsWith(`/${layer}/query`));
    assert.equal(url.searchParams.get("resultOffset"), "2000");
    assert.match(url.searchParams.get("where"), /x_wgs84>=6.45/);
  }
});

test("loader follows pagination and keeps a complete station history", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(new URL(url));
    return Response.json({ features: [{ attributes: row({ date_debut: time + calls.length * 3600000 }) }], exceededTransferLimit: calls.length === 1 });
  });
  const stations = await loadAirStations("no2", bounds, new AbortController().signal);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].searchParams.get("resultOffset"), "1");
  assert.equal(stations[0].readings.length, 2);
});

test("loader rejects provider errors and incomplete pagination", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "offline" } }));
  await assert.rejects(loadAirStations("pm25", bounds, new AbortController().signal), /indisponible/);
  mock.mock.mockImplementation(async () => Response.json({ features: [], exceededTransferLimit: true }));
  await assert.rejects(loadAirStations("pm25", bounds, new AbortController().signal), /partiel refusé/);
});
