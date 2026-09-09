"use client";

import { useState } from "react";
import { divIcon } from "leaflet";
import { Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { BIO_DEMO_LAYERS, BIO_DEMO_SITES, BIO_DEMO_BANDS, bioDemoBand, type BioDemoKind, type BioDemoSite } from "@/lib/bio-monitoring-demo";
import styles from "./AtlasDetails.module.css";

const paths = {
  lichens: '<path d="M20 3C10 2 3 6 4 13c1 8 12 8 15 0 1-3 1-6 1-10ZM3 22 16 8M8 17v-5m0 5h5"/>',
  bioacc: '<path d="M9 2h6M10 2v7L4 19q-1 3 3 3h10q4 0 3-3L14 9V2M7 15h10"/><circle cx="10" cy="18" r="1"/>',
};
const pins = new Map<string, ReturnType<typeof divIcon>>();
function demoPin(site: BioDemoSite) {
  const color = bioDemoBand(site.index).color, key = `${site.kind}-${color}`;
  if (!pins.has(key)) pins.set(key, divIcon({ className: `bio-demo-pin ${site.kind}-demo-pin`, iconSize: [36, 46], iconAnchor: [18, 44],
    html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44C14 37 2 27 2 18a16 16 0 1 1 32 0c0 9-12 19-16 26Z" fill="${color}" stroke="white" stroke-width="2"/><g transform="translate(7 6) scale(.92)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[site.kind]}</g></svg>` }));
  return pins.get(key)!;
}

// Kept self-contained so these local demo layers do not enter provider loaders
// or interfere with the independently evolving road-traffic layer.
export function useBioMonitoringDemo() {
  const [enabled, setEnabled] = useState<Record<BioDemoKind, boolean>>({ lichens: false, bioacc: false });
  const [opacity, setOpacity] = useState<Record<BioDemoKind, number>>({ lichens: 0.9, bioacc: 0.9 });
  const [selected, setSelected] = useState<BioDemoSite | null>(null);
  const controls = BIO_DEMO_LAYERS.map((layer) => <section key={layer.id} className={`rounded-xl border p-3 ${enabled[layer.id] ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
    <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled[layer.id]} onChange={(event) => setEnabled((prev) => ({ ...prev, [layer.id]: event.target.checked }))} /><span><span className="block font-semibold text-sm text-slate-900">{layer.title}</span><span className="block text-xs text-slate-500 mt-1">Démonstration · données fictives</span></span></label>
    {enabled[layer.id] && <div className="mt-3 space-y-3 text-xs text-slate-600"><p>{layer.description}</p>
      <label className="flex items-center gap-2">Opacité<input aria-label={`Opacité · ${layer.title}`} className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacity[layer.id]} onChange={(event) => setOpacity((prev) => ({ ...prev, [layer.id]: Number(event.target.value) }))} /><span>{Math.round(opacity[layer.id] * 100)} %</span></label>
      <p>{BIO_DEMO_SITES[layer.id].length} sites · aucune mesure réelle</p><p className="font-semibold">Intensité fictive · indice illustratif 0–100</p>
      <div className="flex flex-wrap gap-2">{BIO_DEMO_BANDS.map((band) => <span key={band.label} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: band.color }} />{band.label}</span>)}</div>
      <p>Couleurs de démonstration, sans seuil sanitaire ni conclusion sur la qualité de l’air.</p>
    </div>}
  </section>);
  const markers = BIO_DEMO_LAYERS.flatMap((layer) => enabled[layer.id] ? BIO_DEMO_SITES[layer.id].map((site) => <AtlasMarker key={site.id} position={[site.lat, site.lng]} icon={demoPin(site)} opacity={opacity[layer.id]} title={`${layer.title} · ${site.name} · Démonstration`} attribution="Prototype fourni · données fictives" onSelect={() => setSelected(site)}>
    <Tooltip>{site.name} · {layer.title}<br />Simulation : {site.index}/100 · {bioDemoBand(site.index).label}</Tooltip>
  </AtlasMarker>) : []);
  const details = selected && <AtlasDetailDialog kind={selected.kind} title={selected.name} subtitle={`${selected.commune} · Démonstration · données fictives`} onClose={() => setSelected(null)}>
    <p className={styles.notice}>Démonstration uniquement : les valeurs sont inventées. Les emplacements proviennent du prototype fourni et ne constituent pas un réseau de surveillance vérifié.</p>
    <DetailSection title="Intensité simulée"><div className="rounded-xl border bg-white p-5" style={{ borderLeft: `6px solid ${bioDemoBand(selected.index).color}` }}><p className="text-3xl font-semibold">{selected.index}<span className="text-lg text-slate-500"> / 100</span></p><p className="mt-2">{bioDemoBand(selected.index).label} · indice fictif, sans unité</p><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${selected.index}%`, background: bioDemoBand(selected.index).color }} /></div></div></DetailSection>
    <DetailFacts items={[{ label: "Commune", value: selected.commune }, { label: "Site du prototype", value: selected.id }, { label: "Campagne", value: "Scénario de démonstration · non daté" }]} />
    <DetailSection title="Observations fictives" description="Exemples de présentation, pas des résultats d’analyse."><div className="grid gap-3 sm:grid-cols-2">{selected.readings.map((r) => <div key={r.label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-600">{r.label}</p><p className="mt-3 text-2xl font-semibold">{r.value} <span className="text-sm font-normal">{r.unit}</span></p></div>)}</div></DetailSection>
    <DetailSection title="À propos de cette couche"><p className="text-sm text-slate-600">{selected.kind === "lichens" ? "Maquette de suivi lichénique. Les exemples d’espèces et de recouvrement ne servent pas à calculer l’indice fictif : aucun protocole scientifique n’est appliqué." : "Intitulé repris du prototype. Les retombées atmosphériques et la bio-accumulation ne sont pas assimilées ici à une mesure scientifique : les deux indicateurs sont entièrement simulés."} Aucun seuil de conformité, lien avec une installation voisine ou tendance réelle ne peut en être déduit.</p></DetailSection>
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled.lichens) + Number(enabled.bioacc) };
}
