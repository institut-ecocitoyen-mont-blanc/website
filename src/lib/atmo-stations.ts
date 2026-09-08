export const ATMO_SERVICE = "https://services3.arcgis.com/o7Q3o5SkiSeZD5LK/arcgis/rest/services/Concentrations%20moyennes%20horaires/FeatureServer";
export const AIR_POLLUTANTS = [
  { id: "pm25", label: "PM₂.₅", layer: 2 },
  { id: "pm10", label: "PM₁₀", layer: 4 },
  { id: "no2", label: "NO₂", layer: 1 },
  { id: "o3", label: "O₃", layer: 3 },
] as const;
export type AirPollutant = typeof AIR_POLLUTANTS[number]["id"];
type Row = Record<string, unknown>;
export interface AirReading {
  time: number;
  end: number | null;
  value: number | null;
  unit: string;
  validation: string | null;
}
export interface AirStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  influence: string;
  typology: string;
  readings: AirReading[];
}
export interface AirBounds { west: number; south: number; east: number; north: number }
export function combineAirStations(datasets: Partial<Record<AirPollutant, { stations: AirStation[] }>>) {
  const groups = new Map<string, { station: AirStation; measurements: { pollutant: AirPollutant; station: AirStation }[] }>();
  for (const { id } of AIR_POLLUTANTS) {
    for (const station of datasets[id]?.stations ?? []) {
      const group = groups.get(station.id) ?? { station, measurements: [] };
      group.measurements.push({ pollutant: id, station });
      groups.set(station.id, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.station.name.localeCompare(b.station.name, "fr"));
}
const text = (v: unknown) => typeof v === "string" ? v : "";
const numeric = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const timestamp = (v: unknown) => numeric(v) ?? (typeof v === "string" && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);

export function groupAirStations(rows: Row[], bounds: AirBounds): AirStation[] {
  const stations = new Map<string, AirStation>();
  // Newest row supplies the published location and station metadata.
  for (const row of [...rows].sort((a, b) => (timestamp(b.date_debut) ?? 0) - (timestamp(a.date_debut) ?? 0))) {
    const id = text(row.code_station), lat = numeric(row.y_wgs84), lng = numeric(row.x_wgs84);
    const time = timestamp(row.date_debut);
    if (!id || time === null || lat === null || lng === null || lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) continue;
    const station = stations.get(id) ?? { id, name: text(row.nom_station) || id, lat, lng, influence: text(row.influence), typology: text(row.typologie), readings: [] };
    if (!station.readings.some((reading) => reading.time === time)) {
      station.readings.push({ time, end: timestamp(row.date_fin), value: numeric(row.valeur), unit: text(row.unite), validation: row.statut_valid == null ? null : String(row.statut_valid) });
    }
    stations.set(id, station);
  }
  return Array.from(stations.values()).map((station) => ({ ...station, readings: station.readings.sort((a, b) => a.time - b.time) })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function airQueryUrl(pollutant: AirPollutant, bounds: AirBounds, offset = 0) {
  const { layer } = AIR_POLLUTANTS.find((p) => p.id === pollutant)!;
  const params = new URLSearchParams({ f: "json", where: `x_wgs84>=${bounds.west} AND x_wgs84<=${bounds.east} AND y_wgs84>=${bounds.south} AND y_wgs84<=${bounds.north}`, outFields: "OBJECTID,code_station,nom_station,x_wgs84,y_wgs84,typologie,influence,date_debut,date_fin,valeur,unite,statut_valid", orderByFields: "date_debut DESC,OBJECTID ASC", resultRecordCount: "2000", resultOffset: String(offset), returnGeometry: "false" });
  return `${ATMO_SERVICE}/${layer}/query?${params}`;
}

export async function loadAirStations(pollutant: AirPollutant, bounds: AirBounds, signal: AbortSignal): Promise<AirStation[]> {
  const all: Row[] = [];
  // Bound the entire pagination sequence, not just individual requests.
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(25000)]);
  for (let page = 0; page < 10; page++) {
    const response = await fetch(airQueryUrl(pollutant, bounds, all.length), { signal: deadline });
    if (!response.ok) throw new Error(`Atmo : erreur HTTP ${response.status}.`);
    const data = await response.json();
    if (data.error || !Array.isArray(data.features)) throw new Error("La réponse Atmo est indisponible ou son format a changé.");
    const rows = data.features.map((feature: { attributes?: Row }) => feature.attributes);
    if (rows.some((row: unknown) => !row || typeof row !== "object")) throw new Error("Mesures Atmo au format inattendu.");
    all.push(...rows);
    if (!data.exceededTransferLimit) return groupAirStations(all, bounds);
    if (!rows.length) break;
  }
  throw new Error("Le flux Atmo est trop volumineux : affichage partiel refusé.");
}

export function latestAirValue(station: AirStation) {
  return station.readings.findLast((reading) => reading.value !== null);
}

// Split on absent values and missing hourly slots instead of implying continuity.
export function airChartSegments(readings: AirReading[]): AirReading[][] {
  const segments: AirReading[][] = [];
  let segment: AirReading[] = [];
  for (const reading of readings) {
    if (reading.value === null || (segment.length && reading.time - segment[segment.length - 1].time > 90 * 60000) || (segment.length && reading.unit !== segment[segment.length - 1].unit)) {
      if (segment.length) segments.push(segment);
      segment = [];
    }
    if (reading.value !== null) segment.push(reading);
  }
  if (segment.length) segments.push(segment);
  return segments;
}

export const airDate = (time: number) => new Date(time).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const airIsStale = (time: number, now = Date.now()) => now - time > 48 * 3600000;
