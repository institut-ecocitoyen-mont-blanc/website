"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "react-leaflet";
import AtlasMarker from "./AtlasMarker";
import AtlasDetailDialog, { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import EvidenceLayerControl, { groundwaterPin } from "./EvidenceLayerControl";
import { coordinatePrecision, groundwaterAnalysisUrl, groundwaterStationUrl, groundwaterResultLabel, groundwaterResultUnit, loadGroundwaterAnalyses, GROUNDWATER_RESULT_LIMIT, GROUNDWATER_SOURCE, type GroundwaterAnalysis, type GroundwaterCatalogue, type GroundwaterResults, type GroundwaterStation } from "@/atlas/lib/groundwater";
import styles from "./AtlasDetails.module.css";

const date = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "Non renseignée";
function GroundwaterDetails({ station }: { station: GroundwaterStation }) {
  const [results, setResults] = useState<GroundwaterResults | null>(null), [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0), [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setResults(null); setError(false);
    loadGroundwaterAnalyses(station, controller.signal).then((value) => { if (!controller.signal.aborted) setResults(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [station, attempt]);
  const groups = new Map<string, GroundwaterAnalysis[]>();
  for (const analysis of results?.analyses ?? []) {
    if (!analysis.name.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))) continue;
    // Keep fractions/units distinct; never turn heterogeneous values into a trend.
    const key = JSON.stringify([analysis.parameter, analysis.fraction, analysis.unit]);
    groups.set(key, [...(groups.get(key) ?? []), analysis]);
  }
  return <>
    <DetailFacts items={[{ label: "Identifiant BSS", value: station.id }, { label: "Commune", value: station.commune }, { label: "Nature du point", value: station.nature }, { label: "Dernière mesure annoncée au catalogue", value: date(station.lastMeasurement) }]} />
    <p className={styles.notice}>Localisation publiée : {coordinatePrecision(station.precision)}. Ce repère ne garantit pas l’emplacement précis du prélèvement. Les coordonnées peuvent être dégradées par le fournisseur.</p>
    <DetailSection title="Analyses des eaux souterraines" description="Résultats et qualifications publiés par Hub’Eau / ADES, sans score sanitaire calculé.">
      {error ? <div role="alert" className={styles.notice}>Les analyses n’ont pas pu être récupérées. <button className="underline" onClick={() => setAttempt((value) => value + 1)}>Réessayer</button></div> : !results ? <p role="status">Chargement des analyses…</p> : !results.analyses.length ? <p className={styles.notice}>Aucune analyse accessible pour ce point. Une date dans le catalogue ne garantit pas la disponibilité des résultats et ne signifie pas une absence de pollution.</p> : <>
        <p className="mb-3 text-sm text-slate-600">{results.analyses.length} résultats affichés sur {results.total.toLocaleString("fr-FR")} disponibles. Dernier prélèvement récupéré : {date(results.analyses[0].date)}.</p>
        {results.more && <p className="mb-4 text-xs text-slate-500">Fenêtre limitée aux {GROUNDWATER_RESULT_LIMIT} derniers résultats : elle peut ne pas couvrir tous les paramètres d’un prélèvement ni tout l’historique. Le lien source donne accès au catalogue complet et à sa pagination.</p>}
        <label className="mb-4 block text-sm text-slate-600">Rechercher un paramètre parmi les résultats affichés<input type="search" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nitrates, arsenic, pesticides…" /></label>
        {!groups.size && <p className="text-sm text-slate-500">Aucun paramètre correspondant dans les résultats chargés.</p>}
        <div className={styles.parameters}>{[...groups].sort(([, a], [, b]) => a[0].name.localeCompare(b[0].name, "fr")).map(([key, values]) => <details className={styles.parameter} key={key}>
          <summary><div><strong>{values[0].name}</strong><small>{date(values[0].date)} · {values[0].fraction || "Fraction non renseignée"}</small></div><div className={styles.value}>{groundwaterResultLabel(values[0])} <span>{groundwaterResultUnit(values[0])}</span></div></summary>
          <ul className={styles.results}>{values.map((analysis, index) => <li key={index}><p className="font-semibold">{new Date(analysis.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris) · {groundwaterResultLabel(analysis)} {groundwaterResultUnit(analysis)}</p><p>{analysis.remark || "Remarque non renseignée"}</p><p>Qualification des données : {analysis.qualification || "Non renseignée"}</p><p>Statut : {analysis.status || "Non renseigné"}</p></li>)}</ul>
        </details>)}</div>
      </>}
    </DetailSection>
    <DetailSection title="Sources et limites"><p className={styles.notice}>Une qualification « correcte » porte sur la validité des données, pas sur la qualité sanitaire de l’eau. Un résultat sous un seuil de détection ou de quantification n’est pas une concentration exacte ni une preuve de conformité. Ces eaux souterraines ne sont pas assimilées à l’eau potable distribuée.</p>
      {station.networks.length > 0 && <p className="mt-4 text-sm text-slate-600">Réseaux : {station.networks.join(" · ")}</p>}
      <p className="mt-4 flex flex-wrap gap-4"><a className={styles.source} href={groundwaterAnalysisUrl(station.id)} target="_blank" rel="noreferrer">Résultats sources · Hub’Eau</a><a className={styles.source} href={groundwaterStationUrl(station.id)} target="_blank" rel="noreferrer">Fiche du point · ADES / Hub’Eau</a></p>
    </DetailSection>
  </>;
}
export function useGroundwaterLayer(data: GroundwaterCatalogue) {
  const [enabled, setEnabled] = useState(false), [opacity, setOpacity] = useState(0.9);
  const [selected, setSelected] = useState<GroundwaterStation | null>(null);
  const controls = <EvidenceLayerControl title="Qualité des eaux souterraines" source="Hub’Eau · ADES" enabled={enabled} onEnabled={setEnabled} opacity={opacity} onOpacity={setOpacity}>
    <p>Analyses chimiques aux points de suivi : paramètres, valeurs, unités, dates et qualifications.</p>
    <p>{data.stations.length} points avec analyses disponibles. Les points sans résultats accessibles sont masqués. Le détail des analyses est chargé à l’ouverture d’une fiche.</p>
    <p>Goutte à contour : aucune classe de qualité globale déduite des résultats. Repères publiés, sans garantie de localisation précise des prélèvements.</p>
    {data.error && <p role="alert" className="text-amber-800">{data.error}</p>}
    {data.fetchedAt && <p>Catalogue récupéré le {date(data.fetchedAt)} · actualisation à la reconstruction du site.</p>}
    <a className="text-blue-iec underline" href={GROUNDWATER_SOURCE} target="_blank" rel="noreferrer">Consulter la source</a>
  </EvidenceLayerControl>;
  const markers = enabled && data.stations.map((station) => <AtlasMarker key={station.id} position={[station.lat, station.lng]} icon={groundwaterPin()} opacity={opacity} title={`Eaux souterraines · ${station.name} · ${station.id}`} attribution="Hub’Eau / ADES · coordonnées publiées, précision variable" onSelect={() => setSelected(station)}><Tooltip>{station.name} · {station.commune}<br />Repère de localisation non précise</Tooltip></AtlasMarker>);
  const details = selected && <AtlasDetailDialog kind="groundwater" title={selected.name} subtitle={`${selected.commune} · Hub’Eau / ADES · Eaux souterraines`} onClose={() => setSelected(null)}><GroundwaterDetails key={selected.id} station={selected} /></AtlasDetailDialog>;
  return { controls, markers, details, activeCount: Number(enabled) };
}
