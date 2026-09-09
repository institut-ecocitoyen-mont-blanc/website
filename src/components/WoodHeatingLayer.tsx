"use client";

import { useEffect, useState } from "react";
import { ImageOverlay, Pane } from "react-leaflet";
import { createWoodHeatmap, WOOD_HEATMAP_BOUNDS } from "@/lib/wood-heatmap";

export default function WoodHeatingLayer({ opacity }: { opacity: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const { width, height, pixels } = createWoodHeatmap();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(width, height);
    image.data.set(pixels);
    context.putImageData(image, 0, 0);
    setUrl(canvas.toDataURL("image/png"));
  }, []);
  const { south, west, north, east } = WOOD_HEATMAP_BOUNDS;
  return <Pane name="wood-heating-demo" style={{ zIndex: 350, pointerEvents: "none" }}>
    {url && <ImageOverlay
      url={url}
      bounds={[[south, west], [north, east]]}
      opacity={opacity}
      interactive={false}
      alt="Chauffage résidentiel : carte de chaleur fictive, sans données réelles"
      attribution="Chauffage résidentiel : données fictives de démonstration"
    />}
  </Pane>;
}
