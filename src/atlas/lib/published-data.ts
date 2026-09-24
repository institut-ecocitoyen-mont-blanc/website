// Public, versioned snapshots; browsers never need upstream credentials.
export const ATLAS_DATA_URL = process.env.NEXT_PUBLIC_ATLAS_DATA_URL || "https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data";
export interface DatasetStatus {
  path?: string;
  hash?: string;
  source: string;
  intervalHours: number;
  lastAttemptAt: string;
  lastSuccessAt?: string;
  status: "ok" | "error";
  error?: string;
}
export interface DataManifest { schemaVersion: 1; checkedAt: string; datasets: Record<string, DatasetStatus> }

let manifestRequest: Promise<DataManifest> | undefined;
let manifestExpires = 0;
export function clearManifestCache() { manifestRequest = undefined; manifestExpires = 0; }
export async function loadDataManifest(): Promise<DataManifest> {
  if (!manifestRequest || Date.now() >= manifestExpires) {
    manifestExpires = Date.now() + 60000;
    manifestRequest = (async () => {
      const response = await fetch(`${ATLAS_DATA_URL}/manifest.json`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Le catalogue des données de l’atlas est indisponible.");
      const value = await response.json();
      if (value?.schemaVersion !== 1 || !value.datasets || typeof value.datasets !== "object" || !Number.isFinite(Date.parse(value.checkedAt))) throw new Error("Format du catalogue de données incompatible.");
      return value as DataManifest;
    })().catch((error) => { clearManifestCache(); throw error; });
  }
  return manifestRequest;
}
export function parseSnapshot<T>(value: unknown, key: string): T {
  if (!value || typeof value !== "object" || !("schemaVersion" in value) || value.schemaVersion !== 1 || !("key" in value) || value.key !== key || !("data" in value) || value.data == null) throw new Error("Jeu de données incompatible ou incomplet.");
  return value.data as T;
}
export async function loadPublishedData<T>(key: string, signal?: AbortSignal): Promise<T> {
  if (!/^[a-z0-9-]+$/.test(key)) throw new Error("Identifiant de données invalide.");
  const manifest = await loadDataManifest();
  signal?.throwIfAborted();
  const entry = manifest.datasets[key];
  if (!entry?.path) throw new Error("Aucun import réussi pour ce jeu de données. Consultez l’état des imports.");
  if (entry.path !== `data/${key}.json`) throw new Error("Chemin de données invalide.");
  const response = await fetch(`${ATLAS_DATA_URL}/${entry.path}?v=${encodeURIComponent(entry.hash ?? "")}`, { signal: AbortSignal.any([AbortSignal.timeout(15000), ...(signal ? [signal] : [])]) });
  if (!response.ok) throw new Error("Les données publiées sont temporairement indisponibles.");
  const data = parseSnapshot<T>(await response.json(), key);
  // Observation dates remain untouched. These fields represent successful imports.
  if (data && typeof data === "object" && !Array.isArray(data) && entry.lastSuccessAt) {
    return { ...data, ...("fetchedAt" in data ? { fetchedAt: entry.lastSuccessAt } : {}), ...("lastUpdated" in data ? { lastUpdated: entry.lastSuccessAt } : {}) };
  }
  return data;
}
export function datasetNeedsAttention(entry: DatasetStatus, now = Date.now()) {
  return entry.status !== "ok" || !entry.lastSuccessAt || now - Date.parse(entry.lastSuccessAt) > (entry.intervalHours * 2 + 1) * 3600000;
}
