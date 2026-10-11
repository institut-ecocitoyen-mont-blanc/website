"use client";

import { Fragment, useState } from "react";
import { GeoJSON, Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog, { DetailFacts } from "./AtlasDetailDialog";
import EvidenceLayerControl, { georisquesPin } from "./EvidenceLayerControl";
import { GEORISQUES_SOURCE, soilRecordColor, type GeorisquesData, type GeorisquesSite } from "@/atlas/lib/georisques";
import styles from "./AtlasDetails.module.css";
import LayerAbout from "./LayerAbout";
import { useAtlasUrlLayer, useAtlasUrlPin } from "./useAtlasUrlState";
import { DetailData, DetailHeadline, DetailLimits, DetailTable } from "./DetailCard";

const date = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "Non renseignée";
export function useGeorisquesLayer(data: GeorisquesData) {
  const [enabled, setEnabled] = useAtlasUrlLayer("georisques"), [opacity, setOpacity] = useState(0.9);
  const [selectedId, setSelectedId] = useAtlasUrlPin("georisques");
  const selected = data.sites.find(site => site.id === selectedId);
  const setSelected = (site: GeorisquesSite | null) => setSelectedId(site?.id);
  const controls = <EvidenceLayerControl title="Géorisques" source="Sols, installations et sites inspectés · État" enabled={enabled} onEnabled={setEnabled} opacityControl={data.sites.some(site => site.geometry.type === "MultiPolygon") ? { value: opacity, onChange: setOpacity } : undefined}>
    {data.fetchedAt ? <p>{data.sites.length} entrées cartographiées · {data.sites.reduce((sum, site) => sum + site.records.length, 0)} dossiers officiels. Un même site physique peut relever de plusieurs catégories.</p> : <p role="status" className="text-amber-800">Catalogue indisponible ou en cours de chargement. Aucune absence de pollution ne peut en être déduite.</p>}
    <p><span style={{ color: "#925323" }}>●</span> Brun : dossier d’instruction. <span style={{ color: "#7c3aed" }}>●</span> Violet : secteur SIS. <span style={{ color: "#247184" }}>●</span> Bleu pétrole : installation ou site inspecté. Couleurs de catégories, pas de gravité.</p>
    {data.errors.map((error) => <p key={error} role="alert" className="text-amber-800">{error}</p>)}
    {data.fetchedAt && <p>Catalogue récupéré le {date(data.fetchedAt)} · import automatique quotidien.</p>}
    <LayerAbout>
    <p>Dossiers de pollution des sols, secteurs SIS, installations classées et autres sites inspectés, y compris « Non ICPE ». Périmètre limité aux 10 communes. CASIAS n’est pas inclus.</p>
    {data.installations && <p>{data.installations.mapped} installations ou sites inspectés cartographiés. Leur présence ne constitue pas une preuve de pollution.{data.installations.missingCoordinates > 0 && ` ${data.installations.missingCoordinates} sans coordonnées publiées.`}{data.installations.outsideTerritory > 0 && ` ${data.installations.outsideTerritory} repères hors des limites communales exclus.`}</p>}
    <p>Les zones publiées sont dessinées ; les autres dossiers sont des repères ponctuels.</p>
    {data.transport?.startsWith("wfs") && <p>Source sols : service cartographique officiel Géorisques (WFS). Certains statuts et dates de dossier ne sont pas publiés dans ce service.</p>}
    <a className="text-blue-iec underline" href={GEORISQUES_SOURCE} target="_blank" rel="noreferrer">Consulter Géorisques</a>
    </LayerAbout>
  </EvidenceLayerControl>;
  const markers = enabled && data.sites.map((site) => {
    // For polygons this is a boundary anchor for opening the zone's dossier,
    // not a newly invented sampling coordinate or pollution-source position.
    const [lng, lat] = site.geometry.type === "Point" ? site.geometry.coordinates : site.geometry.coordinates[0][0][0];
    return <Fragment key={site.id}>
      {site.geometry.type === "MultiPolygon" && <GeoJSON key={JSON.stringify(site.geometry)} data={site.geometry} style={{ color: soilRecordColor(site), weight: 2, opacity, fillOpacity: opacity * 0.2 }} eventHandlers={{ click: () => setSelected(site) }} />}
      <AtlasMarker position={[lat, lng]} title={`Géorisques · ${site.name}`} icon={georisquesPin(site.records.some((record) => record.kind === "sis") ? "sis" : site.records[0].kind)} opacity={opacity} attribution="Géorisques · Ministère de la Transition écologique / BRGM · Licence Ouverte" onSelect={() => setSelected(site)}><Tooltip>{site.name} · {site.commune}</Tooltip></AtlasMarker>
    </Fragment>;
  });
  const details = selected && <AtlasDetailDialog kind="georisques" title={selected.name} subtitle={`${selected.commune} · ${selected.records.some(record => record.kind === "installation") ? "Installation ou site inspecté" : "Sites et sols pollués"} · Géorisques`} onClose={() => setSelected(null)}>
    <DetailHeadline title={`${selected.records.length} dossier${selected.records.length > 1 ? "s" : ""} officiel${selected.records.length > 1 ? "s" : ""}`} subtitle="Suivi administratif · aucune classe de gravité" color={soilRecordColor(selected)} />
    <div className={styles.chips}>{selected.records.map(record => <span className={styles.chip} key={`${record.kind}-${record.id}`}>{record.kind === "sis" ? "SIS" : record.kind === "installation" ? "Installation" : "Instruction"} · {record.kind === "installation" ? record.id : record.sisId || record.id}</span>)}</div>
    <DetailFacts items={[{ label: "Commune", value: selected.commune }, { label: "Adresse publiée", value: selected.address }, { label: "Géométrie", value: selected.geometry.type === "Point" ? "Repère ponctuel du dossier" : "Emprise publiée, découpée aux limites du territoire" }]} />
    <DetailData hint="Dossiers, dates et fiches officielles">
    <DetailTable caption="Dates publiées · mises à jour et inspections" headers={["Dossier", "Mise à jour", "Dernière inspection"]} rows={selected.records.map(r => [r.kind === "installation" ? r.id : r.sisId || r.id, date(r.updatedAt), r.kind === "installation" ? date(r.lastInspectionAt) : "Sans objet"])} />
    <DetailTable caption="Dossiers officiels" headers={["Type · identifiant", "Statut publié", "Régime · Seveso", "Service d’inspection", "Source"]} rows={selected.records.map(record => [
      `${record.kind === "sis" ? "Secteur d’information sur les sols (SIS)" : record.kind === "installation" ? "Installation classée ou autre site inspecté" : "Dossier de pollution des sols"} · ${record.kind === "installation" ? record.id : record.sisId || record.id}`,
      record.status || "Non renseigné", record.kind === "installation" ? `${record.regime || "Non renseigné"} · ${record.seveso || "Non renseigné"}` : "Sans objet",
      record.kind === "installation" ? record.inspectionService || "Non renseigné" : "Sans objet",
      <a key={record.id} className={styles.source} href={record.url} target="_blank" rel="noreferrer">Fiche officielle</a>,
    ])} />
    </DetailData>
    <DetailLimits sources={<a href={GEORISQUES_SOURCE} target="_blank" rel="noreferrer">Géorisques · État / BRGM · Licence Ouverte</a>}><p>{selected.records.some(record => record.kind === "installation") ? "Cette fiche décrit un établissement suivi administrativement ou inspecté, pas une mesure de pollution. Le régime « Non ICPE » est conservé lorsqu’il est publié. Une inspection ne prouve ni une contamination ni une conformité actuelle ; aucune gravité sanitaire n’est déduite ici." : "Ces dossiers décrivent des situations administratives de pollution suspectée ou avérée. Un statut « clôturé » ne signifie pas à lui seul une absence de pollution. Les contours ne décrivent pas nécessairement toute l’étendue d’une contamination ; aucune concentration ni gravité sanitaire n’est déduite ici."} Les couleurs indiquent des catégories, pas une gravité. Les dates sont celles des dossiers, pas des mesures.</p><p>Les dossiers d’instruction et SIS d’un même site peuvent être regroupés. Les installations restent identifiées séparément par leur code AIOT et peuvent correspondre à un site déjà présent dans l’inventaire ou les dossiers sols : ce ne sont pas nécessairement des sites physiques distincts. Les émissions industrielles annuelles restent dans les fiches de l’inventaire.</p>{data.fetchedAt && <p>Catalogue récupéré le {date(data.fetchedAt)}.</p>}</DetailLimits>
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled) };
}
