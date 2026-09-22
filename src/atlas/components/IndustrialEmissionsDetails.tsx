import { Factory } from "lucide-react";
import { DetailSection } from "./AtlasDetailDialog";
import { formatEmissionQuantity, inventoryFacility, IREP_SOURCE_URL, type IndustrialEmission, type IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";
import type { PollutionSite } from "@/lib/google-sheets";
import styles from "./AtlasDetails.module.css";

function EmissionList({ emissions }: { emissions: IndustrialEmission[] }) {
  return <dl className="space-y-4 text-sm">{emissions.map((emission) => <div key={`${emission.pollutant}-${emission.unit}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
    <dt className="min-w-0 basis-40 grow break-words text-slate-600">{emission.pollutant}</dt>
    <dd className="font-semibold tabular-nums text-slate-900">{emission.quantity === "< seuil" ? <span className="text-xs font-medium">&lt; seuil</span> : <>{formatEmissionQuantity(emission.quantity)} <span className="text-xs font-normal text-slate-500">{emission.unit}{emission.quantity === 0 ? " · zéro publié*" : ""}</span></>}</dd>
  </div>)}</dl>;
}

export default function IndustrialEmissionsDetails({ site, data }: { site: PollutionSite; data: IndustrialEmissionsData }) {
  const facility = inventoryFacility(site, data);
  // Unmatched citizen records remain unchanged, without implying zero emissions.
  if (!facility) return null;
  const media = [...new Set(facility.emissions.map((emission) => emission.medium))];
  return <DetailSection title="Rejets industriels déclarés" description={`IREP · Émissions de l’année ${data.year}`}>
    <div data-industrial-emissions>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
        <Factory className="shrink-0 text-blue-iec" size={21} aria-hidden="true" />
        <div className="min-w-0"><p className="font-semibold text-blue-iec">{facility.name}</p><p className="mt-1 break-words text-xs text-slate-600">{facility.commune} · SIRET {facility.siret}</p></div>
      </div>
      <div className={media.length === 1 ? "grid grid-cols-1" : styles.cards}>
        {media.map((medium) => {
          const emissions = facility.emissions.filter((emission) => emission.medium === medium);
          const quantified = emissions.filter((emission) => emission.quantity !== "< seuil");
          const belowThreshold = emissions.filter((emission) => emission.quantity === "< seuil");
          return <article key={medium} className={styles.card}>
            <h4 className="mb-4 font-semibold text-blue-iec">{{ "Eau (direct)": "Eau · rejets directs", "Eau (indirect)": "Eau · rejets indirects" }[medium] ?? medium}</h4>
            <EmissionList emissions={quantified} />
            {belowThreshold.length > 0 && <details className="mt-5 text-sm">
              <summary className="cursor-pointer font-medium text-blue-iec">{belowThreshold.length} polluant{belowThreshold.length > 1 ? "s" : ""} sous le seuil de déclaration</summary>
              <div className="mt-4"><EmissionList emissions={belowThreshold} /></div>
            </details>}
          </article>;
        })}
      </div>
      {!facility.emissions.length && <p className="text-sm text-slate-600">Aucun rejet de polluant publié pour cet établissement dans le fichier {data.year}. Cela ne signifie pas une absence d’émissions.</p>}
      <p className={`${styles.notice} mt-5`}>Quantités annuelles déclarées par l’exploitant, et non concentrations mesurées dans l’environnement. Le registre n’est pas exhaustif : un polluant non publié ne correspond pas à une émission nulle.</p>
      {facility.emissions.some((emission) => emission.quantity === 0) && <p className="mt-3 text-xs leading-relaxed text-slate-500">* Selon Géorisques, un zéro publié peut désigner une valeur nulle, une valeur sous le seuil de déclaration ou une donnée inexacte ou indisponible.</p>}
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <a className={styles.source} href={IREP_SOURCE_URL} target="_blank" rel="noreferrer">Source : Géorisques / INERIS · IREP</a>
        {data.downloadUrl && <a className={styles.source} href={data.downloadUrl} target="_blank" rel="noreferrer">Données nationales {data.year} (ZIP)</a>}
      </p>
      {data.fetchedAt && <p className="mt-2 text-xs text-slate-500">Données récupérées le {new Date(data.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p>}
    </div>
  </DetailSection>;
}
