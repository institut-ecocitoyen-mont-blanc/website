import type { BioDemoSite } from "./bio-monitoring-demo.ts";
import type { SoilDemoSite } from "./soil-demo.ts";
import type { InstituteWaterSite } from "./institute-water-demo.ts";

export interface InstituteReport {
  id: string; commune: string; lat: number; lng: number;
  medium: "Air" | "Eau" | "Sol"; method: string; campaign: string; context: string;
  index?: number;
  groups: { title: string; readings: { name: string; value: number; unit: string; note: string }[] }[];
}
const noThreshold = "Valeur inventée pour la démonstration. Aucun seuil de conformité n’est appliqué à ce résultat.";
export function waterInstituteReport(site: InstituteWaterSite): InstituteReport {
  const bathing = site.kind === "bathing";
  return { ...site, medium: "Eau", method: bathing ? "Prélèvements d’eau · microbiologie et mesures de terrain" : "Prélèvements d’eau · analyses physico-chimiques", campaign: site.date,
    context: "Les points de prélèvement et les valeurs sont illustratifs. Ils ne décrivent ni la qualité réelle de l’eau ni une autorisation de baignade.",
    groups: (bathing ? ["Microbiologie", "Paramètres de terrain"] : ["Nutriments", "Métaux et paramètres de terrain"]).map((title, group) => ({ title, readings: site.readings.slice(group * 2, group * 2 + 2).map((r) => ({ ...r, note: noThreshold })) })),
  };
}
export function bioInstituteReport(site: BioDemoSite): InstituteReport {
  return { ...site, medium: "Air", campaign: "Scénario non daté", method: site.kind === "lichens" ? "Observations lichéniques · bio-indication" : "Suivi des retombées · bio-accumulation",
    context: "Emplacements repris du prototype, sans réseau de surveillance vérifié. Les indicateurs sont simulés, sans conclusion sur la qualité de l’air ou une installation voisine.",
    groups: [{ title: site.kind === "lichens" ? "Observations lichéniques" : "Retombées atmosphériques", readings: site.readings.map((r) => ({ name: r.label.replace(" · simulation", ""), value: r.value, unit: r.unit, note: noThreshold })) }],
  };
}
export function soilInstituteReport(site: SoilDemoSite): InstituteReport {
  return { ...site, medium: "Sol", campaign: site.date, method: "Prélèvements de sols cultivés · analyses physico-chimiques",
    context: `${site.setting} fictif · profondeur simulée ${site.depth[0]}–${site.depth[1]} cm. Les concentrations portent sur le sol (MS : matière sèche), pas sur les légumes. Aucun prélèvement réel n’est représenté.`,
    groups: [...new Set(site.readings.map((r) => r.family))].map((title) => ({ title, readings: site.readings.filter((r) => r.family === title).map((r) => ({ ...r, note: noThreshold })) })),
  };
}
