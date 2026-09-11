"use client";

import { useState } from "react";
import { Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog from "./AtlasDetailDialog";
import EvidenceLayerControl from "./EvidenceLayerControl";
import { environmentalPin } from "./EnvironmentalPin";
import { INSTITUTE_DEMO_SOURCE, INSTITUTE_DEMO_NOTICE } from "@/lib/institute-demo";
import { INSTITUTE_WATER_LAYERS, INSTITUTE_WATER_SITES, type InstituteWaterKind, type InstituteWaterSite } from "@/lib/institute-water-demo";
import InstituteReport from "./InstituteReport";
import { waterInstituteReport } from "@/lib/institute-report";

export function useInstituteWaterDemo() {
  const [enabled, setEnabled] = useState<Record<InstituteWaterKind, boolean>>({ bathing: true, rivers: true });
  const [opacity, setOpacity] = useState<Record<InstituteWaterKind, number>>({ bathing: 0.9, rivers: 0.9 });
  const [selected, setSelected] = useState<InstituteWaterSite | null>(null);
  const controls = INSTITUTE_WATER_LAYERS.map((layer) => <EvidenceLayerControl key={layer.id} title={layer.title} source={INSTITUTE_DEMO_SOURCE} enabled={enabled[layer.id]} onEnabled={(value) => setEnabled((prev) => ({ ...prev, [layer.id]: value }))} opacity={opacity[layer.id]} onOpacity={(value) => setOpacity((prev) => ({ ...prev, [layer.id]: value }))}>
    <p>{layer.description}</p>
    <p>{INSTITUTE_WATER_SITES.filter((site) => site.kind === layer.id).length} points de démonstration · aucune mesure réelle.</p>
    <p>{INSTITUTE_DEMO_NOTICE}</p>
    <p>Vert, orange et rouge : scénarios illustratifs, sans classement sanitaire ou écologique.</p>
  </EvidenceLayerControl>);
  const markers = INSTITUTE_WATER_SITES.filter((site) => enabled[site.kind]).map((site) => <AtlasMarker key={site.id} position={[site.lat, site.lng]} icon={environmentalPin(site.kind, site.level)} opacity={opacity[site.kind]} title={`Institut · ${site.kind === "bathing" ? "Eaux de baignade" : "Cours d’eau"} · ${site.name} · Données fictives`} attribution={INSTITUTE_DEMO_SOURCE} onSelect={() => setSelected(site)}>
    <Tooltip>{site.name}<br />{INSTITUTE_DEMO_SOURCE}</Tooltip>
  </AtlasMarker>);
  const details = selected && <AtlasDetailDialog kind={selected.kind === "bathing" ? "institute-bathing" : "institute-rivers"} title={selected.name} subtitle={`${selected.commune} · ${INSTITUTE_DEMO_SOURCE}`} onClose={() => setSelected(null)}>
    <InstituteReport report={waterInstituteReport(selected)} />
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled.bathing) + Number(enabled.rivers) };
}
