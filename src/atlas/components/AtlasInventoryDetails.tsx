import Link from "next/link";
import { DetailFacts, DetailSection } from "./AtlasDetailDialog";
import type { PollutionSite } from "@/lib/google-sheets";
import styles from "./AtlasDetails.module.css";
import IndustrialEmissionsDetails from "./IndustrialEmissionsDetails";
import type { IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";

export default function AtlasInventoryDetails({ site, emissions }: { site: PollutionSite; emissions: IndustrialEmissionsData }) {
  return <>
    <DetailFacts items={[
      { label: "Commune", value: site.commune }, { label: "Secteur d’activité", value: site.sector },
      { label: "Période d’activité", value: site.activityPeriod || site.activityStatus },
      { label: "Localisation", value: site.localizationDetail || site.localizationType },
    ]} />
    {site.activity && <DetailSection title="L’activité du site"><p className="whitespace-pre-line text-sm leading-relaxed">{site.activity}</p></DetailSection>}
    <IndustrialEmissionsDetails site={site} data={emissions} />
    {(site.emissionTiming || site.knowledgeLevel) && <DetailFacts items={[
      { label: "Temporalité de l’émission", value: site.emissionTiming }, { label: "Niveau de connaissance", value: site.knowledgeLevel },
    ]} />}
    {site.pollutions.length > 0 && <DetailSection title="Émissions et polluants potentiels" description={`${site.pollutions.length} description(s) issue(s) de l’inventaire participatif.`}>
      <div className={styles.cards}>{site.pollutions.map((pollution, index) => <article className={styles.card} key={index}>
        <h4 className="mb-4 font-semibold text-blue-iec">{pollution.environmentalCompartment || `Émission ${index + 1}`}</h4>
        <dl className="space-y-4 text-sm">{[
          ["Processus d’émission", pollution.process], ["Familles chimiques", pollution.chemicalFamilies],
          ["Forme physico-chimique", pollution.chemicalForm], ["Voie de transfert", pollution.transferPathway],
          ["Milieux récepteurs", pollution.receivingEnvironments],
        ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="mb-1 text-xs text-slate-500">{label}</dt><dd className="whitespace-pre-line">{value}</dd></div>)}</dl>
      </article>)}</div>
    </DetailSection>}
    {site.risk && <DetailSection title="Risque associé"><p className={styles.notice}>{site.risk}</p></DetailSection>}
    <DetailSection title="Sources et références">
      {site.link && <p className="mb-4 break-words text-sm">{/^https?:\/\//i.test(site.link) ? <a className={styles.source} href={site.link} target="_blank" rel="noreferrer">Référence de l’inventaire</a> : site.link}</p>}
      <Link href={`/carte?site=${encodeURIComponent(site.id)}`} className={styles.source}>Ouvrir la fiche de l’inventaire</Link>
    </DetailSection>
  </>;
}
