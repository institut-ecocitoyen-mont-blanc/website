// Throwaway preview builder: verified public archives, not production import code.
// Run: node src/atlas/prototypes/build-history-prototype.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const base = 'https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data';
const sites = [
  { key: 'groundwater-bss001twsy', title: 'Forage · BSS001TWSY', place: 'Praz-sur-Arly', source: 'Eaux souterraines · Hub’Eau · ADES', kind: 'groundwater' },
  { key: 'drinking-074001337', title: 'Réseau Sud de Cordon', place: 'Cordon · 074001337', source: 'Eau potable · Hub’Eau · SISE-Eaux', kind: 'drinking' },
  { key: 'river-06061475', title: 'L’Ugine à Passy', place: 'Passy · station 06061475', source: 'Cours d’eau · Hub’Eau · Naïades', kind: 'river' },
];
async function json(path) {
  const r = await fetch(`${base}/${path}`);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}
const manifest = await json('manifest.json');
for (const site of sites) {
  const snapshot = await json(`data/${site.key}.json`);
  const rows = [];
  if (!snapshot.archive?.complete) throw new Error('Complete archive required');
  for (const part of snapshot.archive.parts) {
    const r = await fetch(`${base}/${part.path}`);
    if (!r.ok) throw new Error(`${part.path}: ${r.status}`);
    const bytes = Buffer.from(await r.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== part.hash) throw new Error('Invalid archive hash');
    const chunk = JSON.parse(gunzipSync(bytes));
    if (chunk.length !== part.count) throw new Error('Invalid archive count');
    rows.push(...chunk);
  }
  if (rows.length !== snapshot.archive.count) throw new Error('Incomplete archive');
  site.archiveCount = rows.length;
  site.importedAt = manifest.datasets[site.key]?.lastSuccessAt;
  site.url = `${base}/data/${site.key}.json`;
  const groups = new Map();
  for (const row of rows) {
    const ground = site.kind === 'groundwater', drink = site.kind === 'drinking';
    const code = String(ground ? row.parameter : row.code_parametre);
    const name = ground ? row.name : row.libelle_parametre;
    const unit = (ground ? row.unit : drink ? row.libelle_unite : row.symbole_unite) || '';
    // Never combine different fractions, supports, or laboratory/in-situ contexts.
    const fraction = (ground ? row.fraction : drink ? 'Eau distribuée' : row.libelle_fraction) || '';
    const context = drink ? row.code_lieu_analyse : ground ? '' : row.libelle_insitu || '';
    const key = JSON.stringify([code, unit, fraction, context, row.code_support || '']);
    const date = ground ? row.date : row.date_prelevement;
    if (!Number.isFinite(Date.parse(date))) continue;
    let value = ground ? row.value : drink ? row.resultat_numerique : row.resultat;
    let qualifier = '=';
    if (drink) {
      const match = String(row.resultat_alphanumerique ?? '').trim().replace(',', '.').match(/^([<>≤≥]=?)?\s*(-?\d+(?:\.\d+)?)$/);
      if (match) { qualifier = match[1] || '='; value = Number(match[2]); }
      else qualifier = '?';
    } else {
      const remark = Number(ground ? row.remarkCode : row.code_remarque);
      qualifier = remark === 1 ? '=' : [2, 7, 9, 10].includes(remark) ? '<' : [3, 8].includes(remark) ? '>' : '?';
    }
    const status = ground ? `${row.qualification} · ${row.status}` : drink ? 'Résultat publié · SISE-Eaux' : `${row.libelle_qualification || ''} · ${row.mnemo_statut || ''}`;
    if (!drink && /incorrect|douteu|non qualifi/i.test(status)) qualifier = '?';
    if (typeof value !== 'number' || !Number.isFinite(value)) { value = null; qualifier = '?'; }
    if (!groups.has(key)) groups.set(key, { code, name, unit, fraction, context, points: [] });
    const point = { date, value, qualifier, status, text: drink ? row.resultat_alphanumerique : null, reference: drink ? [row.limite_qualite_parametre, row.reference_qualite_parametre].filter(Boolean).join(' · ') : '', remark: ground ? row.remark : row.mnemo_remarque || '' };
    groups.get(key).points.push(point);
  }
  const priority = ['1340', '1302', '1303', '1295', '1301', '5980', '5979', '8847'];
  site.series = [...groups.values()].filter(g => priority.includes(g.code)).sort((a,b) => priority.indexOf(a.code) - priority.indexOf(b.code) || b.points.length - a.points.length);
  if (!site.series.length) site.series = [...groups.values()].sort((a,b) => b.points.length - a.points.length).slice(0,6);
  for (const series of site.series) series.points.sort((a,b) => Date.parse(a.date) - Date.parse(b.date));
  console.log(site.title, rows.length, 'archived rows;', site.series.map(g => `${g.name} (${g.points.length})`).join(', '));
}
const data = { retrievedAt: new Date().toISOString(), sites };
const template = await readFile(new URL('./history.template.html', import.meta.url), 'utf8');
await writeFile(new URL('./history.prototype.html', import.meta.url), template.replace('__EMBEDDED_DATA__', JSON.stringify(data).replaceAll('<', '\\u003c')));
