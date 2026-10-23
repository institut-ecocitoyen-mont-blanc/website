import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessDrinkingResult, groundwaterResultSummary, latestWaterSample, waterResultSummary, waterSummaryTitle } from '../lib/water-result-summary.ts';

const reading = (result, limit, reference = null, unit = 'µg/L') => ({ resultat_alphanumerique: result, resultat_numerique: 0, limite_qualite_parametre: limit, reference_qualite_parametre: reference, libelle_unite: unit });
test('compares published bounds without mistaking censored numeric zero for a measured zero', () => {
  for (const [result, limit, expected] of [
    ['0,03','<=0,1 µg/L','within'],['0.1','<=0.1 µg/L','within'],['0.1','<0.1 µg/L','outside'],['0.2','<=0.1 µg/L','outside'],
    ['<0,01','<=0,1 µg/L','within'],['<0.1','<0.1 µg/L','within'],['<=0.1','<0.1 µg/L','unknown'],['<1','<=0.1 µg/L','unknown'],
    ['>0.1','<=0.1 µg/L','outside'],['>=0.1','<=0.1 µg/L','unknown'],['>0.01','<=0.1 µg/L','unknown'],
    ['0','>=0 µg/L','within'],['0','>0 µg/L','outside'],['<0.1','>=0.1 µg/L','outside'],
    ['1e-3','≤0,1 µg/L','within'],
  ]) assert.equal(assessDrinkingResult(reading(result,limit)),expected,`${result} vs ${limit}`);
});
test('ranges and simultaneous limits/references must all be satisfied', () => {
  assert.equal(assessDrinkingResult(reading('7,5',null,'>=6,5 et <=9 unité pH','unité pH')),'within');
  assert.equal(assessDrinkingResult(reading('6',null,'>=6,5 et <=9 unité pH','unité pH')),'outside');
  assert.equal(assessDrinkingResult(reading('<8',null,'>=6,5 et <=9 unité pH','unité pH')),'unknown');
  assert.equal(assessDrinkingResult(reading('2','<=10 µg/L','<=1 µg/L')),'outside');
  assert.equal(assessDrinkingResult(reading('2','<=10 µg/L','Condition textuelle')),'unknown');
  assert.equal(assessDrinkingResult(reading('2','<=1 µg/L','Condition textuelle')),'outside');
});
test('missing or ambiguous references, units and qualitative results are not favorable', () => {
  for (const row of [reading('0',null),reading('0','0.1 µg/L'),reading('0','<=0.1'),reading('0','<=0.1 mg/L'),reading('Absence','<=0 µg/L'),reading('', '<=0.1 µg/L'),reading('0','>=10 et <=1 µg/L'),reading('0','<=0.1 µg/L sous condition'),reading('NaN','<=0.1 µg/L')]) {
    assert.equal(assessDrinkingResult(row),'unknown');
  }
});
test('latest sample excludes earlier dates and other samples at the same time', () => {
  const rows=[{date:'2020-01-01',id:'z'},{date:'2026-01-01',id:'a'},{date:'2026-01-01',id:'b'},{date:'2026-01-01',id:'b'},{date:'invalid',id:'z'}];
  assert.deepEqual(latestWaterSample(rows,r=>r.date,r=>r.id),{date:'2026-01-01',rows:[rows[2],rows[3]]});
});
test('groundwater qualification and detection limits do not become quality limits', () => {
  const result=groundwaterResultSummary([
    {date:'2020-01-01',value:999,qualification:'Correcte'},
    {date:'2025-04-14T09:07:00Z',parameter:'5979',value:0.001,remarkCode:1,qualification:'Correcte'},
    {date:'2025-04-14T09:07:00Z',parameter:'5980',value:0.002,remarkCode:2,qualification:'Correcte'},
  ]);
  assert.deepEqual(result,{date:'2025-04-14T09:07:00Z',total:2,within:0,outside:0,unknown:2,incomplete:false});
});
test('drinking summary counts one identified analysis despite duplicate commune rows', () => {
  const base={date_prelevement:'2026-01-02',code_prelevement:'sample',reference_analyse:'ref'};
  const good={...base,...reading('0.1','<=1 µg/L'),code_parametre:'one'};
  const bad={...base,...reading('2','<=1 µg/L'),code_parametre:'two'};
  const unknown={...base,...reading('<10','<=1 µg/L'),code_parametre:'three'};
  const result=waterResultSummary([good,{...good,nom_commune:'Another commune'},bad,unknown,{...good,date_prelevement:'2020-01-01'}],'drinking');
  assert.deepEqual(result,{date:'2026-01-02',total:3,within:1,outside:1,unknown:1,incomplete:false});
  assert.equal(waterSummaryTitle(result),'1 résultat hors des repères');
  assert.equal(waterResultSummary([good,bad],'rivers').unknown,2);
});
test('empty, invalid dates and incomplete archives never claim a clean bill of health', () => {
  assert.equal(waterSummaryTitle(groundwaterResultSummary([])),'Aucune analyse disponible');
  assert.equal(waterSummaryTitle(groundwaterResultSummary([{date:'invalid'}])),'Prélèvement non identifiable');
  const partial=groundwaterResultSummary([{date:'2025-01-01'}],true);
  assert.equal(waterSummaryTitle(partial),'Synthèse partielle du dernier prélèvement');
  assert.equal(waterSummaryTitle({...partial,incomplete:false,within:0}),'Résultats sans classement de qualité');
});
