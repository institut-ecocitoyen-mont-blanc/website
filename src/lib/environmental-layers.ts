// Public providers queried directly by the static site's browser client.
export const AREA = { west: 6.45, south: 45.7, east: 7.1, north: 46.1 };
export type LayerId = "inventory" | "atmo" | "rivers" | "drinking" | "bathing" | "wood";
export type RemoteLayerId = Exclude<LayerId, "inventory" | "wood" | "atmo" | "bathing">;
export type Row = Record<string, unknown>;
export interface LayerPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  properties: Row;
}
export const LAYERS: { id: LayerId; title: string; source: string; url?: string; description: string; color: string }[] = [
  { id: "inventory", title: "Sources de pollution", source: "Inventaire écocitoyen", url: "/carte", description: "Les sites de l’inventaire participatif, avec leurs secteurs d’activité.", color: "#1d6ab2" },
  { id: "wood", title: "Chauffage au bois", source: "Démonstration · données fictives", description: "Carte de chaleur entièrement simulée. Les zones et intensités sont inventées : ni mesures, ni émissions estimées, ni seuils sanitaires.", color: "#f52222" },
  { id: "atmo", title: "Qualité de l’air", source: "Atmo Auvergne-Rhône-Alpes", url: "https://www.atmo-auvergnerhonealpes.fr/dataviz/mesures-aux-stations", description: "Stations aux coordonnées publiées par Atmo : concentrations horaires par polluant, dates et historique.", color: "#8b5cf6" },
  { id: "rivers", title: "Qualité des cours d’eau", source: "Hub’Eau · Naïades", url: "https://hubeau.eaufrance.fr/page/api-qualite-cours-deau", description: "Stations de suivi physico-chimique. Cliquez sur un point pour consulter les analyses disponibles.", color: "#0891b2" },
  { id: "bathing", title: "Eaux de baignade · ARS", source: "Ministère de la Santé", url: "https://baignades.sante.gouv.fr/baignades/", description: "Six sites à Passy, Sallanches, Thyez, Morillon et Samoëns : E. coli, entérocoques et appréciations des prélèvements. Coordonnées officielles des sites, pas de chaque prélèvement.", color: "#0891b2" },
  { id: "drinking", title: "Eau potable · contrôle ARS", source: "Ministère de la Santé · Hub’Eau", url: "https://hubeau.eaufrance.fr/page/api-qualite-eau-potable", description: "Accès aux analyses par commune. Les points représentent les centres communaux, pas les captages ni les lieux de prélèvement.", color: "#2563eb" },
];

export const asText = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value) : "";
export function insideArea(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= AREA.south && lat <= AREA.north && lng >= AREA.west && lng <= AREA.east;
}
export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]) });
  if (!response.ok) throw new Error(`Le fournisseur répond avec une erreur (${response.status}).`);
  return response.json();
}
export function rows(value: unknown, key = "data"): Row[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as Row)[key])) throw new Error("Le format de réponse du fournisseur a changé.");
  return ((value as Row)[key] as unknown[]).filter((row): row is Row => !!row && typeof row === "object");
}

export async function loadLayer(id: RemoteLayerId, signal: AbortSignal): Promise<LayerPoint[]> {
  if (id === "rivers") {
    const data = await fetchJson("https://hubeau.eaufrance.fr/api/v2/qualite_rivieres/station_pc?code_departement=74&size=1000&fields=code_station,libelle_station,latitude,longitude,libelle_commune,date_maj_information", signal);
    if ((data as Row).next) throw new Error("Le catalogue dépasse la limite prévue. Les stations ne peuvent pas être affichées intégralement.");
    return rows(data).flatMap((p) => {
      const lat = Number(p.latitude), lng = Number(p.longitude);
      return insideArea(lat, lng) ? [{ id: asText(p.code_station), name: asText(p.libelle_station), lat, lng, properties: p }] : [];
    });
  }
  const data = await fetchJson("https://geo.api.gouv.fr/communes?codeDepartement=74&fields=nom,code,centre&format=json", signal);
  if (!Array.isArray(data)) throw new Error("Les centres communaux sont indisponibles.");
  return (data as Row[]).flatMap((p) => {
    const coordinates = (p.centre as { coordinates?: number[] } | undefined)?.coordinates;
    if (!coordinates) return [];
    const [lng, lat] = coordinates;
    return insideArea(lat, lng) ? [{ id: asText(p.code), name: asText(p.nom), lat, lng, properties: p }] : [];
  });
}

export function analysisUrl(kind: "rivers" | "drinking", id: string) {
  return kind === "rivers"
    ? `https://hubeau.eaufrance.fr/api/v2/qualite_rivieres/analyse_pc?code_station=${encodeURIComponent(id)}&size=10&sort=desc`
    : `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${encodeURIComponent(id)}&size=10&sort=desc`;
}
