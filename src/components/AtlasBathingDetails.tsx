"use client";

import { ExternalLink } from "lucide-react";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import { QualitySummary } from "./EnvironmentalPin";
import { BATHING_CATALOGUE_URL, bathingQuality, bathingSamples, type BathingPoint } from "@/lib/bathing-water";
import styles from "./AtlasDetails.module.css";

const dateLabel = (date: string) => new Date(date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

export default function AtlasBathingDetails({ point }: { point: BathingPoint }) {
  const samples = bathingSamples(point), latest = samples[0];
  return <>
    <DetailFacts items={[
      { label: "Site officiel", value: point.officialName },
      { label: "Commune", value: point.commune },
      { label: "Dernier prélèvement", value: latest ? dateLabel(latest.date) : "Non disponible" },
      { label: "Identifiant du site", value: point.id },
    ]} />
    <QualitySummary quality={bathingQuality(point)} />
    <DetailSection title="Dernières mesures" description={latest ? `Prélèvement du ${dateLabel(latest.date)} · résultats publiés par le ministère` : "Aucune mesure récupérée pour ce site."}>
      <div className={styles.cards}>
        {[{ label: "Escherichia coli (E. coli)", value: latest?.ecoli }, { label: "Entérocoques intestinaux", value: latest?.enterococci }].map(({ label, value }) => <article key={label} className={styles.card}>
          <h4 className="text-sm font-semibold text-slate-600">{label}</h4>
          <p className="mt-4 text-3xl font-semibold text-blue-iec">{value ?? "Non renseigné"}<span className="ml-2 text-sm font-normal text-slate-500">{value !== null && value !== undefined ? "/100 mL" : ""}</span></p>
        </article>)}
      </div>
    </DetailSection>
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
        {season.fetchedAt && <p className="mt-2 text-xs text-slate-500">Données récupérées le {dateLabel(season.fetchedAt)} · actualisées à la reconstruction du site.</p>}
      </div>)}
    </DetailSection>
    <DetailSection title="À propos du suivi sanitaire">
      <p className={styles.notice}>Ces contrôles microbiologiques ne couvrent pas tous les polluants chimiques. La couleur représente l’appréciation du dernier prélèvement disponible, même ancien ; elle ne décrit pas la situation en temps réel. Consultez les consignes et éventuelles interdictions sur place et sur le portail officiel.</p>
      <p className="my-4 text-xs text-slate-600">Coordonnées publiées du site de baignade (ETRS89) : {point.lat.toFixed(5)}, {point.lng.toFixed(5)}. Elles ne localisent pas chaque prélèvement individuel. Code européen : {point.euId}.</p>
      <a href={BATHING_CATALOGUE_URL} target="_blank" rel="noreferrer" className={styles.source}>Catalogue officiel des sites · Ministère de la Santé<ExternalLink size={14} /></a>
    </DetailSection>
  </>;
}
