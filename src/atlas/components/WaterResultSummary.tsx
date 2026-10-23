"use client";
import { useState } from "react";
import { waterSummaryTitle, type WaterResultSummary as Summary } from "@/atlas/lib/water-result-summary";
import { WATER_COLOR_MAX_AGE } from "@/atlas/lib/environmental-quality";
import styles from "./AtlasDetails.module.css";

const format = (value: number) => value.toLocaleString("fr-FR");
export default function WaterResultSummary({ summary, source }: { summary: Summary; source: "drinking" | "rivers" | "groundwater" }) {
  const [openedAt] = useState(() => Date.now());
  const { total, within, outside, unknown, date, incomplete } = summary;
  const evaluated = within + outside;
  const green = total ? within / total * 100 : 0, red = total ? evaluated / total * 100 : 0;
  const old = !!date && openedAt - Date.parse(date) > WATER_COLOR_MAX_AGE;
  const description = !total ? "Aucun bilan de qualité ne peut être établi." : !evaluated
    ? source === "drinking" ? "Les références ou résultats publiés ne permettent pas de comparaison fiable." : "Aucun repère de qualité applicable n’est associé à ces analyses dans l’export source."
    : "Comparaison aux limites et références publiées pour chaque résultat, pas un score sanitaire.";
  return <section className={styles.waterSummary} aria-label="Synthèse des analyses du dernier prélèvement">
    <div aria-hidden="true" className={styles.waterRing} style={{ background: evaluated ? `conic-gradient(#207451 0 ${green}%, #b23c39 ${green}% ${red}%, #cbd5e1 ${red}% 100%)` : "#edf2f7" }}>
      <span><b>{evaluated ? format(outside) : "—"}</b><small>{evaluated ? "hors repères" : "non évalué"}</small></span>
    </div>
    <div className={styles.waterSummaryContent}>
      <div className={styles.waterSummaryMeta}>{date && <span>Prélèvement du {new Date(date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</span>}{old && <span className={styles.waterOld}>Données anciennes</span>}</div>
      <h3>{waterSummaryTitle(summary)}</h3><p>{description}</p>
      {!!total && <ul className={styles.waterSummaryLegend}>
        {!!evaluated && <><li><i style={{ background: "#207451" }} aria-hidden="true" /><strong>{format(within)}</strong> dans les repères</li><li><i style={{ background: "#b23c39" }} aria-hidden="true" /><strong>{format(outside)}</strong> hors repères</li></>}
        <li><i style={{ background: "#cbd5e1" }} aria-hidden="true" /><strong>{format(unknown)}</strong> non évaluables</li>
      </ul>}
      {!!total && <p className={styles.waterCoverage}>{format(evaluated)} résultats évaluables sur {format(total)} analyses {incomplete ? "chargées" : "à cette date"}. L’historique complet reste dans « Toutes les données ».</p>}
      {incomplete && <p className={styles.waterCaution}>Les données chargées ne permettent pas de garantir un prélèvement complet.</p>}
      {old && <p className={styles.waterCaution}>Ces mesures ne décrivent pas nécessairement la situation actuelle.</p>}
    </div>
  </section>;
}
