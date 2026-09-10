"use client";

import { useState } from "react";
import { divIcon } from "leaflet";
import { Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { SOIL_DEMO_SITES, SOIL_DEMO_BANDS, soilDemoBand, type SoilDemoSite } from "@/lib/soil-demo";
import styles from "./AtlasDetails.module.css";

const icons = new Map<string, ReturnType<typeof divIcon>>();
function soilPin(index: number) {
  const color = soilDemoBand(index).color;
  if (!icons.has(color)) icons.set(color, divIcon({ className: "soil-demo-pin", iconSize: [36, 46], iconAnchor: [18, 44],
    html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44C14 37 2 27 2 18a16 16 0 1 1 32 0c0 9-12 19-16 26Z" fill="${color}" stroke="white" stroke-width="2"/><g transform="translate(7 6) scale(.92)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v3a3 3 0 0 1-6 0ZM12 8v6M7 14h10v3c0 3-5 5-5 5s-5-2-5-5ZM2 20h3m14 0h3"/></g></svg>` }));
  return icons.get(color)!;
}
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export function useSoilDemoLayer() {
  const [enabled, setEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.9);
  const [selected, setSelected] = useState<SoilDemoSite | null>(null);
  const controls = <section className={`rounded-xl border p-3 ${enabled ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
    <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span><span className="block font-semibold text-sm text-slate-900">Analyses de sols</span><span className="block text-xs text-slate-500 mt-1">Démonstration · données fictives</span></span></label>
    {enabled && <div className="mt-3 space-y-3 text-xs text-slate-600">
      <p>{SOIL_DEMO_SITES.length} sites fictifs : jardins, terrains agricoles et espaces urbains simulés. Métaux, hydrocarbures et pesticides.</p>
      <label className="flex items-center gap-2">Opacité<input aria-label="Opacité · Analyses de sols" className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><span>{Math.round(opacity * 100)} %</span></label>
      <p className="font-semibold">Intensité de contamination fictive · 0–100</p>
      <div className="flex flex-wrap gap-2">{SOIL_DEMO_BANDS.map((band) => <span key={band.label} className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: band.color }} />{band.label}</span>)}</div>
      <p>Emplacements et valeurs inventés. Les couleurs ne déterminent pas si un sol est sûr.</p>
    </div>}
  </section>;
  const markers = enabled && SOIL_DEMO_SITES.map((site) => <AtlasMarker key={site.id} position={[site.lat, site.lng]} icon={soilPin(site.index)} opacity={opacity} title={`Analyses de sols · ${site.name} · Démonstration`} attribution="Analyses de sols · données fictives" onSelect={() => setSelected(site)}>
    <Tooltip>{site.name}<br />Contamination simulée : {site.index}/100 · {soilDemoBand(site.index).label}</Tooltip>
  </AtlasMarker>);
  const details = selected && <AtlasDetailDialog kind="soil" title={selected.name} subtitle={`${selected.commune} · Site fictif · Démonstration`} onClose={() => setSelected(null)}>
    <p className={styles.notice}>Données entièrement simulées : aucun prélèvement réel. Les coordonnées, usages des terrains, dates et valeurs sont inventés et ne décrivent pas les parcelles situées à ces emplacements.</p>
    <DetailSection title="Intensité de contamination fictive"><div className="rounded-xl border bg-white p-5" style={{ borderLeft: `6px solid ${soilDemoBand(selected.index).color}` }}><p className="text-3xl font-semibold">{selected.index}<span className="text-lg text-slate-500"> / 100</span></p><p className="mt-2">{soilDemoBand(selected.index).label} · indice illustratif, sans unité</p><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${selected.index}%`, background: soilDemoBand(selected.index).color }} /></div></div></DetailSection>
    <DetailFacts items={[{ label: "Scénario de terrain", value: selected.setting }, { label: "Prélèvement fictif", value: dateLabel(selected.date) }, { label: "Profondeur simulée", value: `${selected.depth[0]}–${selected.depth[1]} cm` }, { label: "Échantillon fictif", value: selected.id }]} />
    <DetailSection title="Résultats simulés" description="Toutes les valeurs ci-dessous sont inventées. MS : matière sèche.">
      <div className="grid gap-3 sm:grid-cols-2">{selected.readings.map((reading) => <div key={reading.name} className="rounded-xl border bg-white p-5"><p className="text-xs text-blue-iec mb-1">{reading.family} · simulation</p><p className="text-sm text-slate-600">{reading.name}</p><p className="mt-3 text-2xl font-semibold">{reading.value.toLocaleString("fr-FR")} <span className="text-sm font-normal text-slate-500">{reading.unit}</span></p></div>)}</div>
    </DetailSection>
    <DetailSection title="Lire cette démonstration"><p className="text-sm text-slate-600">L’indice et les couleurs sont choisis pour illustrer différents profils, sans calcul scientifique ni seuil réglementaire. Un point vert ne signifie pas que le sol est sûr ; un point rouge ne signale pas une pollution réelle. Ces données ne permettent aucune conclusion sur le jardinage, l’agriculture, la santé ou l’origine d’une contamination.</p></DetailSection>
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled) };
}
