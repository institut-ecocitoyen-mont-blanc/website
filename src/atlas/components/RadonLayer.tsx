"use client";

import { useState } from "react";
import { Pane, Polygon, Tooltip } from "react-leaflet";
import boundaries from "@/atlas/lib/data/ccpmb-boundaries.json";
import snapshot from "@/atlas/lib/data/radon.json";
import { parseRadonResponse, RADON_CATEGORIES, RADON_SOURCE, RADON_LICENSE, radonCategory, radonCommuneUrl } from "@/atlas/lib/radon";
import EvidenceLayerControl from "./EvidenceLayerControl";
import LayerAbout from "./LayerAbout";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { DetailHeadline, DetailLimits } from "./DetailCard";
import { useAtlasUrlLayer, useAtlasUrlPin } from "./useAtlasUrlState";

const data = parseRadonResponse(snapshot.response, snapshot.fetchedAt);
const fetchedDate = new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const positions = (geometry: typeof boundaries.features[number]["geometry"]) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return (polygons as number[][][][]).map(polygon => polygon.map(ring => ring.map(([lng, lat]) => [lat, lng] as [number, number])));
};
const categoryLabel = (category: typeof data.communes[number]["category"]) => category === null ? "Potentiel non renseigné" : `Catégorie ${category} · ${radonCategory(category)!.label.toLocaleLowerCase("fr-FR")}`;

export function useRadonLayer() {
  const [enabled, setEnabled] = useAtlasUrlLayer("radon");
  const [opacity, setOpacity] = useState(0.55);
  const [selectedCode, setSelectedCode] = useAtlasUrlPin("radon");
  const selected = data.communes.find(commune => commune.code === selectedCode);
  const band = selected && radonCategory(selected.category);
  return {
    activeCount: Number(enabled),
    controls: <EvidenceLayerControl title="Potentiel radon" source="Géorisques · zonage communal IRSN / ASNR" enabled={enabled} onEnabled={setEnabled} opacityControl={{ value: opacity, onChange: setOpacity }}>
      <ul className="space-y-1" aria-label="Légende du potentiel radon">{RADON_CATEGORIES.map(band => <li key={band.category} className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 h-3 w-4 shrink-0 rounded-sm border border-black/10" style={{ background: band.color }} /><span>{band.category} · {band.label}</span></li>)}{data.communes.some(commune => commune.category === null) && <li>Gris · potentiel non renseigné</li>}</ul>
      <p>Potentiel géologique à l’échelle communale. Seule une mesure dans le bâtiment permet de connaître sa concentration en radon.</p>
      <details><summary className="cursor-pointer text-blue-iec">Consulter les 10 communes</summary><ul className="mt-2 space-y-2">{data.communes.map(commune => <li key={commune.code}><button className="text-left underline" onClick={() => setSelectedCode(commune.code)}>{commune.name} · {categoryLabel(commune.category)}</button></li>)}</ul></details>
      <LayerAbout>
        <p>Le radon est un gaz radioactif naturel provenant du sous-sol, susceptible de s’accumuler dans les bâtiments. La carte reprend les catégories officielles sur les contours des 10 communes.</p>
        <p>Classement récupéré le {fetchedDate}. La source ne fournit pas de date de révision par commune. Les couleurs sont adaptées pour l’atlas.</p>
        <a className="text-blue-iec underline" href={RADON_SOURCE} target="_blank" rel="noreferrer">Comprendre le potentiel radon · Géorisques</a>
      </LayerAbout>
    </EvidenceLayerControl>,
    polygons: enabled && <Pane name="radon" style={{ zIndex: 350 }}>{data.communes.map(commune => {
      const feature = boundaries.features.find(({ properties }) => properties.code === commune.code)!;
      return <Polygon key={commune.code} positions={positions(feature.geometry)} pathOptions={{ color: "#8a4826", weight: 1, opacity: 0.85, fillColor: radonCategory(commune.category)?.color ?? "#94a3b8", fillOpacity: opacity }} attribution="Géorisques · IRSN / ASNR · Licence Ouverte" eventHandlers={{ click: () => setSelectedCode(commune.code) }}>
        <Tooltip pane="tooltipPane">{commune.name}<br />Radon · {categoryLabel(commune.category)}</Tooltip>
      </Polygon>;
    })}</Pane>,
    details: selected && <AtlasDetailDialog kind="radon" title={selected.name} subtitle={`Commune ${selected.code} · potentiel géologique du radon`} onClose={() => setSelectedCode(undefined)}>
      <DetailHeadline title={selected.category === null ? "Potentiel non renseigné" : `Catégorie ${selected.category} sur 3`} subtitle={band?.label ?? "Aucun classement disponible"} color={band?.color ?? "#94a3b8"} />
      {band && <DetailSection title="Interpréter le classement"><p className="text-sm text-slate-700">{band.description}</p></DetailSection>}
      <DetailFacts items={[{ label: "Échelle", value: "Commune entière" }, { label: "Concentration dans les bâtiments", value: "Non mesurée dans cette couche" }, { label: "Classement récupéré le", value: fetchedDate }, { label: "Date de révision du classement", value: "Non fournie par la source" }]} />
      <DetailLimits sources={<><a href={radonCommuneUrl(selected.code)} target="_blank" rel="noreferrer">Données communales · Géorisques</a><a href={RADON_SOURCE} target="_blank" rel="noreferrer">Comprendre le radon</a><a href={RADON_LICENSE} target="_blank" rel="noreferrer">Licence Ouverte · Géorisques</a></>}>
        <p>La catégorie porte sur la commune entière, même lorsque seule une partie présente des formations favorables au radon. La couleur ne localise pas les zones d’émission ni les bâtiments exposés.</p>
        <p>Une catégorie 1 n’exclut pas une concentration élevée dans un bâtiment. Le niveau intérieur dépend aussi de la construction, de la ventilation et des usages. Un mesurage est nécessaire pour connaître l’exposition réelle.</p>
        <p>Zonage établi par l’IRSN, aujourd’hui ASNR, diffusé par Géorisques. Classement récupéré le {fetchedDate} ; cette date correspond à la récupération des données.</p>
      </DetailLimits>
    </AtlasDetailDialog>,
  };
}
