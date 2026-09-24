"use client";

import { useState } from "react";
import { createPinIcon } from "@/components/map/pin-icon";
import { Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog from "./AtlasDetailDialog";
import { BIO_DEMO_LAYERS, BIO_DEMO_SITES, BIO_DEMO_BANDS, bioDemoBand, type BioDemoKind, type BioDemoSite } from "@/atlas/lib/bio-monitoring-demo";
import { INSTITUTE_DEMO_SOURCE, INSTITUTE_DEMO_NOTICE } from "@/atlas/lib/institute-demo";
import InstituteReport from "./InstituteReport";
import { bioInstituteReport } from "@/atlas/lib/institute-report";

const paths = {
  lichens: '<path d="M20 3C10 2 3 6 4 13c1 8 12 8 15 0 1-3 1-6 1-10ZM3 22 16 8M8 17v-5m0 5h5"/>',
  bioacc: '<path d="M9 2h6M10 2v7L4 19q-1 3 3 3h10q4 0 3-3L14 9V2M7 15h10"/><circle cx="10" cy="18" r="1"/>',
};
const pins = new Map<string, ReturnType<typeof createPinIcon>>();
function demoPin(site: BioDemoSite) {
  const color = bioDemoBand(site.index).color, key = `${site.kind}-${color}`;
  if (!pins.has(key)) pins.set(key, createPinIcon({ className: `bio-demo-pin ${site.kind}-demo-pin`, fill: color, glyph: paths[site.kind] }));
  return pins.get(key)!;
}

// Kept self-contained so these local demo layers do not enter provider loaders
// or interfere with the independently evolving road-traffic layer.
export function useBioMonitoringDemo() {
  const [enabled, setEnabled] = useState<Record<BioDemoKind, boolean>>({ lichens: false, bioacc: false });
  const [selected, setSelected] = useState<BioDemoSite | null>(null);
  const controls = BIO_DEMO_LAYERS.map((layer) => <section key={layer.id} className={`rounded-xl border p-3 ${enabled[layer.id] ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
    <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled[layer.id]} onChange={(event) => setEnabled((prev) => ({ ...prev, [layer.id]: event.target.checked }))} /><span><span className="block font-semibold text-sm text-slate-900">{layer.title}</span><span className="block text-xs text-slate-500 mt-1">{INSTITUTE_DEMO_SOURCE}</span></span></label>
    {enabled[layer.id] && <div className="mt-3 space-y-3 text-xs text-slate-600"><p>{layer.description}</p><p>{INSTITUTE_DEMO_NOTICE}</p>
      <p>{BIO_DEMO_SITES[layer.id].length} sites · aucune mesure réelle</p><p className="font-semibold">Intensité fictive · indice illustratif 0–100</p>
      <div className="flex flex-wrap gap-2">{BIO_DEMO_BANDS.map((band) => <span key={band.label} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: band.color }} />{band.label}</span>)}</div>
      <p>Couleurs de démonstration, sans seuil sanitaire ni conclusion sur la qualité de l’air.</p>
    </div>}
  </section>);
  const markers = BIO_DEMO_LAYERS.flatMap((layer) => enabled[layer.id] ? BIO_DEMO_SITES[layer.id].map((site) => <AtlasMarker key={site.id} position={[site.lat, site.lng]} icon={demoPin(site)} opacity={0.9} title={`${layer.title} · ${site.name} · Démonstration`} attribution={INSTITUTE_DEMO_SOURCE} onSelect={() => setSelected(site)}>
    <Tooltip>{site.name} · {layer.title}<br />Simulation : {site.index}/100 · {bioDemoBand(site.index).label}</Tooltip>
  </AtlasMarker>) : []);
  const details = selected && <AtlasDetailDialog kind={selected.kind} title={selected.name} subtitle={`${selected.commune} · ${INSTITUTE_DEMO_SOURCE}`} onClose={() => setSelected(null)}>
    <InstituteReport report={bioInstituteReport(selected)} />
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled.lichens) + Number(enabled.bioacc) };
}
