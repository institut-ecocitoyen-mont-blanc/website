"use client";

import { useEffect, useState } from "react";
import { useAtlasUrlLayer, useAtlasUrlPin } from "./useAtlasUrlState";
import { Polygon, Tooltip, Pane } from "react-leaflet";
import EvidenceLayerControl from "./EvidenceLayerControl";
import LayerAbout from "./LayerAbout";
import { DetailData, DetailHeadline, DetailLimits, DetailGauges, DetailTable } from "./DetailCard";
import AtlasDetailDialog, { DetailFacts } from "./AtlasDetailDialog";
import boundaries from "@/atlas/lib/data/ccpmb-boundaries.json";
import { CEREMA_LIGHT_SOURCE, CEREMA_LIGHT_LICENSE, LIGHT_BANDS, lightColor, lightMonth, defaultLightMonth, type LightData, type LightCommune } from "@/atlas/lib/cerema-light";
import { loadPublishedData } from "@/atlas/lib/published-data";

const amount = (value: number | null | undefined) => value == null ? "Non disponible" : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const positions = (geometry: typeof boundaries.features[number]["geometry"]) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return (polygons as number[][][][]).map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])));
};

export function useCeremaLightLayer() {
  const [enabled, setEnabled] = useAtlasUrlLayer("cerema-light");
  const [opacity, setOpacity] = useState(0.55);
  const [data, setData] = useState<LightData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [chosenMonth, setMonth] = useState("");
  const [selectedCode, setSelectedCode] = useAtlasUrlPin("cerema-light");
  const selection = data?.communes.find(commune => commune.code === selectedCode);
  const setSelection = (commune: LightCommune | undefined) => setSelectedCode(commune?.code);
  const month = chosenMonth || defaultLightMonth(data?.months ?? []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true); setError(undefined);
    loadPublishedData<LightData>("cerema-light", controller.signal).then((data) => {
      if (!controller.signal.aborted) setData(data);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Cerema est temporairement indisponible.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, revision]);
  return {
    activeCount: Number(enabled),
    controls: <EvidenceLayerControl title="Pollution lumineuse" source="Cerema · observations satellitaires" enabled={enabled} onEnabled={setEnabled} opacityControl={{ value: opacity, onChange: setOpacity }}>
      {loading && <p role="status">Chargement de Cerema…</p>}
      {error && <div role="alert" className="text-amber-800"><p>{error}{data ? " Les dernières données chargées restent affichées." : ""}</p><button className="underline" onClick={() => setRevision((value) => value + 1)}>Réessayer Cerema</button></div>}
      {data && <>
        <label className="block">Mois observé<select aria-label="Mois · Pollution lumineuse" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2" value={month} onChange={(event) => setMonth(event.target.value)}>{[...data.months].reverse().map((date) => <option key={date} value={date}>{lightMonth(date)}</option>)}</select></label>
        <p className="font-semibold">Radiance · nW/cm²/sr</p>
        <ul className="space-y-1" aria-label="Légende de radiance">{LIGHT_BANDS.map((band) => <li className="flex items-center gap-2" key={band.label}><span className="h-3 w-4 rounded-sm" style={{ background: band.color }} />{band.label}</li>)}<li className="flex items-center gap-2"><span className="h-3 w-4 rounded-sm bg-slate-400" />Non disponible</li></ul>
        <p>Classes de visualisation, sans seuil sanitaire. Moyenne sur l’empreinte lumineuse retenue pour la commune, pas sur chaque point du territoire.</p>
        <details><summary className="cursor-pointer text-blue-iec">Consulter les 10 communes</summary><ul className="mt-2 space-y-1">{data.communes.map((commune) => <li key={commune.code}><button className="text-left underline" onClick={() => setSelection(commune)}>{commune.name} · {amount(commune.monthly[month])}</button></li>)}</ul></details>
      </>}
      <LayerAbout>
      <p>Radiance nocturne par commune, observée depuis l’espace en cœur de nuit (environ 2 h – 4 h). Pas une mesure de l’éclairement au sol.</p>
      <p className="text-slate-500">Cerema · OFB · DarkSkyLab — données publiées le 15 juin 2026, observations 2014–2025 · <a className="underline" href={CEREMA_LIGHT_LICENSE} target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. {data && `Données récupérées le ${new Date(data.fetchedAt).toLocaleDateString("fr-FR")}.`}</p>
      <a className="text-blue-iec underline" href={CEREMA_LIGHT_SOURCE} target="_blank" rel="noreferrer">Données et méthode · Cerema</a>
      </LayerAbout>
    </EvidenceLayerControl>,
    polygons: enabled && data && <Pane name="cerema-light" style={{ zIndex: 360 }}>{data.communes.map((commune) => {
      const feature = boundaries.features.find(({ properties }) => properties.code === commune.code)!;
      const value = commune.monthly[month];
      return <Polygon key={commune.code} positions={positions(feature.geometry)} pathOptions={{ color: "#7c3e76", weight: 1, opacity: 0.8, fillColor: lightColor(value), fillOpacity: opacity }} attribution="Cerema · OFB · DarkSkyLab · Licence Ouverte 2.0" eventHandlers={{ click: () => setSelection(commune) }}>
        <Tooltip pane="tooltipPane">{commune.name}<br />{lightMonth(month)} · {amount(value)}{value != null ? " nW/cm²/sr" : ""}</Tooltip>
      </Polygon>;
    })}</Pane>,
    details: selection && <AtlasDetailDialog kind="light" title={selection.name} subtitle={`Commune ${selection.code} · observations satellitaires nocturnes`} onClose={() => setSelection(undefined)}>
      <DetailHeadline title={`${amount(selection.monthly[month])}${selection.monthly[month] != null ? " nW/cm²/sr" : ""}`} subtitle="Radiance communale · moyenne sur l’empreinte lumineuse retenue" date={lightMonth(month)} color={selection.monthly[month] == null ? "#e2e8f0" : lightColor(selection.monthly[month])} />
      <DetailGauges label="Radiance · classes de visualisation, sans seuil sanitaire" bands={LIGHT_BANDS} rows={[month, ...Object.keys(selection.monthly).filter(m => m < month && m.slice(5) === month.slice(5)).sort().reverse().slice(0, 2)].map(m => ({ label: lightMonth(m), value: selection.monthly[m], text: `${amount(selection.monthly[m])}${selection.monthly[m] != null ? " nW/cm²/sr" : ""}` }))} />
      <DetailFacts items={[{ label: "Extinction probable", value: selection.extinction ?? "Non détectée / non renseignée" }, { label: "Extinction partielle ou rénovation probable", value: selection.renovation ?? "Non détectée / non renseignée" }]} />
      <DetailData hint="Historique mensuel et méthode">
        <DetailTable caption="Historique mensuel · observations disponibles" headers={["Mois", "Radiance (nW/cm²/sr)"]} rows={Object.entries(selection.monthly).sort(([a], [b]) => b.localeCompare(a)).map(([date, value]) => [lightMonth(date), amount(value)])} />
        <p className="text-sm">La radiance est observée par le satellite VIIRS en cœur de nuit, vers 2 h – 4 h. Moyenne mensuelle sur l’empreinte lumineuse retenue pour la commune, pas sur chacun de ses points. Les détections d’extinction ou de rénovation sont des dates estimées par l’algorithme Cerema, à confirmer sur le terrain ; pas des déclarations de la mairie.</p>
      </DetailData>
      <DetailLimits sources={<><a href={CEREMA_LIGHT_SOURCE} target="_blank" rel="noreferrer">Cerema · OFB · DarkSkyLab</a><a href={CEREMA_LIGHT_LICENSE} target="_blank" rel="noreferrer">Licence Ouverte 2.0</a></>}>
        <p>Observations historiques, pas un état en temps réel. Ce n’est ni une mesure en lux au sol, ni un niveau uniforme dans tous les quartiers, ni un seuil sanitaire. La comparaison des mois dépend des conditions d’observation et de la saison ; elle ne permet pas, seule, d’attribuer une évolution à une politique d’éclairage. Couleurs et contours de présentation adaptés par l’Institut écocitoyen.</p>
        {data && <p>Données récupérées le {new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p>}
      </DetailLimits>
    </AtlasDetailDialog>,
  };
}
