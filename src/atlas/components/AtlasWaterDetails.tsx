"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { DetailData, DetailHeadline, DetailLimits, DetailStats, DetailTable } from "./DetailCard";
import { QUALITY_COLORS } from "@/atlas/lib/environmental-quality";
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

export default function AtlasWaterDetails({ kind, point, quality, sample, network, assessment, assessmentFetchedAt, networkControls, networkContext }: { kind: "rivers" | "drinking"; point: LayerPoint; quality: Quality; sample?: Row; network?: DrinkingNetwork; assessment?: RiverAssessment; assessmentFetchedAt?: string | null; networkControls?: ReactNode; networkContext?: ReactNode }) {
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
  const latestRows = [...groups.values()].map(values => values[0]);
  return <>
    <DetailHeadline title={quality.label} subtitle={kind === "rivers" ? "Évaluation officielle à la station · Agence de l’eau" : `Dernier prélèvement · ${network?.name ?? "Réseau"}`} color={quality.level === "unknown" ? "#e2e8f0" : QUALITY_COLORS[quality.level]} date={kind === "rivers" ? assessment?.year : sample ? dateLabel(sample.date_prelevement) : undefined} />
    {networkControls}
    {error ? <div role="alert" className={styles.visual}>{error} <button className="underline" onClick={() => setAttempt(n => n + 1)}>Réessayer</button></div> : !data ? <p role="status" className={styles.visual}>Chargement des analyses…</p> : !data.length ? <p className={styles.visual}>Aucune analyse disponible pour ce point.</p> : <DetailStats items={latestRows.slice(0, 6).map(row => ({ label: asText(row.libelle_parametre) || "Paramètre non renseigné", value: resultValue(row), unit: resultUnit(row), note: <>{dateLabel(row.date_prelevement)}{kind === "rivers" ? <> · {asText(row.mnemo_remarque)}</> : row.limite_qualite_parametre ? <> · Limite publiée : {asText(row.limite_qualite_parametre)}</> : null}</> }))} />}
    <DetailFacts items={kind === "rivers" ? [
      { label: "État chimique officiel", value: assessment ? riverChemicalLabel(assessment) : "Non disponible" },
      { label: "Paramètres déclassants publiés", value: assessment?.chemicalDowngraders || "Non renseignés" },
      { label: "Analyses récupérées", value: data ? `${data.length} résultats · ${groups.size} paramètres` : "Chargement…" },
    ] : [{ label: "Réseau de distribution", value: network?.id }, { label: "Prélèvement", value: sample ? asText(sample.code_prelevement) : "Non renseigné" }]} />
    <DetailData hint={`${data?.length ?? 0} résultats · unités et qualifications`}>
      {sample && <DetailSection title="Conclusion du prélèvement"><p className="text-sm">{asText(sample.conclusion_conformite_prelevement)}</p><p className="text-xs text-slate-500">{networkNames(sample)}</p></DetailSection>}
      <DetailTable caption="Analyses disponibles · 10 derniers résultats au maximum" headers={kind === "rivers" ? ["Paramètre", "Date", "Résultat", "Remarque publiée"] : ["Paramètre", "Date", "Résultat", "Limite · référence", "Réseau · conclusion"]} rows={(data ?? []).map(row => [
        asText(row.libelle_parametre) || asText(row.code_parametre), dateLabel(row.date_prelevement), `${resultValue(row)} ${resultUnit(row)}`,
        ...(kind === "rivers" ? [asText(row.mnemo_remarque)] : [[asText(row.limite_qualite_parametre), asText(row.reference_qualite_parametre)].filter(Boolean).join(" · ") || "Non renseignées", `${networkNames(row)} · ${asText(row.conclusion_conformite_prelevement)}`]),
      ])} />
      <DetailSection title="Lire cette donnée"><p className="text-sm">{kind === "rivers" ? "L’état chimique est distinct de l’état ou du potentiel écologique qui colore le repère. Aucune classe par paramètre ni bilan sur 24 mois n’est déduit de cet extrait limité aux dix derniers résultats." : `Résultats du réseau ${network?.name} uniquement. Les limites et références sont reproduites dans leurs unités et formulations publiées.`}</p></DetailSection>
    </DetailData>
    <DetailLimits sources={<>{kind === "rivers" && <a href={riverAssessmentUrl(point.id)} target="_blank" rel="noreferrer">Évaluation et méthode · Agence de l’eau<ExternalLink size={12} className="inline ml-1" /></a>}{url && <a href={url} target="_blank" rel="noreferrer">Données sources · Hub’Eau</a>}</>}>
      {networkContext}
      {quality.historical && <p>Donnée historique · plus de 90 jours (repère de lecture, pas une durée de validité sanitaire).</p>}
      <p>{quality.detail} Les dates sont celles des prélèvements. Une absence de mesure n’indique pas une absence de pollution. Les résultats sont reproduits avec leurs unités et qualifications ; aucune conformité n’est déduite d’un simple seuil de quantification. {kind === "drinking" ? "Les prélèvements de ce réseau peuvent se situer hors de la commune ; le repère communal ne localise pas le prélèvement." : "Les classes écologiques et chimiques ne déterminent pas si l’eau est potable ou baignable."}</p>
      {assessmentFetchedAt && <p>Évaluations récupérées le {dateLabel(assessmentFetchedAt)} · import automatique quotidien.</p>}
    </DetailLimits>
  </>;
}
