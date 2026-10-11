import Link from "next/link";
import { Droplets, Eye, Layers, Shovel, Volume2, Wind } from "lucide-react";
import { DetailFacts } from "./AtlasDetailDialog";
import { DetailLimits } from "./DetailCard";
import { getSectorColor, type PollutionSiteBase } from "@/lib/google-sheets";
import styles from "./AtlasDetails.module.css";
import IndustrialEmissionsDetails from "./IndustrialEmissionsDetails";
import { inventoryFacility, IREP_SOURCE_URL, type IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";

function InventoryLinks({ site }: { site: PollutionSiteBase }) {
  return <>
    {site.link && (/^https?:\/\//i.test(site.link) ? <a href={site.link} target="_blank" rel="noreferrer">Référence de l’inventaire ↗</a> : <span>{site.link}</span>)}
  </>;
}

export default function AtlasInventoryDetails({ site, emissions }: { site: PollutionSiteBase; emissions?: IndustrialEmissionsData }) {
  const facility = emissions ? inventoryFacility(site, emissions) : null;
  const period = site.activityPeriod || site.activityStatus;
  return <>
    <section className={styles.inventoryIdentity} aria-label="L’activité du site">
      <span className={styles.sectorDisc} style={{ background: getSectorColor(site.sector) }} aria-hidden="true">{site.sector ? site.sector.slice(0, 3).toLocaleUpperCase("fr-FR") : "—"}</span>
      <div><h3>{site.sector || "Secteur non renseigné"}{period && <> · activité {period.charAt(0).toLocaleLowerCase("fr-FR") + period.slice(1)}</>}</h3>
        {site.activity && <p>{site.activity}</p>}
      </div>
    </section>
    <DetailFacts items={[
      { label: "Temporalité de l’émission", value: site.emissionTiming },
      { label: "Source", value: [...new Set([site.localizationType, site.localizationDetail].filter(Boolean))].join(" · ") },
      { label: "Niveau de connaissance", value: <span className={styles.inventoryText}>{site.knowledgeLevel || "Non renseigné"}</span> },
    ]} />
    {site.risk.trim() && <section className={styles.inventoryRisk}>
      <h3><span aria-hidden="true">!</span>Risque associé</h3>
      <p>{site.risk}</p>
    </section>}
    <section className={styles.inventoryPollutions}>
      <h3 className={styles.visualLabel}>Émissions et polluants potentiels</h3>
      <ul>{site.pollutions.map((p, index) => {
        const compartment = p.environmentalCompartment.trim();
        const tone = /^air$/i.test(compartment) ? "air" : /^eau$/i.test(compartment) ? "water" : /^sols?$/i.test(compartment) ? "soil" : "other";
        const CompartmentIcon = tone === "air" ? Wind : tone === "water" ? Droplets : tone === "soil" ? Shovel : /bruit/i.test(compartment) ? Volume2 : /odeur/i.test(compartment) ? Wind : /paysag|visuel/i.test(compartment) ? Eye : Layers;
        return <li key={index}>
          <span className={styles.compartmentTag} data-tone={tone}><CompartmentIcon size={18} aria-hidden="true" /></span>
          <div>
            <div className={styles.pollutionHeading}>
              <p className={styles.compartmentLabel}>{compartment || "Compartiment non renseigné"}</p>
              <h4>{p.process || "Processus non renseigné"}</h4>
            </div>
            {(p.chemicalFamilies || p.chemicalForm) && <p>{p.chemicalFamilies}{p.chemicalForm && <span className={styles.pollutionForm}>{p.chemicalFamilies && " · "}{p.chemicalForm}</span>}</p>}
            {(p.transferPathway || p.receivingEnvironments) && <p className={styles.pollutionPathway}>{[p.transferPathway, p.receivingEnvironments].filter(Boolean).join(" → ")}</p>}
          </div>
        </li>;
      })}</ul>
      {!site.pollutions.length && <p className="text-sm text-slate-500">Aucune description d’émission renseignée.</p>}
    </section>
    {emissions && <IndustrialEmissionsDetails site={site} data={emissions} />}
    {site.link && <div className={styles.inventoryLinks}><InventoryLinks site={site} /></div>}
    <DetailLimits sources={<><Link href={`/carte?site=${encodeURIComponent(site.id)}`}>Inventaire participatif · Institut écocitoyen</Link>{facility && <a href={IREP_SOURCE_URL} target="_blank" rel="noreferrer">Géorisques / INERIS · IREP</a>}</>}>
      <p>Description déclarative issue de l’inventaire participatif ; le niveau de connaissance est indiqué par fiche. La présence d’un site n’indique pas une pollution mesurée. Le risque associé est celui renseigné par les contributeurs, pas une évaluation sanitaire.{facility && " Les rejets IREP sont auto-déclarés par l’exploitant et ne décrivent pas les concentrations dans l’air ou l’eau. Le registre n’est pas exhaustif : un polluant non publié ne correspond pas à une émission nulle."}</p>
      {facility && emissions?.fetchedAt && <p>Données IREP récupérées le {new Date(emissions.fetchedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p>}
    </DetailLimits>
  </>;
}
