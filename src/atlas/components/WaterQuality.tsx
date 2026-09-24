"use client";

import { useEffect, useState } from "react";
import type { LayerPoint } from "@/atlas/lib/environmental-layers";
import { type DrinkingSummary } from "@/atlas/lib/drinking-networks";
import { loadPublishedData } from "@/atlas/lib/published-data";
import { unknownQuality } from "@/atlas/lib/environmental-quality";

export function useDrinkingQuality(points: LayerPoint[], enabled: boolean, revision: number) {
  const [summaries, setSummaries] = useState<Record<string, DrinkingSummary>>({});
  useEffect(() => {
    if (!enabled || !points.length) return;
    const controller = new AbortController();
    void loadPublishedData<Record<string, DrinkingSummary>>("drinking-summaries", controller.signal).then((result) => {
      if (!controller.signal.aborted) setSummaries(result);
    }).catch(() => {
      if (!controller.signal.aborted) setSummaries((prev) => Object.fromEntries(points.map((point) => [point.id, prev[point.id] ?? { quality: unknownQuality("Import des résultats indisponible. Réessayez plus tard."), networks: [] }])));
    });
    return () => controller.abort();
  }, [points, enabled, revision]);
  return summaries;
}
