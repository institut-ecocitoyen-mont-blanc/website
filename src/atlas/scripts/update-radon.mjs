import { writeFile, rename } from "node:fs/promises";
import { radonApiUrl, parseRadonResponse, RADON_SOURCE, RADON_LICENSE } from "../lib/radon.ts";

const sourceUrl = radonApiUrl();
const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Géorisques radon est indisponible (${response.status}).`);
const raw = await response.json();
const fetchedAt = new Date().toISOString();
const data = parseRadonResponse(raw, fetchedAt);
const target = new URL("../lib/data/radon.json", import.meta.url);
const temporary = new URL(`${target.href}.tmp`);
await writeFile(temporary, `${JSON.stringify({ sourceUrl, source: RADON_SOURCE, license: RADON_LICENSE, fetchedAt, response: raw }, null, 2)}\n`);
await rename(temporary, target);
console.log(`Radon : ${data.communes.length} communes vérifiées · ${fetchedAt}`);
