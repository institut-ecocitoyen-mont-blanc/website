import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoryValue, groundwaterHistory, waterHistory, bathingHistory, airHistory, historySegments, historyMatches } from '../lib/history-series.ts';

test('censored and qualitative values never become exact numeric zeros', () => {
  for (const [value, number, qualifier] of [['<0,01', .01, '<'], ['≤ 2', 2, '<='], ['>1e-3', .001, '>'], ['0', 0, '='], [null, null, '?'], ['Absence', null, '?'], ['NaN', null, '?']]) {
    const p = parseHistoryValue(value);
    assert.equal(p.value, number); assert.equal(p.qualifier, qualifier);
  }
});
const g = (date, value, extra = {}) => ({ date, value, parameter: '1340', name: 'Nitrates', unit: 'mg/L', fraction: 'Eau brute', remarkCode: 1, qualification: 'Correcte', status: 'Contrôlée', remark: '', ...extra });
test('groundwater histories sort all results and separate units/fractions', () => {
  const series = groundwaterHistory([g('2025-01-01', 3), g('2000-01-01', 1), g('2010-01-01', 2), g('2025-01-01', 3000, {unit:'µg/L'}), g('2025-01-01', 2, {fraction:'Autre'}), g('bad', 4)]);
  assert.equal(series.length, 3);
  assert.deepEqual(series.find(s=>s.points.length===3).points.map(p=>p.value), [1,2,3]);
});
test('remark codes and invalid qualifications preserve gaps', () => {
  const [s] = groundwaterHistory([g('2025-01-01', 0),g('2025-01-02', .01,{remarkCode:2}),g('2025-01-03',2,{remarkCode:4}),g('2025-01-04',9,{qualification:'Incorrecte'})]);
  assert.deepEqual(s.points.map(p=>p.qualifier), ['=','<','?','?']);
  assert.deepEqual(historySegments(s).map(s=>s.length),[1]);
});
test('drinking uses the qualified text, not the provider numeric placeholder; joins deduplicate', () => {
  const row={code_parametre:'1',libelle_parametre:'Example',date_prelevement:'2025-01-01',libelle_unite:'µg/L',resultat_alphanumerique:'<0,01',resultat_numerique:0,reference_analyse:'a',code_lieu_analyse:'L'};
  const series=waterHistory([row,{...row,nom_commune:'Other'}, {...row,code_lieu_analyse:'T'}], 'drinking');
  assert.equal(series.length,2);
  assert.equal(series[0].points.length,1);
  assert.equal(series[0].points[0].value,.01);
  assert.equal(series[0].points[0].qualifier,'<');
});
test('rivers separate supports and fractions and respect remark codes', () => {
  const row={code_parametre:'1',date_prelevement:'2024-01-01',resultat:1,code_remarque:'2',symbole_unite:'µg/L',code_support:'3',code_fraction:'23'};
  const series=waterHistory([row,{...row,code_support:'6'},{...row,code_fraction:'24'}], 'rivers');
  assert.equal(series.length,3); assert.ok(series.every(s=>s.points[0].qualifier==='<'));
});
test('bathing keeps both series, missing results and single samples', () => {
  const series=bathingHistory([{date:'2025-01-01',ecoli:'<15',enterococci:null,assessment:'Bon'}]);
  assert.equal(series.length,2);
  assert.equal(series.find(s=>s.code==='ecoli').points[0].value,15);
  assert.equal(series.find(s=>s.code==='enterococci').points[0].value,null);
});
test('air units and periods stay separate; invalid and missing hours break lines', () => {
  const readings=[0,1,2,6].map((hour)=>({time:hour*3600000,value:hour,unit:'µg/m³',validity:1,validation:'A'}));
  const [s]=airHistory(readings,{code:'pm10',name:'PM10',context:'Horaire',cadence:'hourly',national:true});
  assert.deepEqual(historySegments(s).map(s=>s.length),[3,1]);
  const [invalid]=airHistory([{...readings[0],validity:-1}],{code:'pm10',name:'PM10',context:'Horaire',national:true});
  assert.equal(invalid.points[0].value,null);
  const usable=airHistory([{...readings[0],validity:3},{...readings[1],validity:4}],{code:'bap',name:'BaP',context:'Prélèvements',national:true});
  assert.deepEqual(usable[0].points.map(p=>p.value),[0,1]);
  assert.equal(airHistory([{...readings[0],validity:undefined}],{code:'pm10',name:'PM10',context:'Horaire',national:true})[0].points[0].value,null);
  assert.equal(airHistory([...readings,{...readings[0],unit:'ng/m³'}],{code:'pm10',name:'PM10',context:'Horaire'}).length,2);
});
test('daily lines break across missing days; regional nulls break hourly lines', () => {
  const daily=[0,1,3].map(day=>({time:day*86400000,value:day,unit:'µg/m³',validation:null}));
  assert.deepEqual(historySegments(airHistory(daily,{code:'pm10',name:'PM10',context:'Journalier',cadence:'daily'})[0]).map(s=>s.length),[2,1]);
  const hourly=[0,1,2,4,5].map(hour=>({time:hour*3600000,value:hour===1?null:hour,unit:'µg/m³',validation:null}));
  assert.deepEqual(historySegments(airHistory(hourly,{code:'pm10',name:'PM10',context:'Horaire',cadence:'hourly'})[0]).map(s=>s.length),[1,1,2]);
});
test('no line connects same-time analyses; PFAS aliases are searchable', () => {
  const [s]=groundwaterHistory([g('2025-01-01',1),g('2025-01-01',2)]);
  assert.deepEqual(historySegments(s).map(s=>s.length),[1,1]);
  assert.equal(historyMatches({...s,code:'5980',name:'Acide perfluorobutanoïque'},'PFBA'),true);
  assert.equal(historyMatches({...s,code:'5980'},'PFAS'),true);
});
