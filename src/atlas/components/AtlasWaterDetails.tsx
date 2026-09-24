"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { QualitySummary } from "./EnvironmentalPin";
import { analysisUrl, asText, type LayerPoint, type Row } from "@/atlas/lib/environmental-layers";
import { loadPublishedData } from "@/atlas/lib/published-data";
import type { Quality } from "@/atlas/lib/environmental-quality";
import type { DrinkingNetwork } from "@/atlas/lib/drinking-networks";
import { riverAssessmentUrl, riverChemicalLabel, type RiverAssessment } from "@/atlas/lib/river-assessments";
import styles from "./AtlasDetails.module.css";

const dateLabel = (value: unknown) => {
  const raw = asText(value), date = new Date(raw);
  return !raw || Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
};
const networkNames = (row: Row) => Array.isArray(row.reseaux) ? row.reseaux.map((r: Row) => asText(r.nom)).join(", ") : "Réseau non renseigné";
const resultValue = (row: Row) => asText(row.resultat_alphanumerique ?? row.resultat ?? row.resultat_numerique) || "Non renseigné";
const resultUnit = (row: Row) => asText(row.libelle_unite ?? row.symbole_unite);

export default function AtlasWaterDetails({ kind, point, quality, sample, network, assessment, assessmentFetchedAt }: { kind: "rivers" | "drinking"; point: LayerPoint; quality: Quality; sample?: Row; network?: DrinkingNetwork; assessment?: RiverAssessment; assessmentFetchedAt?: string | null }) {
  const [data, setData] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const url = kind === "drinking" && !network ? null : analysisUrl(kind, network?.id ?? point.id);
  useEffect(() => {
    const controller = new AbortController();
    setError(null); setData(null);
    if (!url) return () => controller.abort();
    loadPublishedData<Row[]>(`${kind === "rivers" ? "river" : "drinking"}-${(network?.id ?? point.id).toLowerCase()}`, controller.signal).then((data) => {
      if (network && data.some((r) => !Array.isArray(r.reseaux) || !r.reseaux.some((n: Row) => asText(n.code) === network.id))) throw new Error("Réseau incorrect.");
      if (!controller.signal.aborted) setData(data);
    }).catch(() => { if (!controller.signal.aborted) setError("Les analyses sont temporairement indisponibles. Réessayez."); });
    return () => controller.abort();
  }, [url, attempt, network, kind, point.id]);
  // Preserve every result, date, unit and qualifier. Only group the presentation.
  const groups = new Map<string, Row[]>();
  for (const row of data ?? []) {
    const key = asText(row.code_parametre) || asText(row.libelle_parametre) || "Paramètre non renseigné";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return <>
    <DetailFacts items={[
      { label: kind === "rivers" ? "Station de suivi" : "Réseau de distribution", value: network?.id ?? point.id },
      { label: "Coordonnées du repère", value: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` },
      { label: "Source", value: kind === "rivers" ? "Hub’Eau · Naïades" : "Contrôle sanitaire · ARS" },
    ]} />
    <QualitySummary quality={quality} />
    {kind === "rivers" && <DetailSection title="Évaluation officielle à la station">
      {assessment && <><p className="font-semibold">{riverChemicalLabel(assessment)}</p>{assessment.chemicalDowngraders && <p className="mt-2 text-sm">Paramètres déclassants publiés : {assessment.chemicalDowngraders}</p>}<p className="mt-2 text-sm text-slate-600">Année de l’évaluation : {assessment.year}. L’état chimique est distinct de l’état ou du potentiel écologique qui colore le repère. Ces classes ne déterminent pas si l’eau est potable ou baignable.</p></>}
      {assessmentFetchedAt && <p className="mt-2 text-xs text-slate-500">Évaluations récupérées le {dateLabel(assessmentFetchedAt)} · import automatique quotidien.</p>}
      <a href={riverAssessmentUrl(point.id)} target="_blank" rel="noreferrer" className={`${styles.source} mt-4`}>Évaluation et méthode · Agence de l’eau<ExternalLink size={14} /></a>
    </DetailSection>}
    {sample && <div className={styles.notice}><p className="font-semibold">Prélèvement {asText(sample.code_prelevement)} · {networkNames(sample)}</p><p className="mt-2">{asText(sample.conclusion_conformite_prelevement)}</p></div>}
    {kind === "drinking" && <p className={styles.notice}>Résultats du réseau {network?.name} uniquement. Les prélèvements de ce réseau peuvent se situer hors de la commune ; les coordonnées affichées sont celles du repère communal.</p>}
    <DetailSection title="Analyses disponibles" description="Les paramètres mesurés, leurs valeurs et leurs dates. Dépliez un paramètre pour consulter les détails publiés.">
      {error ? <div role="alert" className={styles.notice}>{error} <button className="underline" onClick={() => setAttempt((n) => n + 1)}>Réessayer</button></div> : !data ? <p role="status" className={styles.notice}>Chargement des analyses…</p> : !data.length ? <p className={styles.notice}>Aucune analyse disponible pour ce point.</p> : <>
        <p className="mb-4 text-xs text-slate-500">10 derniers résultats au maximum</p>
        <div className={styles.parameters}>{[...groups].map(([key, values]) => {
          const row = values[0];
          return <details key={key} className={styles.parameter}>
            <summary><div><strong>{asText(row.libelle_parametre) || "Paramètre non renseigné"}</strong><small>{dateLabel(row.date_prelevement)} · {values.length} résultat{values.length > 1 ? "s" : ""}</small></div><div className={styles.value}>{resultValue(row)} <span>{resultUnit(row)}</span></div></summary>
            <ul className={styles.results}>{values.map((result, index) => <li key={index}>
              <p className="font-semibold">{dateLabel(result.date_prelevement)} · {resultValue(result)} {resultUnit(result)}</p>
              {kind === "rivers" ? <p>{asText(result.mnemo_remarque)}</p> : <>
                <p>Réseau : {networkNames(result)}</p><p>{asText(result.conclusion_conformite_prelevement)}</p>
                {!!result.limite_qualite_parametre && <p>Limite publiée : {asText(result.limite_qualite_parametre)}</p>}
                {!!result.reference_qualite_parametre && <p>Référence publiée : {asText(result.reference_qualite_parametre)}</p>}
              </>}
            </li>)}</ul>
          </details>;
        })}</div>
      </>}
    </DetailSection>
    <DetailSection title="À propos de ces données">
      <p className={styles.notice}>Les dates sont celles des prélèvements. Une absence de mesure n’indique pas une absence de pollution. Les résultats sont reproduits avec leurs unités et qualifications ; aucune conformité n’est déduite d’un simple seuil de quantification.</p>
      {url && <a href={url} target="_blank" rel="noreferrer" className={`${styles.source} mt-4`}>Données sources · Hub’Eau<ExternalLink size={14} /></a>}
    </DetailSection>
  </>;
}
