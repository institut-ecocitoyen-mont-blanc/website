// Throwaway preview builder: verified public archives, not production import code.
// Parsing is shared with the atlas (lib/history-series.ts); only the template's data shape is mapped here.
// Run: node --experimental-strip-types src/atlas/prototypes/build-history-prototype.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { groundwaterHistory, waterHistory } from '../lib/history-series.ts';
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
  const history = site.kind === 'groundwater' ? groundwaterHistory(rows) : waterHistory(rows, site.kind === 'drinking' ? 'drinking' : 'rivers');
  const groups = history.map(({ code, name, unit, context, points }) => ({ code, name, unit, fraction: context, context: '',
    points: points.map(p => ({ date: new Date(p.time).toISOString(), value: p.value, qualifier: p.qualifier, status: p.status, text: p.label, reference: p.reference || '', remark: '' })) }));
  const priority = ['1340', '1302', '1303', '1295', '1301', '5980', '5979', '8847'];
  site.series = groups.filter(g => priority.includes(g.code)).sort((a,b) => priority.indexOf(a.code) - priority.indexOf(b.code) || b.points.length - a.points.length);
  if (!site.series.length) site.series = [...groups].sort((a,b) => b.points.length - a.points.length).slice(0,6);
  console.log(site.title, rows.length, 'archived rows;', site.series.map(g => `${g.name} (${g.points.length})`).join(', '));
}
const data = { retrievedAt: new Date().toISOString(), sites };
const template = await readFile(new URL('./history.template.html', import.meta.url), 'utf8');
await writeFile(new URL('./history.prototype.html', import.meta.url), template.replace('__EMBEDDED_DATA__', JSON.stringify(data).replaceAll('<', '\\u003c')));
