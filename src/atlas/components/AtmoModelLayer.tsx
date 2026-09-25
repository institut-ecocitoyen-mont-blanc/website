"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { CCPMB_BOUNDS, CCPMB_POLYGONS } from "@/atlas/lib/ccpmb-territory";
import { ATMO_MODELS, ATMO_MODEL_SOURCE, parseAtmoModelSnapshot, type AtmoModelId } from "@/atlas/lib/atmo-model";
import { loadPublishedData } from "@/atlas/lib/published-data";
import EvidenceLayerControl from "./EvidenceLayerControl";
import AtmoModelLegend from "./AtmoModelLegend";

export type ModelStatus = "loading" | "ready" | "error";

// Render the published, territory-clipped image. Browsers never request WMS tiles.
export default function AtmoModelLayer({ pollutant, opacity, onStatus }: { pollutant: AtmoModelId; opacity: number; onStatus: (id: AtmoModelId, status: ModelStatus) => void }) {
  const map = useMap();
  const layerRef = useRef<L.GridLayer | null>(null);
  const opacityRef = useRef(opacity);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const image = new Image();
    onStatus(pollutant, "loading");
    async function load() {
      const data = parseAtmoModelSnapshot(await loadPublishedData(`atmo-model-${pollutant}`, controller.signal), pollutant);
      if (disposed) return;
      image.src = data.imageDataUrl;
      await image.decode();
      if (disposed) return;
      if (image.naturalWidth !== data.width || image.naturalHeight !== data.height) throw new Error("Dimensions de la carte Atmo incompatibles.");
      const [west, south, east, north] = data.bbox;
      const ClippedTiles = L.GridLayer.extend({
        createTile(coords: L.Coords, done: L.DoneCallback) {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 256;
          canvas.className = "atmo-model-tile";
          canvas.dataset.pollutant = pollutant;
          canvas.setAttribute("aria-label", "Modélisation Atmo publiée, limitée aux dix communes");
          const origin = L.point(coords.x * 256, coords.y * 256);
          const nw = L.CRS.EPSG3857.project(map.unproject(origin, coords.z));
          const se = L.CRS.EPSG3857.project(map.unproject(origin.add([256, 256]), coords.z));
          const context = canvas.getContext("2d");
          if (context) {
            // Keep a final vector mask at every zoom to avoid edge interpolation outside the territory.
            context.beginPath();
            for (const polygon of CCPMB_POLYGONS) for (const ring of polygon) {
              ring.forEach(([lng, lat], index) => {
                const p = map.project([lat, lng], coords.z).subtract(origin);
                if (index === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
              });
              context.closePath();
            }
            context.clip("evenodd");
            context.drawImage(image, (west - nw.x) / (se.x - nw.x) * 256, (nw.y - north) / (nw.y - se.y) * 256, (east - west) / (se.x - nw.x) * 256, (north - south) / (nw.y - se.y) * 256);
          }
          requestAnimationFrame(() => { if (!disposed) done(context ? undefined : new Error("Canvas indisponible"), canvas); });
          return canvas;
        },
      });
      const layer = new ClippedTiles();
      L.setOptions(layer, {
        bounds: [[CCPMB_BOUNDS.south, CCPMB_BOUNDS.west], [CCPMB_BOUNDS.north, CCPMB_BOUNDS.east]],
        tileSize: 256, opacity: opacityRef.current, zIndex: 250 + ATMO_MODELS.findIndex(({ id }) => id === pollutant), keepBuffer: 1, noWrap: true,
        attribution: '<a href="https://www.atmo-auvergnerhonealpes.fr/carte/exposition-la-pollution-atmospherique-en-2025">Atmo Auvergne-Rhône-Alpes · modélisation 2025 · ODbL 1.0</a>',
      });
      layer.on("load", () => { if (!disposed) onStatus(pollutant, "ready"); });
      layer.on("tileerror", () => { if (!disposed) onStatus(pollutant, "error"); });
      layerRef.current = layer;
      layer.addTo(map);
      onStatus(pollutant, "ready");
    }
    void load().catch(() => { if (!disposed) onStatus(pollutant, "error"); });
    return () => {
      disposed = true;
      controller.abort();
      layerRef.current?.remove();
      layerRef.current = null;
      image.src = "";
    };
  }, [map, pollutant, onStatus]);
  useEffect(() => { opacityRef.current = opacity; layerRef.current?.setOpacity(opacity); }, [opacity, pollutant]);
  return null;
}

function AtmoModelControls({ pollutant, status, onRetry }: {
  pollutant: AtmoModelId; status: ModelStatus; onRetry: () => void;
}) {
  const model = ATMO_MODELS.find((model) => model.id === pollutant)!;
  return <div className="space-y-3 text-xs">
      <p>{model.metric} · {model.period}. Modélisation historique, pas la qualité de l’air actuelle.</p>
      {status === "loading" && <p role="status">Chargement de la carte {model.label}…</p>}
      {status === "error" && <p role="alert" className="text-amber-800">La carte publiée {model.label} est indisponible. Les autres couches restent accessibles. <button className="underline" onClick={onRetry}>Réessayer la carte {model.label}</button></p>}
      <AtmoModelLegend pollutant={pollutant} />
      <p className="text-slate-500">Limites : incertitude à l’échelle d’un bâtiment ; cette carte n’identifie pas les sources d’émission. Image précalculée, pas une grille de concentrations interrogeable.</p>
    <a className="text-blue-iec underline" href={ATMO_MODEL_SOURCE} target="_blank" rel="noreferrer">Cartes et données annuelles · Atmo</a>
    <p className="text-slate-500">Source : Atmo Auvergne-Rhône-Alpes · cartes annuelles 2025, sous <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a>. <a className="underline" href="https://depot.atmo-aura.fr/modelisation/opendata_geotiff/2025/" target="_blank" rel="noreferrer">Données originales</a>. Affichage limité aux dix communes.</p>
  </div>;
}

type ModelState = { enabled: boolean; opacity: number; status: ModelStatus; revision: number };
export function useAtmoModelLayers() {
  const [states, setStates] = useState<Record<AtmoModelId, ModelState>>(() => Object.fromEntries(
    ATMO_MODELS.map(({ id }) => [id, { enabled: false, opacity: 0.55, status: "loading", revision: 0 }]),
  ) as Record<AtmoModelId, ModelState>);
  const update = useCallback((id: AtmoModelId, value: Partial<ModelState>) => {
    setStates((previous) => ({ ...previous, [id]: { ...previous[id], ...value } }));
  }, []);
  const onStatus = useCallback((id: AtmoModelId, status: ModelStatus) => update(id, { status }), [update]);
  return {
    activeCount: ATMO_MODELS.filter(({ id }) => states[id].enabled).length,
    controls: ATMO_MODELS.map(({ id, label, period }) => <EvidenceLayerControl
      key={id} title={`${label} · modèle`} source={`Atmo Auvergne-Rhône-Alpes · ${period}`} enabled={states[id].enabled}
      onEnabled={(enabled) => update(id, { enabled })} opacityControl={{ value: states[id].opacity, onChange: (opacity) => update(id, { opacity }) }}>
      <AtmoModelControls pollutant={id} status={states[id].status} onRetry={() => update(id, { revision: states[id].revision + 1 })} />
    </EvidenceLayerControl>),
    layers: ATMO_MODELS.map(({ id }) => states[id].enabled && <AtmoModelLayer
      key={`${id}-${states[id].revision}`} pollutant={id} opacity={states[id].opacity} onStatus={onStatus} />),
  };
}
