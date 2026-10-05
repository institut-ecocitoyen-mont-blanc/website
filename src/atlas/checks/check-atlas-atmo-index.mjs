import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { usePublishedFixture } from "./published-fixture.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
if (!process.env.ATLAS_DATA_DIR) throw new Error("Set ATLAS_DATA_DIR to the export repo public directory");
const snapshot = JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, "data/atmo-index.json"), "utf8"));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440,390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [], upstream = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", r => { if (/sig\.atmo-auvergnerhonealpes\.fr|geodair\.fr\/api-ext/.test(r.url())) upstream.push(r.url()); });
    await page.clock.install({ time: new Date("2026-10-05T08:00:00Z") });
    await usePublishedFixture(page);
    let stale = false;
    await page.route("**/data/atmo-index.json*", route => route.fulfill({ json: { ...snapshot, data: { ...snapshot.data, records: snapshot.data.records.filter(r => !stale || r.date === "2026-10-04") } } }));
    const url = `${process.env.ATLAS_URL || "http://localhost:3000/atlas"}?layers=atmo&pin=atmo:FR33220`;
    await page.goto(url);
    const dialog = page.getByRole("dialog"), summary = dialog.getByRole("region", { name: "Indice Atmo communal" });
    await summary.getByText("Indice Atmo · Moyen", { exact: true }).waitFor();
    assert.match(await summary.innerText(), /Commune de Passy · 5 octobre 2026/);
    assert.equal(await dialog.getByText("Polluants insuffisants au même créneau pour qualifier la station.").count(),0);
    await dialog.getByRole("heading", {name:"Autres gaz mesurés",exact:true}).waitFor();
    assert.equal(await dialog.getByRole("heading", { name: "PM₂.₅", exact: true }).count(),1);
    await page.screenshot({path:`/tmp/atlas-atmo-index-${width}.png`});
    // A cached successful export from yesterday must not colour today's pins.
    stale = true;
    await page.reload();
    await summary.getByText("Indice Atmo · Indisponible", {exact:true}).waitFor();
    await dialog.getByRole("heading",{name:"Autres gaz mesurés",exact:true}).waitFor();
    const fills = await page.locator('.atmo-station-pin svg > path:first-child').evaluateAll(paths=>paths.map(p=>p.getAttribute("fill")));
    assert.ok(fills.length > 0); assert.ok(fills.every(fill=>fill==="#94a3b8"));
    assert.deepEqual(errors,[]); assert.deepEqual(upstream,[]);
    console.log(`PASS ${width}px: official commune/date/colour, unchanged measurements, stale index neutral, no upstream calls`);
    await page.close();
  }
} finally { await browser.close(); }
