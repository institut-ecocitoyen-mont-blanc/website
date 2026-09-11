"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Tooltip, ScaleControl, useMap } from "react-leaflet";
import Marker from "@/components/AtlasMarker";
import { LocateFixed, ExternalLink, MapPin, Wind, Droplets, Shovel } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { createCustomIcon } from "@/components/Map";
import AtlasDetailDialog from "@/components/AtlasDetailDialog";
import AtlasWaterDetails from "@/components/AtlasWaterDetails";
import AtlasDrinkingDetails from "@/components/AtlasDrinkingDetails";
import AtlasBathingDetails from "@/components/AtlasBathingDetails";
import { bathingQuality, bathingSamples, type BathingData, type BathingPoint } from "@/lib/bathing-water";
import AtlasInventoryDetails from "@/components/AtlasInventoryDetails";
import { environmentalPin } from "@/components/EnvironmentalPin";
import { useDrinkingQuality } from "@/components/WaterQuality";
import { unknownQuality } from "@/lib/environmental-quality";
import { riverQuality, type RiverAssessments } from "@/lib/river-assessments";
import type { RiverCatalogue } from "@/lib/river-catalogue";
import { useAtmoStations, AtmoControls, AtmoMarkers, AtmoDetails } from "@/components/AtmoStations";
import { combineAirStations } from "@/lib/atmo-stations";
import WoodHeatingLayer from "@/components/WoodHeatingLayer";
import { useBioMonitoringDemo } from "@/components/BioMonitoringDemo";
import { useSoilDemoLayer } from "@/components/SoilDemoLayer";
import { WOOD_HEATMAP_GRADIENT } from "@/lib/wood-heatmap";
import RoadTrafficLayer, { RoadTrafficControls, RoadTrafficDetails } from "@/components/RoadTrafficLayer";
import type { RoadTrafficData, RoadTrafficSegment } from "@/lib/road-traffic";
import { getSectorColor, type PollutionSite, type PollutionSitesResult } from "@/lib/google-sheets";
import { LAYERS, loadLayer, type LayerId, type LayerPoint } from "@/lib/environmental-layers";
import { CCPMB_BOUNDS as AREA, filterCcpmbPoints } from "@/lib/ccpmb-territory";
import type { IndustrialEmissionsData } from "@/lib/industrial-emissions";
import type { GroundwaterCatalogue } from "@/lib/groundwater";
import { useGroundwaterLayer } from "./GroundwaterLayer";
import { useInstituteWaterDemo } from "./InstituteWaterDemo";
import AtlasLayerSidebar from "./AtlasLayerSidebar";

type RemoteId = Exclude<LayerId, "inventory" | "wood" | "bathing" | "traffic">;
interface RemoteState { points: LayerPoint[]; status: "idle" | "loading" | "ready" | "error"; error?: string; fetchedAt?: string; cached?: boolean }
const EMPTY: RemoteState = { points: [], status: "idle" };
const LAYER_GROUPS = [
  { id: "inventory", title: "Inventaire", icon: MapPin, layers: ["inventory"] },
  { id: "air", title: "Air", icon: Wind, layers: ["wood", "atmo", "traffic"] },
  { id: "water", title: "Eau", icon: Droplets, layers: ["rivers", "bathing", "drinking"] },
  { id: "soil", title: "Qualité du sol", icon: Shovel, layers: [] },
] as const;
type Selection = { kind: "atmo"; id: string; name: string } | { kind: "rivers"; point: LayerPoint } | { kind: "drinking"; point: LayerPoint } | { kind: "bathing"; point: BathingPoint } | { kind: "inventory"; site: PollutionSite } | { kind: "traffic"; segment: RoadTrafficSegment };
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
};
const errorLabel = (error: unknown) => error instanceof Error && error.name === "TimeoutError" ? "Le fournisseur met trop de temps à répondre. Réessayez." : error instanceof TypeError ? "Connexion au fournisseur indisponible. Réessayez." : error instanceof Error ? error.message : "Données temporairement indisponibles.";

function useRemoteLayer(id: Exclude<RemoteId, "atmo">, enabled: boolean, revision: number, snapshot?: RiverCatalogue) {
  const [state, setState] = useState<RemoteState>(() => {
    const points = filterCcpmbPoints(snapshot?.points ?? []);
    return points.length ? { points, status: "ready", fetchedAt: snapshot?.fetchedAt ?? undefined, cached: true } : EMPTY;
  });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState((prev) => id === "rivers" ? { ...prev, status: "loading", error: undefined } : { points: [], status: "loading" });
    loadLayer(id, controller.signal).then((points) => {
      if (!controller.signal.aborted) setState({ points, status: "ready", fetchedAt: new Date().toISOString() });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState((prev) => ({ ...prev, status: prev.points.length ? "ready" : "error", cached: !!prev.points.length, error: errorLabel(error) }));
    });
    return () => controller.abort();
  }, [id, enabled, revision]);
  return state;
}


function Recenter() {
  const map = useMap();
  return <button type="button" onClick={() => map.fitBounds([[AREA.south, AREA.west], [AREA.north, AREA.east]])} className="absolute right-3 top-3 z-[800] flex items-center gap-2 bg-white rounded-lg border shadow px-3 py-2 text-sm text-slate-700" aria-label="Recentrer sur le Pays du Mont-Blanc"><LocateFixed size={16} />Recentrer</button>;
}

export default function AtlasMap({ inventory, bathing, riverAssessments, riverCatalogue, traffic, emissions, groundwater }: { inventory: PollutionSitesResult | null; bathing: BathingData; riverAssessments: RiverAssessments; riverCatalogue: RiverCatalogue; traffic: RoadTrafficData; emissions: IndustrialEmissionsData; groundwater: GroundwaterCatalogue }) {
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>({ inventory: true, wood: true, atmo: false, rivers: false, drinking: false, bathing: false, traffic: false });
  const [opacity, setOpacity] = useState<Record<LayerId, number>>({ inventory: 1, wood: 0.65, atmo: 0.8, rivers: 0.9, drinking: 0.9, bathing: 0.9, traffic: 0.9 });
  const [revision, setRevision] = useState<Record<RemoteId, number>>({ atmo: 0, rivers: 0, drinking: 0 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const atmo = useAtmoStations(enabled.atmo, revision.atmo);
  const rivers = useRemoteLayer("rivers", enabled.rivers, revision.rivers, riverCatalogue);
  const drinking = useRemoteLayer("drinking", enabled.drinking, revision.drinking);
  const drinkingSummaries = useDrinkingQuality(drinking.points, enabled.drinking, revision.drinking);
  const remote = { rivers, drinking };
  const bioDemo = useBioMonitoringDemo();
  const soilDemo = useSoilDemoLayer();
  const groundwaterLayer = useGroundwaterLayer(groundwater);
  const instituteWater = useInstituteWaterDemo();
  const activeCount = Object.values(enabled).filter(Boolean).length + bioDemo.activeCount + soilDemo.activeCount + groundwaterLayer.activeCount + instituteWater.activeCount;

  return <><div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <AtlasLayerSidebar activeCount={activeCount}>
      <div className="space-y-6">
        {LAYER_GROUPS.map((group) => <section key={group.id} aria-labelledby={`atlas-layer-group-${group.id}`}>
          <h3 id={`atlas-layer-group-${group.id}`} className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-iec"><group.icon size={17} aria-hidden="true" />{group.title}</h3>
          <div className="space-y-3">
        {group.id === "air" && bioDemo.controls}
        {group.id === "water" && instituteWater.controls}
        {group.id === "soil" && soilDemo.controls}
        {group.layers.map((id) => {
          const layer = LAYERS.find((layer) => layer.id === id)!;
          const state = layer.id === "inventory" || layer.id === "wood" || layer.id === "atmo" || layer.id === "bathing" || layer.id === "traffic" ? null : remote[layer.id];
          return <section key={layer.id} className={`rounded-xl border p-3 ${enabled[layer.id] ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
            <label className="flex gap-3 items-start cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled[layer.id]} onChange={(event) => setEnabled((prev) => ({ ...prev, [layer.id]: event.target.checked }))} />
              <span><span className="block font-semibold text-sm text-slate-900">{layer.title}</span><span className="block text-xs text-slate-500 mt-1">{layer.source}</span></span>
            </label>
            {enabled[layer.id] && <div className="mt-3 space-y-3">
              <p className="text-xs text-slate-600">{layer.description}</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">Opacité<input aria-label={`Opacité · ${layer.title}`} className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacity[layer.id]} onChange={(event) => setOpacity((prev) => ({ ...prev, [layer.id]: Number(event.target.value) }))} /><span>{Math.round(opacity[layer.id] * 100)} %</span></label>
              {layer.id === "inventory" && emissions.error && <p role="status" className="text-xs text-amber-800">{emissions.error}</p>}
              {layer.id === "inventory" ? inventory ? <p className="text-xs text-slate-500">{inventory.sites.length} sites cartographiés · {inventory.unmappedSites.length} sans coordonnées, consultables dans l’inventaire.<br />Inventaire récupéré le {dateLabel(inventory.lastUpdated)}.</p> : <p role="alert" className="text-xs text-red-700">Inventaire indisponible. Les autres couches restent accessibles.</p> : <div aria-live="polite" className="text-xs">
                {state?.status === "loading" && <p className="text-slate-500">Chargement du fournisseur…</p>}
                {state?.status === "error" && <div role="alert" className="text-red-700"><p>{state.error}</p><button className="underline mt-1" onClick={() => { const id = layer.id as RemoteId; setRevision((prev) => ({ ...prev, [id]: prev[id] + 1 })); }}>Réessayer</button></div>}
                {state?.cached && state.points.length > 0 && <p className="text-slate-600">{state.points.length} repères conservés · catalogue enregistré{state.fetchedAt ? ` le ${dateLabel(state.fetchedAt)}` : ""}.</p>}
                {state?.status === "ready" && state.error && <div role="status" className="text-amber-800"><p>Hub’Eau est temporairement indisponible. Le catalogue conservé reste affiché ; les analyses détaillées peuvent être indisponibles.</p><button className="underline mt-1" onClick={() => { const id = layer.id as RemoteId; setRevision((prev) => ({ ...prev, [id]: prev[id] + 1 })); }}>Réessayer</button></div>}
                {state?.status === "ready" && !state.cached && <p className="text-slate-500">{state.points.length} {layer.id === "rivers" ? "stations" : "communes"} · {state.points.length ? "Catalogue chargé" : "Aucune donnée dans ce périmètre"}{state.fetchedAt && ` le ${dateLabel(state.fetchedAt)}`}.</p>}
              </div>}
              {layer.id === "atmo" && <AtmoControls state={atmo} onRetry={() => setRevision((prev) => ({ ...prev, atmo: prev.atmo + 1 }))} />}
              {layer.id === "traffic" && <RoadTrafficControls data={traffic} />}
              {layer.id === "bathing" && <div className="space-y-2 text-xs text-slate-600">
                <p>{bathing.points.length} sites · {bathing.points.reduce((count, point) => count + bathingSamples(point).length, 0)} prélèvements récupérés.</p>
                <p>Icône nageur · vert : bon, orange : moyen, rouge : mauvais. Appréciation du dernier prélèvement disponible, pas de la situation actuelle.</p>
                <p>Actualisation à la reconstruction du site. Dates de récupération dans chaque fiche.</p>
                {bathing.points.some((point) => point.seasons.some((season) => season.error)) && <p role="alert" className="text-amber-800">Certaines saisons n’ont pas pu être récupérées. Les fiches donnent accès aux sources officielles.</p>}
              </div>}
              {layer.id === "rivers" && <div className="text-xs text-slate-600 space-y-2"><p>Icône vagues · état ou potentiel écologique : vert = très bon / bon, orange = moyen, rouge = médiocre / mauvais. Classe officielle et état chimique séparé dans la fiche.</p><p>Évaluations actualisées à la reconstruction du site{riverAssessments.fetchedAt ? ` · récupérées le ${dateLabel(riverAssessments.fetchedAt)}` : ""}. Le bouton ci-dessous recharge uniquement le catalogue Hub’Eau.</p>{riverAssessments.error && <p role="alert" className="text-amber-800">{riverAssessments.error}</p>}</div>}
              {layer.id === "drinking" && <p className="text-xs text-slate-600">Icône verre · vert : derniers contrôles conformes pour tous les réseaux recensés. Orange : dérogation ou référence non respectée sur au moins un réseau. Rouge : limite non respectée sur au moins un réseau. Contour seul : couverture insuffisante. Dates et réseaux concernés dans la fiche.</p>}
              {layer.id === "wood" && <div className="text-xs space-y-2">
                <p className="font-semibold text-amber-800">Données fictives · aucune valeur réelle</p>
                <div className="h-3 rounded-full" style={{ background: WOOD_HEATMAP_GRADIENT }} />
                <div className="flex justify-between text-slate-600"><span>Faible</span><span>Forte</span></div>
                <p className="text-slate-500">Intensité illustrative, sans unité.</p>
              </div>}
              {layer.url && <a className="text-xs text-blue-iec underline inline-flex gap-1 items-center" href={layer.url} target={layer.url.startsWith("https:") ? "_blank" : undefined} rel="noreferrer">Consulter la source<ExternalLink size={11} /></a>}
            </div>}
          </section>;
        })}
        {group.id === "water" && groundwaterLayer.controls}
          </div>
        </section>)}
      </div>
    </AtlasLayerSidebar>
    <div className="relative z-0 min-w-0">
      <MapContainer bounds={[[AREA.south, AREA.west], [AREA.north, AREA.east]]} style={{ height: "740px", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Recenter /><ScaleControl position="bottomleft" />
        {groundwaterLayer.markers}
        {bioDemo.markers}
        {soilDemo.markers}
        {instituteWater.markers}
        {enabled.wood && <WoodHeatingLayer opacity={opacity.wood} />}
        {enabled.traffic && <RoadTrafficLayer data={traffic} opacity={opacity.traffic} onSelect={(segment) => setSelection({ kind: "traffic", segment })} />}
        {enabled.bathing && bathing.points.map((point) => {
          const quality = bathingQuality(point), latest = bathingSamples(point)[0];
          const level = quality.level;
          return <Marker key={`bathing-${point.id}`} position={[point.lat, point.lng]} icon={environmentalPin("bathing", level)} opacity={opacity.bathing} title={`Baignade · ${point.name}`} attribution="Ministère de la Santé / ARS · sites de baignade" onSelect={() => setSelection({ kind: "bathing", point })}>
            <Tooltip>{point.name} · {quality.label}{latest ? ` · ${dateLabel(latest.date)}` : ""}</Tooltip>
          </Marker>;
        })}
        {enabled.atmo && <AtmoMarkers state={atmo} opacity={opacity.atmo} onSelect={(id) => {
          const group = combineAirStations(atmo).find(({ station }) => station.id === id);
          if (group) setSelection({ kind: "atmo", id, name: group.station.name });
        }} />}
        {(["rivers", "drinking"] as const).map((kind) => enabled[kind] && remote[kind].points.map((point) => {
          const summary = kind === "rivers" ? { quality: riverQuality(riverAssessments.stations[point.id]) } : drinkingSummaries[point.id] ?? { quality: unknownQuality("Chargement des conclusions par réseau…") };
          const pinLevel = summary.quality.level;
          return <Marker key={`${kind}-${point.id}`} position={[point.lat, point.lng]} icon={environmentalPin(kind, pinLevel)} opacity={opacity[kind]} title={`${kind === "rivers" ? "Cours d’eau" : "Eau potable"} · ${point.name}`} attribution={kind === "rivers" ? "Hub’Eau / Naïades" : "Ministère de la Santé / Hub’Eau · centres : API Découpage administratif"} onSelect={() => setSelection({ kind, point })}>
            <Tooltip>{point.name} · {summary.quality.label}{summary.quality.period ? ` · ${summary.quality.period}` : ""}{summary.quality.historical ? " · données historiques" : ""}</Tooltip>
          </Marker>;
        }))}
        {enabled.inventory && inventory?.sites.map((site) => <Marker key={site.id} position={[site.coordinates.lat, site.coordinates.lng]} icon={createCustomIcon(getSectorColor(site.sector), site.sector)} opacity={opacity.inventory} title={`${site.name} · ${site.sector}`} attribution="Inventaire écocitoyen" onSelect={() => setSelection({ kind: "inventory", site })}>
          <Tooltip>{site.name} · {site.commune}</Tooltip>
        </Marker>)}
      </MapContainer>
      {activeCount === 0 && <p className="absolute bottom-10 left-4 right-4 z-[800] bg-white rounded-lg p-3 shadow text-center text-sm">Activez une couche pour explorer ses données.</p>}
    </div>
  </div>
  {bioDemo.details}
  {soilDemo.details}
  {instituteWater.details}
  {groundwaterLayer.details}
  {selection && <AtlasDetailDialog
    key={selection.kind + (selection.kind === "atmo" ? selection.id : selection.kind === "inventory" ? selection.site.id : selection.kind === "traffic" ? selection.segment.id : selection.point.id)}
    kind={selection.kind}
    title={selection.kind === "atmo" ? selection.name : selection.kind === "inventory" ? selection.site.name : selection.kind === "traffic" ? `${selection.segment.road} · ${selection.segment.name}` : selection.point.name}
    subtitle={selection.kind === "atmo" ? "Atmo Auvergne-Rhône-Alpes · Mesures aux stations" : selection.kind === "rivers" ? "Hub’Eau · Naïades · Suivi physico-chimique" : selection.kind === "drinking" ? "Ministère de la Santé · Hub’Eau · Contrôle sanitaire" : selection.kind === "bathing" ? "Ministère de la Santé · ARS · Contrôle des eaux de baignade" : selection.kind === "traffic" ? "DDT de Haute-Savoie · Trafic moyen journalier annuel" : `${selection.site.commune} · Source ${selection.site.id}`}
    onClose={() => setSelection(null)}>
    {selection.kind === "atmo" ? <AtmoDetails state={atmo} stationId={selection.id} /> : selection.kind === "inventory" ? <AtlasInventoryDetails site={selection.site} emissions={emissions} /> : selection.kind === "traffic" ? <RoadTrafficDetails segment={selection.segment} data={traffic} /> : selection.kind === "bathing" ? <AtlasBathingDetails point={selection.point} /> : selection.kind === "drinking" ? <AtlasDrinkingDetails point={selection.point} summary={drinkingSummaries[selection.point.id]} /> : <AtlasWaterDetails
      kind={selection.kind} point={selection.point}
      quality={riverQuality(riverAssessments.stations[selection.point.id])}
      assessment={riverAssessments.stations[selection.point.id]} assessmentFetchedAt={riverAssessments.fetchedAt} />}
  </AtlasDetailDialog>}
  </>;
}
