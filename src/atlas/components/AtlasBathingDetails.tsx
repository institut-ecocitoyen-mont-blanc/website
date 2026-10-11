"use client";

import { ExternalLink } from "lucide-react";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { DetailData, DetailHeadline, DetailLimits, DetailStats } from "./DetailCard";
import { QUALITY_COLORS } from "@/atlas/lib/environmental-quality";
import { BATHING_CATALOGUE_URL, bathingQuality, bathingSamples, type BathingPoint } from "@/atlas/lib/bathing-water";
import styles from "./AtlasDetails.module.css";

const dateLabel = (date: string) => new Date(date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export default function AtlasBathingDetails({ point }: { point: BathingPoint }) {
  const samples = bathingSamples(point), latest = samples[0];
  const quality = bathingQuality(point);
  return <>
    <DetailHeadline title={quality.label} subtitle="Appréciation publiée du dernier prélèvement" date={latest ? dateLabel(latest.date) : "Non disponible"} color={quality.level === "unknown" ? "#e2e8f0" : QUALITY_COLORS[quality.level]} />
    <DetailStats items={[{ label: "Escherichia coli (E. coli)", value: latest?.ecoli ?? "Non renseigné", unit: latest?.ecoli != null ? "/100 mL" : "" }, { label: "Entérocoques intestinaux", value: latest?.enterococci ?? "Non renseigné", unit: latest?.enterococci != null ? "/100 mL" : "" }]} />
    <div className={styles.visual}><p className={styles.visualLabel}>Appréciations publiées · {samples.length} prélèvements</p><div className={styles.strip}>{[...samples].reverse().map((sample, i) => <span key={i} role="img" aria-label={`${dateLabel(sample.date)} · ${sample.assessment}`} title={`${dateLabel(sample.date)} · ${sample.assessment}`} style={{ background: sample.assessment === "Bon" ? QUALITY_COLORS.good : sample.assessment === "Moyen" ? QUALITY_COLORS.moderate : sample.assessment === "Mauvais" ? QUALITY_COLORS.poor : "#e2e8f0" }} />)}</div><p className="text-xs text-slate-500">{samples.length > 0 && `${dateLabel(samples.at(-1)!.date)} → ${dateLabel(samples[0].date)}`} · Un bloc par prélèvement, pas une échelle de temps.</p></div>
    <DetailFacts items={[{ label: "Site officiel", value: point.officialName }, { label: "Code européen", value: point.euId }]} />
    <DetailData hint={`${samples.length} prélèvements · ${point.seasons.length} saisons`}>
    <DetailSection title="Historique des prélèvements" description="Deux saisons consultées. Les signes « < » et « > » sont conservés : ce ne sont pas des valeurs exactes.">
      {point.seasons.map((season) => <div key={season.year} className="mb-6">
        <div className="mb-3 flex flex-wrap justify-between items-center gap-2"><h4 className="font-semibold">Saison {season.year}</h4><a className={styles.source} href={season.sourceUrl} target="_blank" rel="noreferrer">Résultats officiels {season.year}<ExternalLink size={13} /></a></div>
        {season.error ? <p role="alert" className={styles.notice}>{season.error}</p> : !season.samples.length ? <p className={styles.notice}>Aucun prélèvement publié pour cette saison.</p> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">Résultats de baignade {season.year} · {point.officialName}</caption>
            <thead className="bg-blue-50 text-blue-iec"><tr>{["Date", "E. coli /100 mL", "Entérocoques /100 mL", "Appréciation publiée"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody>{[...season.samples].sort((a, b) => b.date.localeCompare(a.date)).map((sample) => <tr key={sample.date} className="border-t border-slate-100"><th scope="row" className="whitespace-nowrap px-4 py-3 font-normal">{dateLabel(sample.date)}</th><td className="px-4 py-3">{sample.ecoli ?? "Non renseigné"}</td><td className="px-4 py-3">{sample.enterococci ?? "Non renseigné"}</td><td className="px-4 py-3">{sample.assessment}</td></tr>)}</tbody>
          </table>
        </div>}
      </div>)}
    </DetailSection>
    </DetailData>
    <DetailLimits sources={<a href={BATHING_CATALOGUE_URL} target="_blank" rel="noreferrer">Catalogue officiel des sites · Ministère de la Santé</a>}>
      <p>Ces contrôles microbiologiques ne couvrent pas tous les polluants chimiques. La couleur représente l’appréciation du dernier prélèvement disponible, même ancien ; elle ne décrit pas la situation en temps réel. Consultez les consignes et éventuelles interdictions sur place et sur le portail officiel.</p>
      {quality.historical && <p>Donnée historique · plus de 90 jours (repère de lecture, pas une durée de validité sanitaire).</p>}
      {point.seasons.map(season => season.fetchedAt && <p key={season.year}>Saison {season.year} · données récupérées le {dateLabel(season.fetchedAt)} · import automatique quotidien.</p>)}
      <p className="my-4 text-xs text-slate-600">Coordonnées publiées du site de baignade (ETRS89) : {point.lat.toFixed(5)}, {point.lng.toFixed(5)}. Elles ne localisent pas chaque prélèvement individuel. Code européen : {point.euId}.</p>
    </DetailLimits>
  </>;
}
