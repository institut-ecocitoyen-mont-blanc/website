// Isolated fixtures verify colours; these are never application/provider data.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless:true, channel:'chrome' });
try {
  for (const [level, conformity, age, width] of [
    ['good','C',3600000,1400], ['moderate','D',3600000,1400], ['poor','N',3600000,1400],
    ['good','C',150*86400000,1400], ['unknown','S',3600000,1400], ['poor','N',3600000,390],
  ]) {
    const page = await browser.newPage({viewport:{width,height:1000}});
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const time = Date.now()-age, summaryRequests = [], detailRequests = [];
    await page.route('**/geo.api.gouv.fr/communes?**', (route) => route.fulfill({json:[{code:'74208',nom:'Commune test',centre:{coordinates:[6.62,45.95]}}]}));
    await page.route('**/hubeau.eaufrance.fr/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('station_pc')) return route.fulfill({json:{data:[
        {code_station:'06061000',libelle_station:'Magland',latitude:45.97,longitude:6.62},
        {code_station:'06000001',libelle_station:'Sans évaluation',latitude:45.92,longitude:6.73},
      ]}});
      if (url.pathname.endsWith('communes_udi')) return route.fulfill({json:{data:['074002403','074002404'].map((id,i)=>({code_commune:'74208',code_reseau:id,nom_reseau:`Réseau ${i+1}`,annee:2026})),next:null}});
      if (url.pathname.endsWith('analyse_pc')) return route.fulfill({json:{data:[]}});
      const id = url.searchParams.get('code_reseau');
      assert.ok(id, 'Every drinking request is network-scoped');
      (url.searchParams.get('size') === '1' ? summaryRequests : detailRequests).push(id);
      return route.fulfill({json:{data:[{code_prelevement:`sample-${id}`,date_prelevement:new Date(time).toISOString(),
        libelle_parametre:'Paramètre test',resultat_alphanumerique:'0',libelle_unite:'µg/L',
        conformite_limites_bact_prelevement:'C',conformite_limites_pc_prelevement:id==='074002404'?conformity:'C',
        conformite_references_bact_prelevement:'C',conformite_references_pc_prelevement:'C',
        reseaux:[{code:id,nom:id==='074002403'?'Réseau 1':'Réseau 2'}],conclusion_conformite_prelevement:`Conclusion ${id}`,
      }]}});
    });
    await page.goto(process.env.ATLAS_URL || 'http://localhost:3000/atlas');
    await page.getByRole('checkbox',{name:'Sources de pollution Inventaire écocitoyen',exact:true}).uncheck();
    await page.getByRole('checkbox',{name:'Eau potable · contrôle ARS Ministère de la Santé · Hub’Eau',exact:true}).check();
    await page.getByRole('button',{name:'Eau potable · Commune test',exact:true}).click();
    await page.getByRole('dialog').getByText('Réseau 2',{exact:true}).waitFor();
    await page.getByRole('dialog').getByRole('button').filter({hasText:'Réseau 2'}).click();
    await page.getByText('Conclusion 074002404',{exact:true}).first().waitFor();
    await page.getByText('10 derniers résultats au maximum',{exact:true}).waitFor();
    await page.locator(`.drinking-station-pin svg[data-quality="${level}"]`).waitFor();
    const expected = {good:'#16a34a',moderate:'#d97706',poor:'#dc2626',unknown:'white'}[level];
    assert.equal(await page.locator('.drinking-station-pin svg > path').getAttribute('fill'),expected);
    const dialog = page.getByRole('dialog');
    const body = await dialog.innerText();
    assert.match(body,/Catalogue des dessertes publié pour 2026/);
    assert.match(body,/Résultats · Réseau 2/);
    if(age>90*86400000) assert.match(body,/Donnée historique/);
    if(level==='unknown') assert.ok(body.includes('1/2 réseaux avec une conclusion exploitable'));
    assert.equal(summaryRequests.length,2,'One summary per unique network');
    assert.ok(detailRequests.includes('074002404'));
    assert.equal(await dialog.evaluate(el=>el.querySelector('[data-atlas-detail-body]').scrollWidth>el.querySelector('[data-atlas-detail-body]').clientWidth),false);
    if(level==='poor') {
      await page.locator('[data-atlas-detail-body]').evaluate(el=>{el.scrollTop=0;});
      await page.screenshot({path:`/tmp/atlas-network-${width}.png`});
    }
    await page.keyboard.press('Escape');
    if(width===1400 && level==='poor') {
      await page.getByRole('checkbox',{name:'Eau potable · contrôle ARS Ministère de la Santé · Hub’Eau',exact:true}).uncheck();
      await page.getByRole('checkbox',{name:'Qualité des cours d’eau Agence de l’eau · Hub’Eau · Naïades',exact:true}).check();
      const known = page.getByRole('button',{name:'Cours d’eau · Magland',exact:true});
      await known.waitFor();
      assert.equal(await known.locator('svg').getAttribute('data-quality'),'moderate');
      const unknown = page.getByRole('button',{name:'Cours d’eau · Sans évaluation',exact:true});
      assert.equal(await unknown.locator('svg > path').getAttribute('fill'),'white');
      await known.click();
      assert.match(await page.getByRole('dialog').innerText(),/Potentiel écologique : moyen/);
      assert.match(await page.getByRole('dialog').innerText(),/Bon état chimique/);
      assert.match(await page.getByRole('dialog').innerText(),/2026/);
      await page.screenshot({path:'/tmp/atlas-river-assessment.png'});
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${level}, ${age>90*86400000?'historical':'recent'}, ${width}px, network scope and colours`);
    await page.close();
  }
} finally {await browser.close();}
