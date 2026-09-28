"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseAtlasUrlState, writeAtlasUrlState, withAtlasLayer, withAtlasPin, type AtlasUrlState, type AtlasUrlLayer, type AtlasPinLayer, type AtlasUrlPin } from "../lib/atlas-url-state";

const CHANGE_EVENT = "atlas-url-change";
function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => { window.removeEventListener("popstate", onChange); window.removeEventListener(CHANGE_EVENT, onChange); };
}
const getSnapshot = () => window.location.search;
const getServerSnapshot = () => "";
function updateUrl(update: (state: AtlasUrlState) => AtlasUrlState) {
  const url = new URL(window.location.href);
  url.search = writeAtlasUrlState(url.search, update(parseAtlasUrlState(url.search)));
  if (url.href === window.location.href) return;
  // Preserve Next's history metadata and other query parameters/hash. No route
  // reload or scroll reset; back/forward restores both layers and the open fiche.
  window.history.pushState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
const setLayer = (layer: AtlasUrlLayer, enabled: boolean) => updateUrl(state => withAtlasLayer(state, layer, enabled));
const setPin = (pin: AtlasUrlPin | null) => updateUrl(state => withAtlasPin(state, pin));

export function useAtlasUrlState() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = useMemo(() => parseAtlasUrlState(search), [search]);
  return { ...state, setLayer, setPin };
}
export function useAtlasUrlLayer(layer: AtlasUrlLayer) {
  const state = useAtlasUrlState();
  const setEnabled = useCallback((enabled: boolean) => setLayer(layer, enabled), [layer]);
  return [state.layers.includes(layer), setEnabled] as const;
}
export function useAtlasUrlPin(layer: AtlasPinLayer) {
  const state = useAtlasUrlState();
  const select = useCallback((id: string | null | undefined) => setPin(id ? { layer, id } : null), [layer]);
  return [state.pin?.layer === layer ? state.pin.id : undefined, select] as const;
}
