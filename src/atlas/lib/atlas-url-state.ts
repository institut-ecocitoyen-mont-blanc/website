// Stable public URL identifiers. Keep disabled demonstration layers out of links.
export const ATLAS_URL_LAYERS = [
  "inventory", "atmo", "atmo-model-pm25", "atmo-model-pm10", "atmo-model-no2", "atmo-model-o3",
  "traffic", "cerema-light", "rivers", "bathing", "drinking", "groundwater", "georisques", "pesticide-purchases",
] as const;
export type AtlasUrlLayer = typeof ATLAS_URL_LAYERS[number];
export type AtlasPinLayer = Exclude<AtlasUrlLayer, `atmo-model-${string}`>;
export interface AtlasUrlPin { layer: AtlasPinLayer; id: string }
export interface AtlasUrlState { layers: AtlasUrlLayer[]; pin: AtlasUrlPin | null }
const validLayer = (value: string): value is AtlasUrlLayer => ATLAS_URL_LAYERS.some(id => id === value);
const validPinLayer = (value: string): value is AtlasPinLayer => validLayer(value) && !value.startsWith("atmo-model-");
const sortLayers = (layers: readonly AtlasUrlLayer[]) => ATLAS_URL_LAYERS.filter(id => layers.includes(id));

export function parseAtlasUrlState(search: string): AtlasUrlState {
  const params = new URLSearchParams(search);
  // Absence means the normal default; an explicitly empty list means no layers.
  const layers = params.has("layers") ? (params.get("layers") ?? "").split(",").filter(validLayer) : ["inventory" as const];
  const raw = params.get("pin") ?? "", separator = raw.indexOf(":"), layer = raw.slice(0, separator), id = raw.slice(separator + 1);
  const pin = separator > 0 && validPinLayer(layer) && id.length > 0 && id.length <= 512 && !/[\u0000-\u001f\u007f]/.test(id) ? { layer, id } : null;
  // A direct detail link must also enable its source so deferred data can load.
  return { layers: sortLayers(pin ? [...layers, pin.layer] : layers), pin };
}
export function writeAtlasUrlState(search: string, state: AtlasUrlState): string {
  const params = new URLSearchParams(search);
  const layers = sortLayers(state.pin ? [...state.layers, state.pin.layer] : state.layers);
  params.set("layers", layers.join(","));
  if (state.pin) params.set("pin", `${state.pin.layer}:${state.pin.id}`);
  else params.delete("pin");
  return params.toString();
}
export function withAtlasLayer(state: AtlasUrlState, layer: AtlasUrlLayer, enabled: boolean): AtlasUrlState {
  return { layers: sortLayers(enabled ? [...state.layers, layer] : state.layers.filter(id => id !== layer)),
    pin: !enabled && state.pin?.layer === layer ? null : state.pin };
}
export function withAtlasPin(state: AtlasUrlState, pin: AtlasUrlPin | null): AtlasUrlState {
  return { layers: sortLayers(pin ? [...state.layers, pin.layer] : state.layers), pin };
}
