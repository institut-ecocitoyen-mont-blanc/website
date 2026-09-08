"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Tooltip, ScaleControl, useMap } from "react-leaflet";
import Marker from "@/components/AtlasMarker";
import { Layers, RefreshCw, LocateFixed, ExternalLink } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { createCustomIcon } from "@/components/Map";
import AtlasDetailDialog from "@/components/AtlasDetailDialog";
import AtlasWaterDetails from "@/components/AtlasWaterDetails";
import AtlasInventoryDetails from "@/components/AtlasInventoryDetails";
import { environmentalPin, QualityLegend } from "@/components/EnvironmentalPin";
import { useDrinkingQuality } from "@/components/WaterQuality";
import { RIVER_QUALITY, unknownQuality, DEMO_PIN_PREVIEW, demoPinLevel, demoDrinkingPinLevel } from "@/lib/environmental-quality";
import { useAtmoStations, AtmoControls, AtmoMarkers, AtmoDetails } from "@/components/AtmoStations";
import { combineAirStations } from "@/lib/atmo-stations";
import WoodHeatingLayer from "@/components/WoodHeatingLayer";
import { WOOD_HEATMAP_GRADIENT } from "@/lib/wood-heatmap";
import { getSectorColor, type PollutionSite, type PollutionSitesResult } from "@/lib/google-sheets";
import { AREA, LAYERS, loadLayer, type LayerId, type LayerPoint } from "@/lib/environmental-layers";

type RemoteId = Exclude<LayerId, "inventory" | "wood">;
interface RemoteState { points: LayerPoint[]; status: "idle" | "loading" | "ready" | "error"; error?: string; fetchedAt?: string }
const EMPTY: RemoteState = { points: [], status: "idle" };
type Selection = { kind: "atmo"; id: string; name: string } | { kind: "rivers"; point: LayerPoint } | { kind: "drinking"; point: LayerPoint } | { kind: "inventory"; site: PollutionSite };
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
};
const errorLabel = (error: unknown) => error instanceof Error && error.name === "TimeoutError" ? "Le fournisseur met trop de temps à répondre. Réessayez." : error instanceof TypeError ? "Connexion au fournisseur indisponible. Réessayez." : error instanceof Error ? error.message : "Données temporairement indisponibles.";

function useRemoteLayer(id: Exclude<RemoteId, "atmo">, enabled: boolean, revision: number) {
  const [state, setState] = useState<RemoteState>(EMPTY);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ points: [], status: "loading" });
    loadLayer(id, controller.signal).then((points) => {
      if (!controller.signal.aborted) setState({ points, status: "ready", fetchedAt: new Date().toISOString() });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ points: [], status: "error", error: errorLabel(error) });
    });
    return () => controller.abort();
  }, [id, enabled, revision]);
  return state;
}


function Recenter() {
  const map = useMap();
  return <button type="button" onClick={() => map.fitBounds([[AREA.south, AREA.west], [AREA.north, AREA.east]])} className="absolute right-3 top-3 z-[800] flex items-center gap-2 bg-white rounded-lg border shadow px-3 py-2 text-sm text-slate-700" aria-label="Recentrer sur le Pays du Mont-Blanc"><LocateFixed size={16} />Recentrer</button>;
}

export default function AtlasMap({ inventory }: { inventory: PollutionSitesResult | null }) {
  const [enabled, setEnabled] = useState<Record<LayerId, boolean>>({ inventory: true, wood: false, atmo: false, rivers: false, drinking: false });
  const [opacity, setOpacity] = useState<Record<LayerId, number>>({ inventory: 1, wood: 0.65, atmo: 0.8, rivers: 0.9, drinking: 0.9 });
  const [revision, setRevision] = useState<Record<RemoteId, number>>({ atmo: 0, rivers: 0, drinking: 0 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const atmo = useAtmoStations(enabled.atmo, revision.atmo);
  const rivers = useRemoteLayer("rivers", enabled.rivers, revision.rivers);
  const drinking = useRemoteLayer("drinking", enabled.drinking, revision.drinking);
  const drinkingSummaries = useDrinkingQuality(drinking.points, enabled.drinking, revision.drinking);
  const remote = { rivers, drinking };
  const activeCount = Object.values(enabled).filter(Boolean).length;

  return <><div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <aside aria-label="Couches de l’atlas" className="p-5 border-b lg:border-b-0 lg:border-r max-h-[420px] lg:max-h-[740px] overflow-y-auto">
      <div className="flex items-center justify-between mb-1"><h2 className="font-bold text-lg flex items-center gap-2"><Layers size={19} />Couches</h2><span className="text-xs text-slate-500">{activeCount} active{activeCount > 1 ? "s" : ""}</span></div>
      <p className="text-xs text-slate-500 mb-5">Superposez les données et réglez leur transparence.</p>
      <div className="space-y-4">
        {LAYERS.map((layer) => {
          const state = layer.id === "inventory" || layer.id === "wood" || layer.id === "atmo" ? null : remote[layer.id];
          return <section key={layer.id} className={`rounded-xl border p-3 ${enabled[layer.id] ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
            <label className="flex gap-3 items-start cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled[layer.id]} onChange={(event) => setEnabled((prev) => ({ ...prev, [layer.id]: event.target.checked }))} />
              <span><span className="block font-semibold text-sm text-slate-900">{layer.title}</span><span className="block text-xs text-slate-500 mt-1">{layer.source}</span></span>
            </label>
            {enabled[layer.id] && <div className="mt-3 space-y-3">
              <p className="text-xs text-slate-600">{layer.description}</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">Opacité<input aria-label={`Opacité · ${layer.title}`} className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacity[layer.id]} onChange={(event) => setOpacity((prev) => ({ ...prev, [layer.id]: Number(event.target.value) }))} /><span>{Math.round(opacity[layer.id] * 100)} %</span></label>
              {layer.id === "inventory" ? inventory ? <p className="text-xs text-slate-500">{inventory.sites.length} sites cartographiés · {inventory.unmappedSites.length} sans coordonnées, consultables dans l’inventaire.<br />Inventaire récupéré le {dateLabel(inventory.lastUpdated)}.</p> : <p role="alert" className="text-xs text-red-700">Inventaire indisponible. Les autres couches restent accessibles.</p> : <div aria-live="polite" className="text-xs">
                {state?.status === "loading" && <p className="text-slate-500">Chargement du fournisseur…</p>}
                {state?.status === "error" && <div role="alert" className="text-red-700"><p>{state.error}</p><button className="underline mt-1" onClick={() => { const id = layer.id as RemoteId; setRevision((prev) => ({ ...prev, [id]: prev[id] + 1 })); }}>Réessayer</button></div>}
                {state?.status === "ready" && <p className="text-slate-500">{state.points.length} {layer.id === "rivers" ? "stations" : "communes"} · {state.points.length ? "Catalogue chargé" : "Aucune donnée dans ce périmètre"}{state.fetchedAt && ` le ${dateLabel(state.fetchedAt)}`}.</p>}
              </div>}
              {layer.id === "atmo" && <AtmoControls state={atmo} onRetry={() => setRevision((prev) => ({ ...prev, atmo: prev.atmo + 1 }))} />}
              {layer.id === "rivers" && <p className="text-xs text-slate-600">{DEMO_PIN_PREVIEW ? "Icône vagues · cliquez sur une station pour consulter les analyses par paramètre." : "Icône vagues · bleu : le flux d’analyses ne fournit pas de classe globale de qualité."}</p>}
              {layer.id === "drinking" && <p className="text-xs text-slate-600">{DEMO_PIN_PREVIEW ? "Icône verre · consultez les résultats et les conclusions officielles de chaque prélèvement dans la fiche." : "Icône verre · couleur de la conclusion officielle du dernier prélèvement retourné, pas de toute la commune. Orange : dérogation ou référence non respectée. Bleu : conclusion incomplète ou prélèvement de plus de 90 jours (repère d’affichage, pas une durée de validité sanitaire). Les contrôles ne sont pas des mesures en temps réel."}</p>}
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
      </div>
      <button className="mt-4 flex gap-2 items-center text-sm text-blue-iec" onClick={() => setRevision((prev) => ({ atmo: prev.atmo + 1, rivers: prev.rivers + 1, drinking: prev.drinking + 1 }))}><RefreshCw size={14} />Actualiser les couches externes</button>
      {!DEMO_PIN_PREVIEW && <QualityLegend />}
    </aside>
    <div className="relative z-0 min-w-0">
      <MapContainer bounds={[[AREA.south, AREA.west], [AREA.north, AREA.east]]} style={{ height: "740px", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Recenter /><ScaleControl position="bottomleft" />
        {enabled.wood && <WoodHeatingLayer opacity={opacity.wood} />}
        {enabled.atmo && <AtmoMarkers state={atmo} opacity={opacity.atmo} onSelect={(id) => {
          const group = combineAirStations(atmo).find(({ station }) => station.id === id);
          if (group) setSelection({ kind: "atmo", id, name: group.station.name });
        }} />}
        {(["rivers", "drinking"] as const).map((kind) => enabled[kind] && remote[kind].points.map((point) => {
          const summary = kind === "rivers" ? { quality: RIVER_QUALITY } : drinkingSummaries[point.id] ?? { quality: unknownQuality("Chargement de la conclusion sanitaire…") };
          const pinLevel = DEMO_PIN_PREVIEW ? kind === "rivers" ? demoPinLevel("unknown", point.id) : demoDrinkingPinLevel(drinkingSummaries[point.id]?.sample, point.id) : summary.quality.level;
          return <Marker key={`${kind}-${point.id}`} position={[point.lat, point.lng]} icon={environmentalPin(kind, pinLevel)} opacity={opacity[kind]} title={`${kind === "rivers" ? "Cours d’eau" : "Eau potable"} · ${point.name}`} attribution={kind === "rivers" ? "Hub’Eau / Naïades" : "Ministère de la Santé / Hub’Eau · centres : API Découpage administratif"} onSelect={() => setSelection({ kind, point })}>
            <Tooltip>{point.name} · {summary.quality.label}</Tooltip>
          </Marker>;
        }))}
        {enabled.inventory && inventory?.sites.map((site) => <Marker key={site.id} position={[site.coordinates.lat, site.coordinates.lng]} icon={createCustomIcon(getSectorColor(site.sector), site.sector)} opacity={opacity.inventory} title={`${site.name} · ${site.sector}`} attribution="Inventaire écocitoyen" onSelect={() => setSelection({ kind: "inventory", site })}>
          <Tooltip>{site.name} · {site.commune}</Tooltip>
        </Marker>)}
      </MapContainer>
      {activeCount === 0 && <p className="absolute bottom-10 left-4 right-4 z-[800] bg-white rounded-lg p-3 shadow text-center text-sm">Activez une couche pour explorer ses données.</p>}
    </div>
  </div>
  {selection && <AtlasDetailDialog
    key={selection.kind + (selection.kind === "atmo" ? selection.id : selection.kind === "inventory" ? selection.site.id : selection.point.id)}
    kind={selection.kind}
    title={selection.kind === "atmo" ? selection.name : selection.kind === "inventory" ? selection.site.name : selection.point.name}
    subtitle={selection.kind === "atmo" ? "Atmo Auvergne-Rhône-Alpes · Mesures aux stations" : selection.kind === "rivers" ? "Hub’Eau · Naïades · Suivi physico-chimique" : selection.kind === "drinking" ? "Ministère de la Santé · Hub’Eau · Contrôle sanitaire" : `${selection.site.commune} · Source ${selection.site.id}`}
    onClose={() => setSelection(null)}>
    {selection.kind === "atmo" ? <AtmoDetails state={atmo} stationId={selection.id} /> : selection.kind === "inventory" ? <AtlasInventoryDetails site={selection.site} /> : <AtlasWaterDetails
      kind={selection.kind} point={selection.point}
      quality={selection.kind === "rivers" ? RIVER_QUALITY : drinkingSummaries[selection.point.id]?.quality ?? unknownQuality("Chargement de la conclusion sanitaire…")}
      sample={selection.kind === "drinking" ? drinkingSummaries[selection.point.id]?.sample : undefined} />}
  </AtlasDetailDialog>}
  </>;
}
