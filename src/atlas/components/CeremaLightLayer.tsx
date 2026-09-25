"use client";

import { useEffect, useState } from "react";
import { Polygon, Tooltip, Pane } from "react-leaflet";
import EvidenceLayerControl from "./EvidenceLayerControl";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import boundaries from "@/atlas/lib/data/ccpmb-boundaries.json";
import { CEREMA_LIGHT_SOURCE, CEREMA_LIGHT_LICENSE, LIGHT_BANDS, lightColor, lightMonth, defaultLightMonth, type LightData, type LightCommune } from "@/atlas/lib/cerema-light";
import { loadPublishedData } from "@/atlas/lib/published-data";

const amount = (value: number | null | undefined) => value == null ? "Non disponible" : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const positions = (geometry: typeof boundaries.features[number]["geometry"]) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return (polygons as number[][][][]).map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])));
};

export function useCeremaLightLayer() {
  const [enabled, setEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.55);
  const [data, setData] = useState<LightData>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [chosenMonth, setMonth] = useState("");
  const [selection, setSelection] = useState<LightCommune>();
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
      <p>Radiance nocturne par commune, observée depuis l’espace en cœur de nuit (environ 2 h – 4 h). Pas une mesure de l’éclairement au sol.</p>
      {loading && <p role="status">Chargement de Cerema…</p>}
      {error && <div role="alert" className="text-amber-800"><p>{error}{data ? " Les dernières données chargées restent affichées." : ""}</p><button className="underline" onClick={() => setRevision((value) => value + 1)}>Réessayer Cerema</button></div>}
      {data && <>
        <label className="block">Mois observé<select aria-label="Mois · Pollution lumineuse" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2" value={month} onChange={(event) => setMonth(event.target.value)}>{[...data.months].reverse().map((date) => <option key={date} value={date}>{lightMonth(date)}</option>)}</select></label>
        <p className="font-semibold">Radiance · nW/cm²/sr</p>
        <ul className="space-y-1" aria-label="Légende de radiance">{LIGHT_BANDS.map((band) => <li className="flex items-center gap-2" key={band.label}><span className="h-3 w-4 rounded-sm" style={{ background: band.color }} />{band.label}</li>)}<li className="flex items-center gap-2"><span className="h-3 w-4 rounded-sm bg-slate-400" />Non disponible</li></ul>
        <p>Classes de visualisation, sans seuil sanitaire. Moyenne sur l’empreinte lumineuse retenue pour la commune, pas sur chaque point du territoire.</p>
        <details><summary className="cursor-pointer text-blue-iec">Consulter les 10 communes</summary><ul className="mt-2 space-y-1">{data.communes.map((commune) => <li key={commune.code}><button className="text-left underline" onClick={() => setSelection(commune)}>{commune.name} · {amount(commune.monthly[month])}</button></li>)}</ul></details>
      </>}
      <p className="text-slate-500">Cerema · OFB · DarkSkyLab — données publiées le 15 juin 2026, observations 2014–2025 · <a className="underline" href={CEREMA_LIGHT_LICENSE} target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. {data && `Données récupérées le ${new Date(data.fetchedAt).toLocaleDateString("fr-FR")}.`}</p>
      <a className="text-blue-iec underline" href={CEREMA_LIGHT_SOURCE} target="_blank" rel="noreferrer">Données et méthode · Cerema</a>
    </EvidenceLayerControl>,
    polygons: enabled && data && <Pane name="cerema-light" style={{ zIndex: 360 }}>{data.communes.map((commune) => {
      const feature = boundaries.features.find(({ properties }) => properties.code === commune.code)!;
      const value = commune.monthly[month];
      return <Polygon key={commune.code} positions={positions(feature.geometry)} pathOptions={{ color: "#7c3e76", weight: 1, opacity: 0.8, fillColor: lightColor(value), fillOpacity: opacity }} attribution="Cerema · OFB · DarkSkyLab · Licence Ouverte 2.0" eventHandlers={{ click: () => setSelection(commune) }}>
        <Tooltip pane="tooltipPane">{commune.name}<br />{lightMonth(month)} · {amount(value)}{value != null ? " nW/cm²/sr" : ""}</Tooltip>
      </Polygon>;
    })}</Pane>,
    details: selection && <AtlasDetailDialog kind="light" title={selection.name} subtitle="Cerema · Observations satellitaires nocturnes" onClose={() => setSelection(undefined)}>
      <DetailFacts items={[{ label: "Mois observé", value: lightMonth(month) }, { label: "Radiance communale", value: `${amount(selection.monthly[month])}${selection.monthly[month] != null ? " nW/cm²/sr" : ""}` }, { label: "Code INSEE", value: selection.code }]} />
      <DetailSection title="Ce que montre cette carte" description="Des observations historiques, pas un état en temps réel.">
        <p>La radiance est observée par le satellite VIIRS en cœur de nuit, vers 2 h – 4 h. Il s’agit d’une moyenne mensuelle sur l’empreinte lumineuse retenue pour la commune : ce n’est ni une mesure en lux au sol, ni un niveau uniforme dans tous ses quartiers, ni un seuil sanitaire.</p>
        <p className="mt-3">La comparaison de mois différents dépend aussi des conditions d’observation et de la saison. Elle ne permet pas, seule, d’attribuer une évolution à une politique d’éclairage.</p>
      </DetailSection>
      <DetailSection title="Changements de pratique détectés" description="Dates estimées par l’algorithme Cerema, à confirmer sur le terrain ; pas des déclarations de la mairie.">
        <DetailFacts items={[{ label: "Extinction probable", value: selection.extinction ?? "Non détectée / non renseignée" }, { label: "Extinction partielle ou rénovation probable", value: selection.renovation ?? "Non détectée / non renseignée" }]} />
      </DetailSection>
      <DetailSection title="Historique mensuel"><details><summary className="cursor-pointer text-blue-iec">Afficher les observations disponibles</summary><div className="max-h-80 overflow-auto mt-3"><table className="w-full text-sm"><thead><tr><th className="text-left">Mois</th><th className="text-right">Radiance (nW/cm²/sr)</th></tr></thead><tbody>{Object.entries(selection.monthly).sort(([a], [b]) => b.localeCompare(a)).map(([date, value]) => <tr key={date} className="border-t"><td className="py-2">{lightMonth(date)}</td><td className="text-right">{amount(value)}</td></tr>)}</tbody></table></div></details></DetailSection>
      <p className="mt-6 text-sm">Source : <a className="text-blue-iec underline" href={CEREMA_LIGHT_SOURCE} target="_blank" rel="noreferrer">Cerema · cartographie des pratiques d’éclairage nocturne</a> — <a className="underline" href={CEREMA_LIGHT_LICENSE} target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. Couleurs et contours de présentation adaptés par l’Institut écocitoyen.</p>
    </AtlasDetailDialog>,
  };
}
