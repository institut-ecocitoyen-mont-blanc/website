"use client";

import { useEffect, useState } from "react";
import type { LayerPoint } from "@/atlas/lib/environmental-layers";
import { type DrinkingSummary } from "@/atlas/lib/drinking-networks";
import { loadPublishedData } from "@/atlas/lib/published-data";
import { unknownQuality } from "@/atlas/lib/environmental-quality";

// Once loaded, every commune gets an explicit state: absence is never "loading".
const unavailable = (label: string, detail: string): DrinkingSummary => ({ quality: { ...unknownQuality(detail), label }, networks: [] });
export function useDrinkingQuality(points: LayerPoint[], enabled: boolean, revision: number) {
  const [summaries, setSummaries] = useState<Record<string, DrinkingSummary>>({});
  useEffect(() => {
    if (!enabled || !points.length) return;
    const controller = new AbortController();
    void loadPublishedData<Record<string, DrinkingSummary>>("drinking-summaries", controller.signal).then((result) => {
      if (!controller.signal.aborted) setSummaries({ ...result, ...Object.fromEntries(points.filter((point) => !result[point.id]).map((point) => [point.id, unavailable("Conclusions indisponibles pour cette commune", "Cette commune est absente du dernier import des conclusions par réseau. Consultez la source officielle.")])) });
    }).catch(() => {
      if (!controller.signal.aborted) setSummaries((prev) => Object.fromEntries(points.map((point) => [point.id, prev[point.id] ?? unavailable("Conclusions temporairement indisponibles", "Import des résultats indisponible. Réessayez plus tard.")])));
    });
    return () => controller.abort();
  }, [points, enabled, revision]);
  return summaries;
}
