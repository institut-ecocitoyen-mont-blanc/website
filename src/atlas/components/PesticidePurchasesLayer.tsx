"use client";

import { useEffect, useState } from "react";
import { useAtlasUrlLayer, useAtlasUrlPin } from "./useAtlasUrlState";
import { Pane, Polygon, Tooltip } from "react-leaflet";
import polygonClipping, { type Polygon as ClippingPolygon } from "polygon-clipping";
import boundaries from "@/atlas/lib/data/ccpmb-boundaries.json";
import { PESTICIDE_ZONES, PESTICIDE_BANDS, PESTICIDE_SOURCE, PESTICIDE_LICENSE, purchaseSummary, substanceSummaries, purchaseLabel, pesticideColor, type PurchaseData } from "@/atlas/lib/pesticide-purchases";
import { loadPublishedData } from "@/atlas/lib/published-data";
import EvidenceLayerControl from "./EvidenceLayerControl";
import LayerAbout from "./LayerAbout";
import { DetailData, DetailHeadline, DetailLimits, DetailGauges, DetailBars, DetailTable } from "./DetailCard";
import AtlasDetailDialog, { DetailFacts } from "./AtlasDetailDialog";

const zones = PESTICIDE_ZONES.map((zone) => {
  const polygons = boundaries.features.filter((feature) => zone.communes.some((code) => code === feature.properties.code)).flatMap(({ geometry }) => geometry.type === "Polygon" ? [geometry.coordinates as ClippingPolygon] : geometry.coordinates as ClippingPolygon[]);
  const merged = polygonClipping.union(polygons[0], ...polygons.slice(1));
  return { ...zone, positions: merged.map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))) };
});
const scopeNote = "Les contours regroupent les communes du Pays du Mont-Blanc par code postal : ce ne sont pas des limites postales officielles. Les chiffres concernent toute la zone postale, sans répartition entre communes.";

export function usePesticidePurchasesLayer() {
  const [enabled, setEnabled] = useAtlasUrlLayer("pesticide-purchases");
  const [opacity, setOpacity] = useState(0.55);
  const [data, setData] = useState<PurchaseData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [chosenYear, setYear] = useState<number>();
  const [selectedCode, setSelectedCode] = useAtlasUrlPin("pesticide-purchases");
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
  const substances = substanceSummaries(selection?.rows ?? []);
  const top = substances.slice(0, 5);
  const rest = substances.slice(5);
  const barRows = [...top, ...(rest.length ? [{ name: "Autres", quantity: rest.some(s => s.quantity !== null) ? rest.reduce((sum, s) => sum + (s.quantity ?? 0), 0) : null, missing: rest.reduce((sum, s) => sum + s.missing, 0), records: rest.reduce((sum, s) => sum + s.records, 0) }] : [])];
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
      <LayerAbout><p>{scopeNote}</p>
      <p className="text-slate-500">Déclarations annuelles des distributeurs · <a href={PESTICIDE_LICENSE} className="underline" target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. {data && `Récupérées le ${new Date(data.fetchedAt).toLocaleDateString("fr-FR")}.`}</p>
      <a href={PESTICIDE_SOURCE} className="text-blue-iec underline" target="_blank" rel="noreferrer">Données et méthode · Hub’Eau</a>
      </LayerAbout>
    </EvidenceLayerControl>,
    polygons: enabled && data && year && <Pane name="pesticide-purchases" style={{ zIndex: 365 }}>{annualZones.map((zone) => <Polygon key={zone.code} positions={zone.positions} pathOptions={{ color: "#1e40af", weight: 2, dashArray: zone.summary.missing ? "5 5" : undefined, fillColor: pesticideColor(zone.summary.quantity), fillOpacity: opacity }} attribution="OFB · BNV-D / Hub’Eau · Licence Ouverte 2.0" eventHandlers={{ click: () => setSelectedCode(zone.code) }}>
      <Tooltip pane="tooltipPane">Zone postale {zone.code} · {year}<br />{purchaseLabel(zone.summary)} de substances actives<br />Achats déclarés, pas une mesure de pollution</Tooltip>
    </Polygon>)}</Pane>,
    details: selection && data && <AtlasDetailDialog kind="pesticides" title={`Zone postale ${selection.code}`} subtitle={selection.name} onClose={() => setSelectedCode(undefined)}>
      <DetailHeadline title={purchaseLabel(selection.summary)} subtitle="Somme des masses de substances actives renseignées" date={year} color={selection.summary.quantity == null ? "#e2e8f0" : pesticideColor(selection.summary.quantity)} />
      <DetailGauges label="Achats déclarés · classes de quantité de l’atlas" bands={PESTICIDE_BANDS} rows={[year, ...data.years.filter(y => y < (year ?? 0)).slice(0, 1)].filter((y): y is number => y !== undefined).map(y => { const summary = purchaseSummary(data.rows.filter(r => r.zone === selection.code && r.year === y)); return { label: String(y), value: summary.quantity, text: purchaseLabel(summary) }; })} />
      <DetailBars label="Principales substances · masses renseignées (échelle relative commune)" rows={barRows.map(s => ({ label: s.name, value: s.quantity, max: Math.max(0, ...barRows.map(r => r.quantity ?? 0)), text: purchaseLabel(s), color: "#4d7c0f" }))} />
      <DetailFacts items={[{ label: "Substances recensées", value: substances.length }, { label: "Lignes sans quantité exploitable", value: selection.summary.missing }]} />
      <DetailData hint="Substances, fonctions et historique annuel">
        <DetailTable caption={`Substances actives · ${year}`} headers={["Substance", "Fonction", "Quantité"]} rows={substances.map(s => [s.name, s.functions, purchaseLabel(s)])} />
        {!selection.rows.length && <p>Aucun achat renseigné pour cette année.</p>}
        <DetailTable caption="Historique annuel · même zone postale" headers={["Année", "Substances actives"]} rows={data.years.map(y => [y, purchaseLabel(purchaseSummary(data.rows.filter(r => r.zone === selection.code && r.year === y)))])} />
        <p className="text-sm">Quantités regroupées par substance, tous produits et achats déclarés confondus. Les années partielles ne sont pas directement comparables. La somme est celle des masses de substances actives, pas des produits commerciaux.</p>
      </DetailData>
      <DetailLimits sources={<><a href={PESTICIDE_SOURCE} target="_blank" rel="noreferrer">OFB · BNV-D via Hub’Eau</a><a href={PESTICIDE_LICENSE} target="_blank" rel="noreferrer">Licence Ouverte 2.0</a></>}>
        <p>Achats déclarés, pas quantités épandues ni mesure de toxicité, d’exposition ou de contamination. Le lieu d’achat ne permet pas de connaître le lieu ni l’année d’application. L’absence de données ne signifie pas une absence d’achat. {scopeNote}</p>
        {selection.summary.missing > 0 && <p>{selection.summary.missing} ligne(s) sans quantité exploitable (non renseignée ou confidentielle) : somme partielle, sans remplacement par zéro.</p>}
        <p>Agrégation et représentation par l’Institut écocitoyen. Récupérées le {new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p>
      </DetailLimits>
    </AtlasDetailDialog>,
  };
}
