// Entirely fictional scenarios: coordinates, land uses, dates and measurements
// do not describe actual parcels, samples or contamination in these communes.
export interface SoilDemoSite {
  id: string; name: string; commune: string; lat: number; lng: number;
  setting: string; date: string; depth: [number, number]; index: number;
  readings: { name: string; family: string; value: number; unit: string }[];
}
export const SOIL_DEMO_BANDS = [
  { max: 33, color: "#16a34a", label: "Faible" },
  { max: 66, color: "#d97706", label: "Intermédiaire" },
  { max: 100, color: "#dc2626", label: "Élevée" },
];
export const soilDemoBand = (index: number) => SOIL_DEMO_BANDS.find((band) => index <= band.max) ?? SOIL_DEMO_BANDS[2];
const locations: [string, number, number][] = [
  ["Sallanches", 45.941, 6.631], ["Sallanches", 45.952, 6.643], ["Sallanches", 45.923, 6.653],
  ["Passy", 45.927, 6.706], ["Passy", 45.94, 6.72], ["Passy", 45.914, 6.685],
  ["Saint-Gervais-les-Bains", 45.896, 6.707], ["Saint-Gervais-les-Bains", 45.878, 6.722],
  ["Combloux", 45.9, 6.648], ["Demi-Quartier", 45.884, 6.624],
  ["Megève", 45.865, 6.615], ["Praz-sur-Arly", 45.837, 6.571],
  ["Les Contamines-Montjoie", 45.821, 6.72], ["Cordon", 45.918, 6.61], ["Domancy", 45.912, 6.674],
];
const settings = ["Jardin", "Terrain agricole", "Espace urbain"];
const depths: [number, number][] = [[0, 10], [0, 20], [10, 30]];
export const SOIL_DEMO_SITES: SoilDemoSite[] = locations.map(([commune, lat, lng], i) => {
  const index = 12 + i * 31 % 83;
  return {
    id: `soil-demo-${i + 1}`, name: `${commune} · Sol ${String(i + 1).padStart(2, "0")}`, commune, lat, lng,
    setting: settings[i % settings.length], date: `2026-06-${String(10 + i).padStart(2, "0")}`,
    depth: depths[i % depths.length], index,
    readings: [
      { name: "Plomb (Pb)", family: "Métaux", value: 14 + i * 29 % 240, unit: "mg/kg MS" },
      { name: "Cadmium (Cd)", family: "Métaux", value: Number((0.12 + i * 0.23 % 2.8).toFixed(2)), unit: "mg/kg MS" },
      { name: "Zinc (Zn)", family: "Métaux", value: 35 + i * 47 % 420, unit: "mg/kg MS" },
      { name: "Hydrocarbures totaux", family: "Hydrocarbures", value: 8 + i * 79 % 650, unit: "mg/kg MS" },
      { name: "Pesticides · indicateur fictif", family: "Pesticides", value: Number((0.02 + i * 0.07 % 0.9).toFixed(2)), unit: "mg/kg MS" },
    ],
  };
});
