"use client";

import { Fragment, useState } from "react";
import { GeoJSON, Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import EvidenceLayerControl, { georisquesPin } from "./EvidenceLayerControl";
import { GEORISQUES_SOURCE, soilRecordColor, type GeorisquesData, type GeorisquesSite } from "@/atlas/lib/georisques";
import styles from "./AtlasDetails.module.css";
import { useAtlasUrlLayer, useAtlasUrlPin } from "./useAtlasUrlState";

const date = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "Non renseignée";
export function useGeorisquesLayer(data: GeorisquesData) {
  const [enabled, setEnabled] = useAtlasUrlLayer("georisques"), [opacity, setOpacity] = useState(0.9);
  const [selectedId, setSelectedId] = useAtlasUrlPin("georisques");
  const selected = data.sites.find(site => site.id === selectedId);
  const setSelected = (site: GeorisquesSite | null) => setSelectedId(site?.id);
  const controls = <EvidenceLayerControl title="Géorisques" source="Sols, installations et sites inspectés · État" enabled={enabled} onEnabled={setEnabled} opacityControl={data.sites.some(site => site.geometry.type === "MultiPolygon") ? { value: opacity, onChange: setOpacity } : undefined}>
    <p>Dossiers de pollution des sols, secteurs SIS, installations classées et autres sites inspectés, y compris « Non ICPE ». Périmètre limité aux 10 communes. CASIAS n’est pas inclus.</p>
    {data.fetchedAt ? <p>{data.sites.length} entrées cartographiées · {data.sites.reduce((sum, site) => sum + site.records.length, 0)} dossiers officiels. Un même site physique peut relever de plusieurs catégories.</p> : <p role="status" className="text-amber-800">Catalogue indisponible ou en cours de chargement. Aucune absence de pollution ne peut en être déduite.</p>}
    {data.installations && <p>{data.installations.mapped} installations ou sites inspectés cartographiés. Leur présence ne constitue pas une preuve de pollution.{data.installations.missingCoordinates > 0 && ` ${data.installations.missingCoordinates} sans coordonnées publiées.`}{data.installations.outsideTerritory > 0 && ` ${data.installations.outsideTerritory} repères hors des limites communales exclus.`}</p>}
    <p><span style={{ color: "#925323" }}>●</span> Brun : dossier d’instruction. <span style={{ color: "#7c3aed" }}>●</span> Violet : secteur SIS. <span style={{ color: "#247184" }}>●</span> Bleu pétrole : installation ou site inspecté. Couleurs de catégories, pas de gravité.</p>
    <p>Les zones publiées sont dessinées ; les autres dossiers sont des repères ponctuels.</p>
    {data.transport?.startsWith("wfs") && <p>Source sols : service cartographique officiel Géorisques (WFS). Certains statuts et dates de dossier ne sont pas publiés dans ce service.</p>}
    {data.errors.map((error) => <p key={error} role="alert" className="text-amber-800">{error}</p>)}
    {data.fetchedAt && <p>Catalogue récupéré le {date(data.fetchedAt)} · import automatique quotidien.</p>}
    <a className="text-blue-iec underline" href={GEORISQUES_SOURCE} target="_blank" rel="noreferrer">Consulter Géorisques</a>
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
    <DetailFacts items={[{ label: "Commune", value: selected.commune }, { label: "Adresse publiée", value: selected.address }, { label: "Géométrie", value: selected.geometry.type === "Point" ? "Repère ponctuel du dossier" : "Emprise publiée, découpée aux limites du territoire" }]} />
    <DetailSection title="Dossiers officiels" description="Les dates de mise à jour et d’inspection sont indiquées séparément. Ce ne sont pas des dates de mesures de pollution.">
      <div className={styles.cards}>{selected.records.map((record) => <article key={`${record.kind}-${record.id}`} className={styles.card}>
        <h4 className="mb-4 font-semibold text-blue-iec">{record.kind === "sis" ? "Secteur d’information sur les sols (SIS)" : record.kind === "installation" ? "Installation classée ou autre site inspecté" : "Dossier de pollution des sols"}</h4>
        <dl className="space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Identifiant</dt><dd>{record.kind === "installation" ? record.id : record.sisId || record.id}</dd></div><div><dt className="text-xs text-slate-500">{record.kind === "installation" ? "État d’activité publié" : "Statut administratif publié"}</dt><dd>{record.status || "Non renseigné"}</dd></div><div><dt className="text-xs text-slate-500">Mise à jour du dossier</dt><dd>{date(record.updatedAt)}</dd></div></dl>
        {record.kind === "installation" && <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="text-xs text-slate-500">Régime en vigueur</dt><dd>{record.regime || "Non renseigné"}</dd></div>
          <div><dt className="text-xs text-slate-500">Statut Seveso</dt><dd>{record.seveso || "Non renseigné"}</dd></div>
          <div><dt className="text-xs text-slate-500">Service d’inspection</dt><dd>{record.inspectionService || "Non renseigné"}</dd></div>
          <div><dt className="text-xs text-slate-500">Dernière inspection publiée</dt><dd>{date(record.lastInspectionAt)}</dd></div>
        </dl>}
        <a className={`${styles.source} mt-5`} href={record.url} target="_blank" rel="noreferrer">Ouvrir la fiche officielle</a>
      </article>)}</div>
    </DetailSection>
    <DetailSection title="Comment lire cette couche ?"><p className={styles.notice}>{selected.records.some(record => record.kind === "installation") ? "Cette fiche décrit un établissement suivi administrativement ou inspecté, pas une mesure de pollution. Le régime « Non ICPE » est conservé lorsqu’il est publié. Une inspection ne prouve ni une contamination ni une conformité actuelle ; aucune gravité sanitaire n’est déduite ici." : "Ces dossiers décrivent des situations administratives de pollution suspectée ou avérée. Un statut « clôturé » ne signifie pas à lui seul une absence de pollution. Les contours ne décrivent pas nécessairement toute l’étendue d’une contamination ; aucune concentration ni gravité sanitaire n’est déduite ici."}</p><p className="mt-4 text-sm text-slate-600">Les dossiers d’instruction et SIS d’un même site peuvent être regroupés. Les installations restent identifiées séparément par leur code AIOT et peuvent correspondre à un site déjà présent dans l’inventaire ou les dossiers sols : ce ne sont pas nécessairement des sites physiques distincts. Les émissions industrielles annuelles restent dans les fiches de l’inventaire.</p></DetailSection>
  </AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled) };
}
