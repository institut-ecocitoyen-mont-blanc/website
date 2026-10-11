import { formatEmissionQuantity, inventoryFacility, IREP_SOURCE_URL, type IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";
import type { PollutionSiteBase } from "@/lib/google-sheets";
import styles from "./AtlasDetails.module.css";

export default function IndustrialEmissionsDetails({ site, data }: { site: PollutionSiteBase; data: IndustrialEmissionsData }) {
  const facility = inventoryFacility(site, data);
  // Unmatched citizen records remain unchanged, without implying zero emissions.
  if (!facility) return null;
  const media = [...new Set(facility.emissions.map(e => e.medium))];
  const pollutants = new Set(facility.emissions.map(e => e.pollutant)).size;
  return <details className={styles.allData} data-industrial-emissions>
    <summary><span className={styles.toggleIcon} aria-hidden="true" />Rejets industriels déclarés · IREP {data.year}
      <span className={styles.dataHint}>{media.length} milieu{media.length !== 1 ? "x" : ""} · {pollutants} polluant{pollutants !== 1 ? "s" : ""}</span>
    </summary>
    <div className={styles.dataContent}>
      <p className={styles.irepIdentity}>Établissement apparié par SIRET · <strong>{facility.name}</strong> · {facility.siret} · {facility.commune}</p>
      {media.map(medium => {
        const emissions = facility.emissions.filter(e => e.medium === medium);
        return <section key={medium} className={styles.irepMedium}>
          <h4 className={styles.visualLabel}>{{ "Eau (direct)": "Eau · rejets directs", "Eau (indirect)": "Eau · rejets indirects" }[medium] ?? medium}</h4>
          <dl>{emissions.map((e, index) => <div key={index}>
            <dt>{e.pollutant}</dt>
            <dd>{e.quantity === "< seuil" ? <>&lt; seuil</> : <>{formatEmissionQuantity(e.quantity)}{e.quantity === 0 && "*"} <span>{e.unit}</span></>}</dd>
          </div>)}</dl>
          {emissions.some(e => e.quantity === 0) && <p>* Zéro publié : valeur nulle, sous le seuil de déclaration ou donnée inexacte ou indisponible selon Géorisques.</p>}
          {emissions.some(e => e.quantity === "< seuil") && <p>« &lt; seuil » : rejet sous le seuil de déclaration, sans quantité publiée.</p>}
        </section>;
      })}
      {!facility.emissions.length && <p className="text-sm text-slate-600">Aucun rejet de polluant publié pour cet établissement dans le fichier {data.year}. Cela ne signifie pas une absence d’émissions.</p>}
      <div className={styles.inventoryLinks}>
        <a href={IREP_SOURCE_URL} target="_blank" rel="noreferrer">Source IREP ↗</a>
        {data.downloadUrl && <a href={data.downloadUrl} target="_blank" rel="noreferrer">Données nationales {data.year} (ZIP) ↗</a>}
      </div>
    </div>
  </details>;
}
