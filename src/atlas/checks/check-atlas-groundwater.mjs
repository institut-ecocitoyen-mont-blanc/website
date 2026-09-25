import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const width of [1440,390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    let analysesRequests=0;
    page.on('request',request=>{if(request.url().includes('/qualite_nappes/analyses?'))analysesRequests++;});
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas', {timeout:90000});
    const inventory=page.getByRole('checkbox',{name:'Sources de pollution potentielle Inventaire écocitoyen',exact:true});
    const water=page.getByRole('checkbox',{name:'Eaux souterraines Hub’Eau · ADES',exact:true});
    await inventory.waitFor();
    assert.equal(await page.getByRole('checkbox',{name:/^Géorisques/}).isChecked(),false);
    assert.equal(await page.locator('.georisques-pin').count(),0);
    assert.equal(await water.isChecked(),false);
    await inventory.uncheck();
    await water.check();
    const pinCount=await page.locator('.groundwater-pin').count();
    assert.ok(pinCount>0 && pinCount<85,'Only stations with verified analyses are shown');
    assert.equal(analysesRequests,0,'No 85-station fanout on activation');
    const waterPin=page.locator('.groundwater-pin[title$=" · BSS001SGTA"]');
    await waterPin.focus();await page.keyboard.press('Enter');
    const dialog=page.getByRole('dialog');
    await dialog.getByText(/200 résultats affichés sur/).waitFor({timeout:40000});
    assert.match(await dialog.innerText(),/26\/11\/2024/);
    assert.match(await dialog.innerText(),/Chef-lieu de la commune/);
    assert.match(await dialog.innerText(),/Fenêtre limitée aux 200 derniers résultats/);
    await dialog.getByRole('searchbox').fill('Benfluraline');
    const summary=dialog.locator('summary').filter({hasText:'Benfluraline'});await summary.click();
    assert.match(await dialog.innerText(),/< 0,005 µg\/L/);
    assert.match(await dialog.innerText(),/Qualification des données : Correcte/);
    assert.match(await dialog.innerText(),/Donnée contrôlée niveau 1/);
    assert.equal(await dialog.locator('[data-atlas-detail-body]').evaluate(el=>el.scrollWidth>el.clientWidth),false);
    await page.screenshot({path:`/tmp/atlas-groundwater-${width}.png`});
    await page.keyboard.press('Escape');assert.ok(await waterPin.evaluate(el=>document.activeElement===el));
    // Cayenne has a recent catalogue date, but no accessible chemistry: no pin.
    assert.equal(await page.locator('.groundwater-pin[title$=" · BSS001SGSB"]').count(),0);
    // A misrouted API response is an error, never measurements for a different well.
    await page.route('**/qualite_nappes/analyses?**',route=>route.fulfill({json:{count:1,next:null,data:[{bss_id:'BSSWRONG',code_insee_actuel:'74089'}]}}));
    await waterPin.focus();await page.keyboard.press('Enter');
    await page.getByRole('dialog').getByRole('alert').waitFor();
    await page.unroute('**/qualite_nappes/analyses?**');
    await page.getByRole('dialog').getByRole('button',{name:'Réessayer',exact:true}).click();
    await page.getByRole('dialog').getByText(/200 résultats affichés sur/).waitFor({timeout:40000});
    await page.keyboard.press('Escape');await water.uncheck();
    assert.equal(await page.locator('.groundwater-pin').count(),0);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: Géorisques remains disabled, ${pinCount} verified groundwater points, no empty Cayenne pin, real chemistry, approximate-location warning, error/retry and keyboard`);
    await page.close();
  }
} finally {await browser.close();}
