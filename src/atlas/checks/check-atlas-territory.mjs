import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { insideCcpmb } from '../lib/ccpmb-territory.ts';
import { WOOD_HEATMAP_BOUNDS } from '../lib/wood-heatmap.ts';
const { chromium } = createRequire(import.meta.url)('playwright');

// Inspect the static payload as well as browser-side provider refreshes.
let inventoryCount=0, riverCount=0, checkedPoints=0;
for(const line of readFileSync('out/atlas.txt','utf8').split('\n')) {
  let value;
  try { value=JSON.parse(line.slice(line.indexOf(':')+1)); } catch { continue; }
  const visit=(value)=>{
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value.sites))inventoryCount=value.sites.length;
    if(value.points?.some(p=>p.properties?.code_station))riverCount=value.points.length;
    if(typeof value.lat==='number'&&typeof value.lng==='number') {
      assert.ok(insideCcpmb(value.lat,value.lng),`Exported point outside territory: ${value.id??value.name??JSON.stringify(value)}`);
      checkedPoints++;
    }
    Object.values(value).forEach(visit);
  };
  visit(value);
}
assert.ok(inventoryCount>0&&riverCount>0&&checkedPoints>0,'Real inventory and river snapshot included');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  for(const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let riverOutage=true;
    const waterQueries=[];
    await page.route('**/hubeau.eaufrance.fr/**',route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith('/station_pc'))return riverOutage?route.fulfill({status:500,body:'Unavailable'}):route.fulfill({json:{data:[
        {code_station:'inside',libelle_station:'Passy test',latitude:45.923535,longitude:6.713642},
        {code_station:'outside',libelle_station:'Servoz test',latitude:45.93,longitude:6.762},
      ],next:null}});
      if(url.pathname.endsWith('/communes_udi'))waterQueries.push(url.searchParams.get('code_commune'));
      return route.fulfill({json:{data:[],next:null}});
    });
    await page.route('**/geo.api.gouv.fr/communes?**',route=>route.fulfill({json:[
      {code:'74208',nom:'Passy test',centre:{coordinates:[6.713642,45.923535]}},
      {code:'74266',nom:'Servoz test',centre:{coordinates:[6.762,45.93]}},
    ]}));
    await page.route('**/services3.arcgis.com/**',route=>route.fulfill({json:{features:decodeURIComponent(route.request().url()).includes('journalières')?[]:[
      {attributes:{code_station:'inside',nom_station:'Passy test',x_wgs84:6.713642,y_wgs84:45.923535,date_debut:Date.parse('2026-09-09T12:00:00Z'),valeur:12,unite:'µg/m³'}},
      {attributes:{code_station:'outside',nom_station:'Servoz test',x_wgs84:6.762,y_wgs84:45.93,date_debut:Date.parse('2026-09-09T12:00:00Z'),valeur:25,unite:'µg/m³'}},
    ]}}));
    await page.goto(process.env.ATLAS_URL??'http://localhost:3000/atlas',{waitUntil:'domcontentloaded'});
    const toggle=(name)=>page.getByRole('checkbox',{name,exact:true}).check();
    await page.getByText(new RegExp(`^${inventoryCount} sites cartographiés`)).waitFor();
    assert.equal(await page.locator('.custom-marker').count(),inventoryCount);
    await toggle('Qualité des cours d’eau Agence de l’eau · Hub’Eau · Naïades');
    await page.getByText('Hub’Eau est temporairement indisponible. Le catalogue conservé reste affiché ; les analyses détaillées peuvent être indisponibles.',{exact:true}).waitFor();
    assert.equal(await page.locator('.rivers-station-pin').count(),riverCount,'Clipped snapshot survives outage');
    riverOutage=false;
    await page.getByRole('button',{name:'Réessayer',exact:true}).click();
    await page.getByText(/1 stations · Catalogue chargé/).waitFor();
    assert.equal(await page.locator('.rivers-station-pin').count(),1);
    await toggle('Eau potable · contrôle ARS Ministère de la Santé · Hub’Eau');
    await page.getByText(/1 communes · Catalogue chargé/).waitFor();
    await page.getByRole('button',{name:'Eau potable · Passy test',exact:true}).waitFor();
    assert.equal(await page.locator('.drinking-station-pin').count(),1);
    await toggle('Particules et gaz Atmo Auvergne-Rhône-Alpes');
    await page.getByText('3 station(s) · un pin par station, tous ses polluants dans la fiche.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Station Atmo · Passy test',exact:true}).waitFor();
    await toggle('Eaux de baignade · ARS Ministère de la Santé');
    await page.getByText(/^3 sites · \d+ prélèvements récupérés\.$/).waitFor();
    assert.equal(await page.locator('.bathing-station-pin').count(),3);
    for(const name of ['Thyez','Morillon','Samoëns','Servoz test']) assert.equal(await page.locator(`.leaflet-marker-icon[title*="${name}"]`).count(),0);
    await toggle('Lichens (bio-indication) Démonstration · données fictives');
    await toggle('Bio-accumulation (retombées) Démonstration · données fictives');
    await toggle('Analyses de sols Démonstration · données fictives');
    assert.equal(await page.locator('.lichens-demo-pin').count(),13);
    assert.equal(await page.locator('.bioacc-demo-pin').count(),10);
    assert.equal(await page.locator('.soil-demo-pin').count(),15);
    await toggle('Chauffage résidentiel Démonstration · données fictives');
    const heat=page.locator('.leaflet-image-layer');await heat.waitFor();
    await heat.evaluate(image=>image.decode());
    const samples=await heat.evaluate((image,bounds)=>{
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
      return [[45.93,6.770],[45.924,6.870],[45.821,6.728],[45.837,6.572]].map(([lat,lng])=>{
        const x=Math.round((lng-bounds.west)/(bounds.east-bounds.west)*(canvas.width-1));
        const y=Math.round((mercator(bounds.north)-mercator(lat))/(mercator(bounds.north)-mercator(bounds.south))*(canvas.height-1));
        return ctx.getImageData(x,y,1,1).data[3];
      });
    },WOOD_HEATMAP_BOUNDS);
    assert.deepEqual(samples.slice(0,2),[0,0]);assert.ok(samples[2]>200&&samples[3]>200);
    assert.ok(waterQueries.length>0&&waterQueries.every(q=>q==='74208'));
    await page.screenshot({path:`/tmp/atlas-commune-clipping-${width}.png`});
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: ${inventoryCount} inventory, ${riverCount} cached rivers; filtered live water/air, 3 bathing sites, all demos, heatmap and counts`);
    await page.close();
  }
} finally {await browser.close();}
