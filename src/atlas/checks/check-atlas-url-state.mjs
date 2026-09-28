import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { usePublishedFixture } from "./published-fixture.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
if (!process.env.ATLAS_DATA_DIR) throw new Error("Set ATLAS_DATA_DIR to the export repo public directory");
const data = async key => JSON.parse(await readFile(join(process.env.ATLAS_DATA_DIR, `data/${key}.json`), "utf8")).data;
const inventory = (await data("inventory")).sites[0], bathing = (await data("bathing")).points[0];
const river = (await data("rivers")).points[0], drinking = (await data("drinking")).points[0];
const ground = (await data("groundwater")).stations[0], atmo = (await data("air-pm25"))[0];
const traffic = (await data("traffic")).segments[0], light = (await data("cerema-light")).communes[0];
const geo = (await data("georisques")).sites.find(site => site.id === "AIOT0003204031");
assert.ok(geo, "expanded export includes PUGNAT");
const cases = [
  ["inventory",inventory.id,inventory.name], ["bathing",bathing.id,bathing.name],
  ["rivers",river.id,river.name], ["drinking",drinking.id,drinking.name],
  ["groundwater",ground.id,ground.name], ["atmo",atmo.id,atmo.name],
  ["traffic",traffic.id,`${traffic.road} · ${traffic.name}`], ["cerema-light",light.code,light.name],
  ["georisques",geo.id,geo.name], ["pesticide-purchases","74190","Zone postale 74190"],
];
const base = process.env.ATLAS_URL || "http://localhost:3000/atlas";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[], upstream=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("request",request=>{ if (/georisques\.gouv\.fr\/api|hubeau\.eaufrance\.fr\/api|services3\.arcgis\.com/.test(request.url())) upstream.push(request.url()); });
    await usePublishedFixture(page);
    const openLayers=async()=>{if(width<1024) await page.getByRole("button",{name:/^Couches/}).click();};
    const ready=async()=>{await page.locator(".leaflet-container").waitFor();await page.getByText("Chargement des jeux de données publiés…",{exact:true}).waitFor({state:"hidden"});};
    await page.goto(`${base}?campaign=url-check#map`); await ready(); await openLayers();
    assert.equal(await page.locator('input[type="checkbox"]:checked').count(),1);
    const checkboxes=page.getByRole("checkbox");
    assert.equal(await checkboxes.count(),14);
    for (const box of await checkboxes.all()) await box.check();
    await page.waitForURL(url=>url.searchParams.get("layers")?.split(",").length===14);
    assert.equal(new URL(page.url()).searchParams.get("campaign"),"url-check");
    assert.equal(new URL(page.url()).hash,"#map");
    await page.reload(); await ready(); await openLayers();
    assert.equal(await page.locator('input[type="checkbox"]:checked').count(),14);
    for (const box of await checkboxes.all()) await box.uncheck();
    await page.waitForURL(url=>url.searchParams.get("layers")==="");
    await page.reload(); await ready(); await openLayers();
    assert.equal(await page.locator('input[type="checkbox"]:checked').count(),0);
    await page.getByRole("checkbox",{name:/^Géorisques/}).check();
    await page.goBack();
    await page.waitForURL(url=>url.searchParams.get("layers")==="");
    assert.equal(await page.getByRole("checkbox",{name:/^Géorisques/}).isChecked(),false);
    await page.goForward();
    await page.waitForURL(url=>url.searchParams.get("layers")==="georisques");
    assert.equal(await page.getByRole("checkbox",{name:/^Géorisques/}).isChecked(),true);
    for (const [layer,id,title] of cases) {
      const params=new URLSearchParams({layers:"",pin:`${layer}:${id}`,campaign:"url-check"});
      const link=`${base}?${params}#map`;
      await page.goto(link);
      const dialog=page.getByRole("dialog");
      await dialog.getByRole("heading",{name:title,exact:true}).waitFor();
      assert.equal(new URL(page.url()).searchParams.get("pin"),`${layer}:${id}`);
      assert.equal(await dialog.count(),1);
      await page.reload();
      await dialog.getByRole("heading",{name:title,exact:true}).waitFor();
      await dialog.getByRole("button",{name:"Fermer la fiche",exact:true}).click();
      await dialog.waitFor({state:"hidden"});
      assert.equal(new URL(page.url()).searchParams.has("pin"),false);
      assert.equal(new URL(page.url()).searchParams.get("layers"),layer);
      await page.goBack();
      await dialog.getByRole("heading",{name:title,exact:true}).waitFor();
      await page.goForward(); await dialog.waitFor({state:"hidden"});
      assert.equal(new URL(page.url()).hash,"#map");
    }
    // Opening an actual pin writes the same shareable identifier (not only URL -> UI).
    await page.goto(`${base}?layers=bathing`); await ready();
    await page.locator('.leaflet-marker-icon[role="button"]').first().press("Enter");
    await page.getByRole("dialog").waitFor();
    assert.match(new URL(page.url()).searchParams.get("pin"),/^bathing:/);
    // Unknown identifiers stay harmless and do not select a different site.
    await page.goto(`${base}?layers=bogus&pin=georisques:does-not-exist`); await ready();
    assert.equal(await page.getByRole("dialog").count(),0);
    await openLayers();
    assert.equal(await page.getByRole("checkbox",{name:/^Géorisques/}).isChecked(),true);
    assert.deepEqual(errors,[]); assert.deepEqual(upstream,[]);
    console.log(`PASS ${width}px: 14 layers, empty/default states, 10 detail types, reload, Back/Forward, real pin selection, unrelated query/hash preservation`);
    await page.close();
  }
} finally { await browser.close(); }
