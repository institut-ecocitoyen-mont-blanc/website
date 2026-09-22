"use client";

import { useState } from "react";
import { divIcon } from "leaflet";
import { Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog from "./AtlasDetailDialog";
import { SOIL_DEMO_SITES, SOIL_DEMO_BANDS, soilDemoBand, type SoilDemoSite } from "@/atlas/lib/soil-demo";
import { INSTITUTE_DEMO_SOURCE, INSTITUTE_DEMO_NOTICE } from "@/atlas/lib/institute-demo";
import InstituteReport from "./InstituteReport";
import { soilInstituteReport } from "@/atlas/lib/institute-report";

const icons = new Map<string, ReturnType<typeof divIcon>>();
function soilPin(index: number) {
  const color = soilDemoBand(index).color;
  if (!icons.has(color)) icons.set(color, divIcon({ className: "soil-demo-pin", iconSize: [36, 46], iconAnchor: [18, 44],
    html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44C14 37 2 27 2 18a16 16 0 1 1 32 0c0 9-12 19-16 26Z" fill="${color}" stroke="white" stroke-width="2"/><g transform="translate(7 6) scale(.92)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v3a3 3 0 0 1-6 0ZM12 8v6M7 14h10v3c0 3-5 5-5 5s-5-2-5-5ZM2 20h3m14 0h3"/></g></svg>` }));
  return icons.get(color)!;
}

export function useSoilDemoLayer() {
  const [enabled, setEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.9);
  const [selected, setSelected] = useState<SoilDemoSite | null>(null);
  const controls = <section className={`rounded-xl border p-3 ${enabled ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
    <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span><span className="block font-semibold text-sm text-slate-900">Cultures potagères/maraîchères</span><span className="block text-xs text-slate-500 mt-1">{INSTITUTE_DEMO_SOURCE}</span></span></label>
    {enabled && <div className="mt-3 space-y-3 text-xs text-slate-600">
      <p>{SOIL_DEMO_SITES.length} sites fictifs : jardins potagers et parcelles maraîchères simulés. Analyses des sols cultivés. Métaux, hydrocarbures et pesticides.</p>
      <label className="flex items-center gap-2">Opacité<input aria-label="Opacité · Cultures potagères/maraîchères" className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><span>{Math.round(opacity * 100)} %</span></label>
      <p className="font-semibold">Intensité de contamination fictive · 0–100</p>
      <div className="flex flex-wrap gap-2">{SOIL_DEMO_BANDS.map((band) => <span key={band.label} className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: band.color }} />{band.label}</span>)}</div>
      <p>{INSTITUTE_DEMO_NOTICE}</p><p>Emplacements et valeurs inventés. Les couleurs ne déterminent pas si un sol est sûr.</p>
    </div>}
  </section>;
  const markers = enabled && SOIL_DEMO_SITES.map((site) => <AtlasMarker key={site.id} position={[site.lat, site.lng]} icon={soilPin(site.index)} opacity={opacity} title={`Cultures potagères/maraîchères · ${site.name} · Démonstration`} attribution={INSTITUTE_DEMO_SOURCE} onSelect={() => setSelected(site)}>
    <Tooltip>{site.name}<br />Contamination simulée : {site.index}/100 · {soilDemoBand(site.index).label}</Tooltip>
  </AtlasMarker>);
  const details = selected && <AtlasDetailDialog kind="soil" title={selected.name} subtitle={`${selected.commune} · ${INSTITUTE_DEMO_SOURCE}`} onClose={() => setSelected(null)}>
    <InstituteReport report={soilInstituteReport(selected)} />
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled) };
}
