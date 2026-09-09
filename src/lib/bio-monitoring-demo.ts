// Locations transcribed from the supplied atlas-ccpmb-prototype.html.
// They are unverified prototype locations, not an official monitoring network.
// All indices and readings below are invented, deterministic demo values.
export type BioDemoKind = "lichens" | "bioacc";
export type BioDemoSite = { id: string; kind: BioDemoKind; name: string; commune: string; lat: number; lng: number; index: number; readings: { label: string; value: number; unit: string }[] };
type Location = [string, string, number, number];
const lichens: Location[] = [
  ["Sallanches 1", "Sallanches", 45.92515794233991, 6.639956377605855],
  ["Sallanches 2", "Sallanches", 45.93859311742809, 6.646527553795905],
  ["Sallanches 3", "Sallanches", 45.94798796908707, 6.625811295197429],
  ["Passy 1", "Passy", 45.91885757992537, 6.69277301553214],
  ["Passy 2", "Passy", 45.93501350013064, 6.702043310447943],
  ["Passy 3", "Passy", 45.94128271364448, 6.709267919620594],
  ["Saint-Gervais 1", "Saint-Gervais-les-Bains", 45.902604193883754, 6.704528405523973],
  ["Saint-Gervais 2", "Saint-Gervais-les-Bains", 45.891948888677014, 6.717965972280349],
  ["Saint-Gervais 3", "Saint-Gervais-les-Bains", 45.86785718166084, 6.720786434338864],
  ["Combloux 1", "Combloux", 45.898729365239994, 6.635674403353285],
  ["Les Contamines 1", "Les Contamines-Montjoie", 45.793280042571006, 6.714023466803087],
  ["Megève 1", "Megève", 45.86404599013836, 6.629899228970902],
  ["Praz-sur-Arly 1", "Praz-sur-Arly", 45.84205515542405, 6.584383490935413],
];
const bioacc: Location[] = [
  ["Sallanches 1", "Sallanches", 45.96280490076312, 6.635914269988728],
  ["Sallanches 2", "Sallanches", 45.9359158908671, 6.6222041865831835],
  ["Passy 1", "Passy", 45.93526976099349, 6.69041920006516],
  ["Passy 2", "Passy", 45.92287972750016, 6.725777728981752],
  ["Saint-Gervais 1", "Saint-Gervais-les-Bains", 45.85909592944609, 6.735318383757104],
  ["Saint-Gervais 2", "Saint-Gervais-les-Bains", 45.90963139308304, 6.702164785534532],
  ["Saint-Gervais 3", "Saint-Gervais-les-Bains", 45.884769681403284, 6.7117242008118865],
  ["Combloux 1", "Combloux", 45.894791532079225, 6.654017237244549],
  ["Les Contamines 1", "Les Contamines-Montjoie", 45.83192387916617, 6.724130850102038],
  ["Demi-Quartier 1", "Demi-Quartier", 45.88040020284491, 6.634222583828315],
];
export const BIO_DEMO_LAYERS = [
  { id: "lichens", title: "Lichens (bio-indication)", description: "Sites du prototype et observations lichéniques simulées. Icône feuille." },
  { id: "bioacc", title: "Bio-accumulation (retombées)", description: "Sites du prototype et retombées atmosphériques simulées. Icône éprouvette." },
] as const;
export const BIO_DEMO_BANDS = [
  { max: 33, color: "#16a34a", label: "Faible" },
  { max: 66, color: "#d97706", label: "Intermédiaire" },
  { max: 100, color: "#dc2626", label: "Élevée" },
];
export const bioDemoBand = (index: number) => BIO_DEMO_BANDS.find((band) => index <= band.max) ?? BIO_DEMO_BANDS[2];
function makeSites(kind: BioDemoKind, locations: Location[]): BioDemoSite[] {
  return locations.map(([name, commune, lat, lng], i) => {
    const index = 15 + (i * 29 + (kind === "bioacc" ? 17 : 0)) % 80;
    return { id: `${kind}-${i + 1}`, kind, name, commune, lat, lng, index, readings: kind === "lichens" ? [
      { label: "Richesse observée · simulation", value: 7 + i * 7 % 22, unit: "espèces" },
      { label: "Recouvrement · simulation", value: 18 + i * 11 % 65, unit: "%" },
    ] : [
      { label: "Retombées métalliques · simulation", value: 10 + i * 17 % 85, unit: "u. fictives" },
      { label: "Retombées organiques · simulation", value: 8 + i * 23 % 80, unit: "u. fictives" },
    ] };
  });
}
export const BIO_DEMO_SITES: Record<BioDemoKind, BioDemoSite[]> = { lichens: makeSites("lichens", lichens), bioacc: makeSites("bioacc", bioacc) };
