"use client";

import { useEffect, useRef } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import type { Polyline as LeafletPolyline } from "leaflet";
import { ExternalLink } from "lucide-react";
import { TRAFFIC_BANDS, TRAFFIC_ROADS, TRAFFIC_SOURCE_URL, trafficColor, trafficValue, type RoadTrafficData, type RoadTrafficSegment } from "@/atlas/lib/road-traffic";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import styles from "./AtlasDetails.module.css";
import { DetailData, DetailHeadline, DetailLimits, DetailGauges, DetailBars, DetailTable } from "./DetailCard";

function RoadSection({ segment, opacity, onSelect }: { segment: RoadTrafficSegment; opacity: number; onSelect: (segment: RoadTrafficSegment) => void }) {
  const ref = useRef<LeafletPolyline>(null);
  const label = `${segment.road} · ${segment.name} · ${trafficValue(segment.vehicles)} · ${segment.year}`;
  useEffect(() => {
    const element = ref.current?.getElement();
    if (!element) return;
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", label);
    element.setAttribute("data-road", segment.road);
    const activate = (event: Event) => {
      if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); onSelect(segment); }
    };
    element.addEventListener("keydown", activate);
    return () => element.removeEventListener("keydown", activate);
  }, [label, segment, onSelect]);
  return <Polyline ref={ref} positions={segment.paths} pathOptions={{ color: trafficColor(segment.vehicles), opacity, weight: 7, dashArray: segment.vehicles === null ? "7 7" : undefined, className: "atlas-traffic-section", lineCap: "round" }} eventHandlers={{ click: () => onSelect(segment) }}>
    <Tooltip sticky>{segment.road} · {trafficValue(segment.vehicles)}<br />Moyenne journalière · {segment.year}</Tooltip>
  </Polyline>;
}

export default function RoadTrafficLayer({ data, opacity, onSelect }: { data: RoadTrafficData; opacity: number; onSelect: (segment: RoadTrafficSegment) => void }) {
  return <>{data.segments.map((segment) => <RoadSection key={segment.id} segment={segment} opacity={opacity} onSelect={onSelect} />)}</>;
}

export function RoadTrafficControls({ data }: { data: RoadTrafficData }) {
  const present = new Set(data.segments.map((s) => s.road));
  return <div className="text-xs text-slate-600 space-y-3">
    <p className="font-semibold">Véhicules / jour · moyenne annuelle{data.year ? ` ${data.year}` : ""}</p>
    <div className="space-y-1">{TRAFFIC_BANDS.map((band) => <p key={band.label} className="flex items-center gap-2"><span aria-hidden="true" className="w-6 h-1 rounded" style={{ background: band.color }} />{band.label}</p>)}<p className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-slate-500" />Sans comptage pour cette année</p></div>
    <p>{data.segments.length} tronçons · {data.segments.filter((s) => s.vehicles !== null).length} avec un comptage. Cliquez sur une route pour consulter sa fiche.</p>
    {data.error && <p role="alert" className="text-amber-800">{data.error}</p>}
    {!!data.segments.length && TRAFFIC_ROADS.some((r) => !present.has(r)) && <p>Géométrie non disponible dans ce périmètre : {TRAFFIC_ROADS.filter((r) => !present.has(r)).join(", ")}.</p>}
    <p>Volume de circulation, pas un indicateur de congestion ni de pollution. Les deux sens sont cumulés ; ne pas additionner les tronçons.</p>
    {data.fetchedAt && <p>Source récupérée le {new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}. Recherche de mises à jour chaque mois.</p>}
  </div>;
}

export function RoadTrafficDetails({ segment, data }: { segment: RoadTrafficSegment; data: RoadTrafficData }) {
  return <>
    <DetailHeadline title={trafficValue(segment.vehicles)} subtitle="Trafic moyen journalier annuel · deux sens cumulés" color={segment.vehicles === null ? "#e2e8f0" : trafficColor(segment.vehicles)} date={segment.year} />
    <DetailGauges label="Classes de volume de l’atlas · véhicules / jour" bands={TRAFFIC_BANDS} rows={[{ label: "TMJA", value: segment.vehicles, text: trafficValue(segment.vehicles) }]} />
    <DetailBars label="Part de poids lourds · échelle 0–100 %" rows={[{ label: "Poids lourds", value: segment.heavyVehiclesPercent, max: 100, text: segment.heavyVehiclesPercent === null ? "Non renseignée" : `${segment.heavyVehiclesPercent.toLocaleString("fr-FR")} %`, color: "#b45309" }]} />
    <DetailFacts items={[{ label: "Route", value: segment.road }, { label: "Tronçon", value: segment.name }, { label: "Part de poids lourds", value: segment.heavyVehiclesPercent === null ? "Non renseignée" : `${segment.heavyVehiclesPercent.toLocaleString("fr-FR")} %` }, { label: "Comptage", value: segment.countingType || "Non renseigné" }]} />
    <DetailData hint="Tronçons de la même route, comptages et méthode">
    <DetailTable caption={`Tronçons · ${segment.road}`} headers={["Tronçon", "Année", "TMJA", "Poids lourds", "Comptage"]} rows={data.segments.filter(s => s.road === segment.road).map(s => [s.name, s.year, s.vehicles === null ? "Sans comptage" : trafficValue(s.vehicles), s.heavyVehiclesPercent === null ? "Non renseignée" : `${s.heavyVehiclesPercent} %`, s.countingType || "Non renseigné"])} />
    <DetailSection title="Lire cette donnée">
      <p className="text-sm">Le TMJA correspond au nombre moyen de véhicules passant chaque jour sur ce tronçon, calculé sur l’année indiquée. Ce n’est ni un total annuel, ni une mesure en temps réel. Une même route peut présenter plusieurs volumes selon ses sections.</p>
      {segment.vehicles === null && <p className={`${styles.notice} mt-4`}>Le tracé est publié, mais aucun comptage exploitable n’est disponible pour {segment.year}. Aucune valeur n’est extrapolée depuis un tronçon voisin ou une autre année.</p>}
    </DetailSection>
    <DetailSection title="Source et géométrie">
      <p className="text-sm text-slate-600">DDT de Haute-Savoie · comptages des gestionnaires routiers · géométrie BD CARTO. {segment.sourceId ? `Identifiant publié : ${segment.sourceId}. ` : ""}Licence Ouverte 2.0.</p>
      {data.fetchedAt && <p className="text-xs text-slate-500 mt-2">Données récupérées le {new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p>}
      <a className={`${styles.source} mt-4`} href={TRAFFIC_SOURCE_URL} target="_blank" rel="noreferrer">Jeu de données officiel<ExternalLink size={14} /></a>
    </DetailSection>
    </DetailData>
    <DetailLimits sources={<a href={TRAFFIC_SOURCE_URL} target="_blank" rel="noreferrer">DDT de Haute-Savoie · Licence Ouverte 2.0</a>}><p>Volume de circulation, pas un indicateur de congestion ni de pollution. Les deux sens sont cumulés ; ne pas additionner les tronçons. Les couleurs sont des classes de volume choisies pour cet atlas, pas des seuils de risque. Aucun comptage manquant n’est extrapolé depuis une autre année ou un tronçon voisin.</p>{data.fetchedAt && <p>Données récupérées le {new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p>}</DetailLimits>
  </>;
}
