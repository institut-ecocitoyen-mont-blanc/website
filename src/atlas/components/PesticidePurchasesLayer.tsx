"use client";

import { useEffect, useState } from "react";
import { Pane, Polygon, Tooltip } from "react-leaflet";
import polygonClipping, { type Polygon as ClippingPolygon } from "polygon-clipping";
import boundaries from "@/atlas/lib/data/ccpmb-boundaries.json";
import { PESTICIDE_ZONES, PESTICIDE_BANDS, PESTICIDE_SOURCE, PESTICIDE_LICENSE, purchaseSummary, substanceSummaries, purchaseLabel, pesticideColor, type PurchaseData } from "@/atlas/lib/pesticide-purchases";
import { loadPublishedData } from "@/atlas/lib/published-data";
import EvidenceLayerControl from "./EvidenceLayerControl";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";

const zones = PESTICIDE_ZONES.map((zone) => {
  const polygons = boundaries.features.filter((feature) => zone.communes.some((code) => code === feature.properties.code)).flatMap(({ geometry }) => geometry.type === "Polygon" ? [geometry.coordinates as ClippingPolygon] : geometry.coordinates as ClippingPolygon[]);
  const merged = polygonClipping.union(polygons[0], ...polygons.slice(1));
  return { ...zone, positions: merged.map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))) };
});
const scopeNote = "Les contours regroupent les communes du Pays du Mont-Blanc par code postal : ce ne sont pas des limites postales officielles. Les chiffres concernent toute la zone postale, sans répartition entre communes.";

export function usePesticidePurchasesLayer() {
  const [enabled, setEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.55);
  const [data, setData] = useState<PurchaseData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [chosenYear, setYear] = useState<number>();
  const [selectedCode, setSelectedCode] = useState<string>();
  const year = chosenYear && data?.years.includes(chosenYear) ? chosenYear : data?.years[0];
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true); setError(undefined);
    loadPublishedData<PurchaseData>("pesticide-purchases", controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Les achats sont temporairement indisponibles.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, revision]);
  const annualZones = zones.map((zone) => {
    const rows = data?.rows.filter((row) => row.zone === zone.code && row.year === year) ?? [];
    return { ...zone, rows, summary: purchaseSummary(rows) };
  });
  const selection = annualZones.find(({ code }) => code === selectedCode);
  return {
    activeCount: Number(enabled),
    controls: <EvidenceLayerControl title="Achats de pesticides" source="Hub’Eau · BNV-D · OFB" enabled={enabled} onEnabled={setEnabled} opacityControl={{ value: opacity, onChange: setOpacity }}>
      <p>Achats annuels de substances actives par zone postale. Ni quantités épandues, ni pollution mesurée.</p>
      {loading && <p role="status">Chargement des achats de pesticides…</p>}
      {error && <div role="alert" className="text-amber-800"><p>{error}{data ? " Les dernières données chargées restent affichées." : ""}</p><button className="underline" onClick={() => setRevision((value) => value + 1)}>Réessayer les achats</button></div>}
      {data && (data.years.length ? <>
        <label className="block">Année des achats<select aria-label="Année · Achats de pesticides" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2" value={year} onChange={(event) => setYear(Number(event.target.value))}>{data.years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <p className="font-semibold">Substances actives · kg renseignés</p>
        <ul aria-label="Légende des achats" className="space-y-1">{PESTICIDE_BANDS.map(({ color, label }) => <li key={label} className="flex items-center gap-2"><span className="h-3 w-4 rounded-sm" style={{ background: color }} />{label}</li>)}<li className="flex items-center gap-2"><span className="h-3 w-4 rounded-sm bg-slate-400" />Quantité non disponible</li></ul>
        <p>Classes de quantité, sans seuil sanitaire. Pointillés : somme partielle, certaines quantités ne sont pas renseignées.</p>
        <details><summary className="cursor-pointer text-blue-iec">Consulter les 5 zones postales</summary><ul className="mt-2 space-y-2">{annualZones.map((zone) => <li key={zone.code}><button className="text-left underline" onClick={() => setSelectedCode(zone.code)}>{zone.code} · {zone.name}<br />{purchaseLabel(zone.summary)}</button></li>)}</ul></details>
      </> : <p>Aucun achat renseigné pour les zones postales du territoire.</p>)}
      <p>{scopeNote}</p>
      <p className="text-slate-500">Déclarations annuelles des distributeurs · <a href={PESTICIDE_LICENSE} className="underline" target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. {data && `Récupérées le ${new Date(data.fetchedAt).toLocaleDateString("fr-FR")}.`}</p>
      <a href={PESTICIDE_SOURCE} className="text-blue-iec underline" target="_blank" rel="noreferrer">Données et méthode · Hub’Eau</a>
    </EvidenceLayerControl>,
    polygons: enabled && data && year && <Pane name="pesticide-purchases" style={{ zIndex: 365 }}>{annualZones.map((zone) => <Polygon key={zone.code} positions={zone.positions} pathOptions={{ color: "#1e40af", weight: 2, dashArray: zone.summary.missing ? "5 5" : undefined, fillColor: pesticideColor(zone.summary.quantity), fillOpacity: opacity }} attribution="OFB · BNV-D / Hub’Eau · Licence Ouverte 2.0" eventHandlers={{ click: () => setSelectedCode(zone.code) }}>
      <Tooltip pane="tooltipPane">Zone postale {zone.code} · {year}<br />{purchaseLabel(zone.summary)} de substances actives<br />Achats déclarés, pas une mesure de pollution</Tooltip>
    </Polygon>)}</Pane>,
    details: selection && data && <AtlasDetailDialog kind="pesticides" title={`Zone postale ${selection.code}`} subtitle={`Achats de pesticides · ${selection.name}`} onClose={() => setSelectedCode(undefined)}>
      <DetailFacts items={[{ label: "Année des achats", value: year }, { label: "Somme des quantités renseignées", value: purchaseLabel(selection.summary) }, { label: "Substances recensées", value: String(substanceSummaries(selection.rows).length) }]} />
      <DetailSection title="Comment lire ces données">
        <p>Somme des masses de substances actives des achats déclarés par les distributeurs, en kilogrammes. Ce n’est pas la masse des produits commerciaux, ni une mesure de toxicité, d’exposition ou de contamination.</p>
        <p className="mt-3">Le lieu d’achat déclaré ne permet pas de connaître le lieu ni l’année d’application. L’absence de données ne signifie pas une absence d’achat.</p>
        <p className="mt-3">{scopeNote}</p>
        {selection.summary.missing > 0 && <p className="mt-3 font-semibold text-amber-800">{selection.summary.missing} ligne(s) sans quantité exploitable (non renseignée ou confidentielle). La somme affichée est partielle ; ces valeurs ne sont pas remplacées par zéro.</p>}
      </DetailSection>
      <DetailSection title={`Substances actives · ${year}`} description="Quantités regroupées par substance, tous produits et achats déclarés confondus.">
        {selection.rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left py-2">Substance / fonction</th><th className="text-right">Quantité</th></tr></thead><tbody>{substanceSummaries(selection.rows).map((substance) => <tr key={substance.id} className="border-t"><td className="py-3 pr-3">{substance.name}<span className="block text-xs text-slate-500">{substance.functions}</span></td><td className="text-right">{purchaseLabel(substance)}</td></tr>)}</tbody></table></div> : <p>Aucun achat renseigné pour cette année.</p>}
      </DetailSection>
      <DetailSection title="Historique annuel" description="Sommes renseignées pour la même zone postale ; les années partielles ne sont pas directement comparables.">
        <table className="w-full text-sm"><thead><tr><th className="text-left py-2">Année</th><th className="text-right">Substances actives</th></tr></thead><tbody>{data.years.map((year) => <tr key={year} className="border-t"><td className="py-2">{year}</td><td className="text-right">{purchaseLabel(purchaseSummary(data.rows.filter((row) => row.zone === selection.code && row.year === year)))}</td></tr>)}</tbody></table>
      </DetailSection>
      <p className="mt-6 text-sm">Source : <a href={PESTICIDE_SOURCE} className="text-blue-iec underline" target="_blank" rel="noreferrer">OFB · BNV-D via Hub’Eau</a> · <a href={PESTICIDE_LICENSE} className="underline" target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. Agrégation et représentation par l’Institut écocitoyen.</p>
    </AtlasDetailDialog>,
  };
}
