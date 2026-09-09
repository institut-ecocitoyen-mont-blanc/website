import { loadLayer, type LayerPoint } from "./environmental-layers.ts";

export interface RiverCatalogue { points: LayerPoint[]; fetchedAt: string | null }

// Included in static exports: a provider outage in the visitor's browser must
// not hide already-published stations or their independent AERMC assessments.
export async function loadRiverCatalogue(): Promise<RiverCatalogue> {
  try {
    const points = await loadLayer("rivers", AbortSignal.timeout(25000));
    return { points, fetchedAt: new Date().toISOString() };
  } catch { return { points: [], fetchedAt: null }; }
}
