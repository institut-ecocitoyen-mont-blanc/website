// Read-only comparison: does not import into the atlas or publish any dataset.
// Usage: node src/atlas/checks/probe-lcsqa-source.mjs 2026-09-24 2026-09-23 2026-02-03
import { parse } from "csv-parse/sync";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const base = "https://files.data.gouv.fr/ineris/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel";
const atlas = "https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data";
const pollutants = { pm25: "PM2.5", pm10: "PM10", no2: "NO2", o3: "O3" };
const days = process.argv.slice(2);
if (!days.length || days.length > 3 || days.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error("Supply one to three ISO dates");
async function download(url, limit) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  if (Number(response.headers.get("content-length")) > limit) throw new Error("File exceeds probe budget");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > limit) throw new Error("File exceeds probe budget");
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return { text: buffer.toString("utf8"), bytes, sha256: createHash("sha256").update(buffer).digest("hex"), modified: response.headers.get("last-modified") };
}
const references = {};
for (const id of Object.keys(pollutants)) references[id] = JSON.parse((await download(`${atlas}/data/air-${id}.json`, 4_000_000)).text).data;
const stations = new Map(Object.values(references).flat().map((s) => [s.id, { id: s.id, name: s.name, lat: s.lat, lng: s.lng }]));
// These study/extra sites can have zero observations in the current snapshot.
for (const [id, name] of [["FR33220", "Passy"], ["FR33236", "Sallanches Régie"], ["ET00909", "Passy Chedde"]]) {
  if (!stations.has(id)) stations.set(id, { id, name });
}
const report = { checkedAt: new Date().toISOString(), source: base, files: [], stations: [...stations.values()] };
const required = ["Date de début", "Date de fin", "code site", "nom site", "Polluant", "valeur", "valeur brute", "unité de mesure", "code qualité", "validité", "discriminant"];
for (const day of days) {
  const url = `${base}/${day.slice(0, 4)}/FR_E2_${day}.csv`;
  const downloaded = await download(url, 20_000_000);
  const records = parse(downloaded.text, { bom: true, delimiter: ";", columns: true, skip_empty_lines: true });
  if (!records.length || required.some((column) => !(column in records[0]))) throw new Error("Unexpected CSV contract");
  const selected = records.filter((r) => stations.has(r["code site"]));
  const nearNames = [...new Map(records.filter((r) => /passy|sallanches|chedde/i.test(r["nom site"])).map((r) => [r["code site"], { id: r["code site"], name: r["nom site"] }])).values()];
  const summary = [];
  for (const station of stations.values()) for (const [key, pollutant] of Object.entries(pollutants)) {
    const matches = selected.filter((r) => r["code site"] === station.id && r.Polluant === pollutant).sort((a, b) => a["Date de début"].localeCompare(b["Date de début"]));
    const numeric = matches.filter((r) => r.valeur.trim() !== "" && Number.isFinite(Number(r.valeur)));
    const usable = numeric.filter((r) => r["validité"].trim() !== "" && Number(r["validité"]) >= 1);
    const latest = usable.at(-1);
    const original = references[key].find((s) => s.id === station.id);
    const overlap = original?.period === "hourly" ? usable.flatMap((r) => {
      // CSV export documentation specifies UTC for metropolitan France.
      const time = Date.parse(r["Date de début"].replaceAll("/", "-").replace(" ", "T") + "Z");
      const reading = original.readings.find((v) => v.time === time && v.value !== null);
      return reading ? [{ time: r["Date de début"], arcgis: reading.value, national: Number(r.valeur), delta: Number(r.valeur) - reading.value }] : [];
    }) : [];
    const comparisonByOffset = original?.period === "hourly" ? [-2, -1, 0, 1, 2].map((offsetHours) => {
      const deltas = usable.flatMap((r) => {
        const time = Date.parse(r["Date de début"].replaceAll("/", "-").replace(" ", "T") + "Z") + offsetHours * 3600000;
        const reading = original.readings.find((v) => v.time === time && v.value !== null);
        return reading ? [Math.abs(Number(r.valeur) - reading.value)] : [];
      });
      return { offsetHours, matched: deltas.length, exact: deltas.filter((d) => d < 0.000001).length, maxAbsoluteDelta: deltas.length ? Math.max(...deltas) : null };
    }) : [];
    summary.push({ station: station.id, pollutant, rows: matches.length, numeric: numeric.length, usable: usable.length, invalid: matches.filter((r) => !r["validité"].trim() || Number(r["validité"]) < 1).length,
      qualityCodes: [...new Set(matches.map((r) => r["code qualité"]))], validityCodes: [...new Set(matches.map((r) => r["validité"]))], units: [...new Set(matches.map((r) => r["unité de mesure"]))], discriminants: [...new Set(matches.map((r) => r.discriminant))],
      first: matches[0]?.["Date de début"], last: matches.at(-1)?.["Date de début"], latestUsable: latest ? { startUTC: latest["Date de début"], endUTC: latest["Date de fin"], value: latest.valeur, raw: latest["valeur brute"], unit: latest["unité de mesure"], quality: latest["code qualité"], validity: latest["validité"] } : null,
      duplicateHours: matches.length - new Set(matches.map((r) => r["Date de début"])).size,
      comparison: overlap.length ? { matched: overlap.length, maxAbsoluteDelta: Math.max(...overlap.map((r) => Math.abs(r.delta))), first: overlap[0] } : null,
      comparisonByOffset,
    });
  }
  report.files.push({ day, url, bytes: downloaded.bytes, sha256: downloaded.sha256, lastModified: downloaded.modified, nationalRows: records.length, columns: Object.keys(records[0]), nearbyNamedSites: nearNames, selectedRecords: selected, summary });
}
const output = process.env.PROBE_OUTPUT || "/tmp/iec-lcsqa-probe-2026-09-24.json";
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
console.log(`Read-only evidence written to ${output}`);
