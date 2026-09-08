"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { QualitySummary } from "./EnvironmentalPin";
import { analysisUrl, fetchJson, rows, asText, type LayerPoint, type Row } from "@/lib/environmental-layers";
import type { Quality } from "@/lib/environmental-quality";
import styles from "./AtlasDetails.module.css";

const dateLabel = (value: unknown) => {
  const raw = asText(value), date = new Date(raw);
  return !raw || Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
};
const networkNames = (row: Row) => Array.isArray(row.reseaux) ? row.reseaux.map((r: Row) => asText(r.nom)).join(", ") : "Réseau non renseigné";
const resultValue = (row: Row) => asText(row.resultat_alphanumerique ?? row.resultat ?? row.resultat_numerique) || "Non renseigné";
const resultUnit = (row: Row) => asText(row.libelle_unite ?? row.symbole_unite);

export default function AtlasWaterDetails({ kind, point, quality, sample }: { kind: "rivers" | "drinking"; point: LayerPoint; quality: Quality; sample?: Row }) {
  const [data, setData] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const url = analysisUrl(kind, point.id);
  useEffect(() => {
    const controller = new AbortController();
    setError(null); setData(null);
    fetchJson(url, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(rows(result));
    }).catch(() => { if (!controller.signal.aborted) setError("Les analyses sont temporairement indisponibles. Réessayez."); });
    return () => controller.abort();
  }, [url, attempt]);
  // Preserve every result, date, unit and qualifier. Only group the presentation.
  const groups = new Map<string, Row[]>();
  for (const row of data ?? []) {
    const key = asText(row.code_parametre) || asText(row.libelle_parametre) || "Paramètre non renseigné";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return <>
    <DetailFacts items={[
      { label: kind === "rivers" ? "Station de suivi" : "Code commune", value: point.id },
      { label: "Coordonnées du repère", value: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` },
      { label: "Source", value: kind === "rivers" ? "Hub’Eau · Naïades" : "Contrôle sanitaire · ARS" },
    ]} />
    <QualitySummary quality={quality} />
    {sample && <div className={styles.notice}><p className="font-semibold">Prélèvement {asText(sample.code_prelevement)} · {networkNames(sample)}</p><p className="mt-2">{asText(sample.conclusion_conformite_prelevement)}</p></div>}
    {kind === "drinking" && <p className={styles.notice}>Repère communal, pas un lieu de prélèvement. Une commune peut avoir plusieurs réseaux ; ces résultats ne décrivent pas toute l’eau distribuée dans la commune.</p>}
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
      <a href={url} target="_blank" rel="noreferrer" className={`${styles.source} mt-4`}>Données sources · Hub’Eau<ExternalLink size={14} /></a>
    </DetailSection>
  </>;
}
