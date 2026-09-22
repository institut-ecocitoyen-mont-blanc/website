import { filterCcpmbPoints } from "./ccpmb-territory.ts";

export const INSTITUTE_WATER_LAYERS = [
  { id: "bathing", title: "Eaux de baignade", description: "Simulation d’un suivi des eaux de baignade par l’Institut : microbiologie et paramètres de terrain." },
  { id: "rivers", title: "Cours d’eau", description: "Simulation d’un suivi des cours d’eau par l’Institut : nutriments, métaux et paramètres de terrain." },
] as const;
export type InstituteWaterKind = typeof INSTITUTE_WATER_LAYERS[number]["id"];
export interface InstituteWaterSite {
  id: string; kind: InstituteWaterKind; name: string; commune: string; lat: number; lng: number;
  date: string; level: "good" | "moderate" | "poor";
  readings: { name: string; value: number; unit: string }[];
}
type Location = [string, string, number, number];
// Illustrative sampling positions, not a verified Institut monitoring network.
const locations: Record<InstituteWaterKind, Location[]> = {
  bathing: [
    ["Lac de Passy", "Passy", 45.9223, 6.6542],
    ["Lac de la Cavettaz", "Passy", 45.9241, 6.6548],
    ["Lacs des Ilettes", "Sallanches", 45.9558, 6.6386],
  ],
  rivers: [
    ["L’Arve · Sallanches", "Sallanches", 45.944, 6.638],
    ["L’Arve · Passy", "Passy", 45.923, 6.685],
    ["Le Bon Nant · Saint-Gervais", "Saint-Gervais-les-Bains", 45.892, 6.713],
    ["Le Bon Nant · Les Contamines", "Les Contamines-Montjoie", 45.82, 6.727],
    ["L’Arly · Praz-sur-Arly", "Praz-sur-Arly", 45.835, 6.574],
  ],
};
export const INSTITUTE_WATER_SITES: InstituteWaterSite[] = INSTITUTE_WATER_LAYERS.flatMap(({ id: kind }) => filterCcpmbPoints(locations[kind].map(([name, commune, lat, lng], i): InstituteWaterSite => ({
  id: `institute-${kind}-${i + 1}`, kind, name, commune, lat, lng,
  date: `2026-06-${String(12 + i).padStart(2, "0")}`,
  // Palette scenarios are deliberately independent of any regulatory classification.
  level: (["good", "moderate", "poor"] as const)[i % 3],
  readings: kind === "bathing" ? [
    { name: "Escherichia coli", value: [30, 180, 620][i], unit: "UFC/100 mL" },
    { name: "Entérocoques intestinaux", value: [15, 70, 240][i], unit: "UFC/100 mL" },
    { name: "Température de l’eau", value: 20 + i * 1.5, unit: "°C" },
    { name: "pH", value: 7.4 + i * 0.1, unit: "" },
  ] : [
    { name: "Nitrates", value: 1.2 + i * 1.7, unit: "mg/L" },
    { name: "Phosphates", value: 0.02 + i * 0.03, unit: "mg/L" },
    { name: "Cuivre", value: 0.8 + i * 1.2, unit: "µg/L" },
    { name: "Conductivité", value: 140 + i * 45, unit: "µS/cm" },
  ],
}))));
