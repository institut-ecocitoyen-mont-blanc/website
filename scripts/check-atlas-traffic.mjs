import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  for (const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas');
    const toggle=page.getByRole('checkbox',{name:'Trafic routier annuel DDT de Haute-Savoie',exact:true});
    assert.equal(await page.locator('.atlas-traffic-section').count(),0);
    await page.getByRole('checkbox',{name:'Sources de pollution Inventaire écocitoyen',exact:true}).uncheck();
    await toggle.check();
    await page.getByText('39 tronçons · 31 avec un comptage. Cliquez sur une route pour consulter sa fiche.',{exact:true}).waitFor();
    assert.equal(await page.locator('.atlas-traffic-section').count(),39);
    for(const road of ['A40','D1205','D909','D1212','D13','D39','D902']) assert.ok(await page.locator(`.atlas-traffic-section[data-road="${road}"]`).count()>0);
    assert.equal(await page.locator('.atlas-traffic-section[stroke-dasharray]').count(),8);
    const a40=page.getByRole('button',{name:/^A40 · Point de comptage 9 ·/});
    assert.equal(await a40.getAttribute('stroke'),'#b91c1c');
    const d13=page.getByRole('button',{name:/^D13 · Point de comptage 11 ·/});
    assert.equal(await d13.getAttribute('stroke'),'#15803d');
    await a40.focus();await page.keyboard.press('Enter');
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    assert.match(await dialog.innerText(),/29\s*492 véhicules \/ jour/);
    assert.match(await dialog.innerText(),/2024/);
    assert.match(await dialog.innerText(),/6,58 %/);
    assert.match(await dialog.innerText(),/CAP9/);
    assert.ok(await dialog.evaluate(el=>el.matches(':modal')));
    assert.equal(await dialog.locator('[data-atlas-detail-body]').evaluate(el=>el.scrollWidth>el.clientWidth),false);
    await page.screenshot({path:`/tmp/atlas-traffic-detail-${width}.png`});
    await page.keyboard.press('Escape');
    assert.ok(await a40.evaluate(el=>document.activeElement===el),'Keyboard focus returns to SVG road');
    const opacity=page.getByRole('slider',{name:'Opacité · Trafic routier annuel',exact:true});
    await opacity.fill('0.5');
    assert.equal(await a40.getAttribute('stroke-opacity'),'0.5');
    await page.screenshot({path:`/tmp/atlas-traffic-map-${width}.png`});
    const missing=page.locator('.atlas-traffic-section[stroke-dasharray]').first();
    await missing.focus();await page.keyboard.press('Enter');
    await page.getByRole('dialog').getByText('Comptage non disponible',{exact:true}).waitFor();
    assert.match(await page.getByRole('dialog').innerText(),/aucun comptage exploitable/);
    await page.keyboard.press('Escape');await toggle.uncheck();
    assert.equal(await page.locator('.atlas-traffic-section').count(),0);
    assert.deepEqual(errors,[]);
    console.log(`PASS traffic ${width}px: 7 roads, 39 sections, 31 published counts, 8 unknowns, palette, units, opacity, keyboard and overlay`);
    await page.close();
  }
} finally {await browser.close();}
