"use client";

import { useEffect, useState } from "react";
import type { LayerPoint } from "@/lib/environmental-layers";
import { loadDrinkingSummaries, type DrinkingSummary } from "@/lib/drinking-networks";

export function useDrinkingQuality(points: LayerPoint[], enabled: boolean, revision: number) {
  const [summaries, setSummaries] = useState<Record<string, DrinkingSummary>>({});
  useEffect(() => {
    setSummaries({});
    if (!enabled || !points.length) return;
    const controller = new AbortController();
    void loadDrinkingSummaries(points.map((p) => p.id), controller.signal, (id, summary) => {
      if (!controller.signal.aborted) setSummaries((prev) => ({ ...prev, [id]: summary }));
    });
    return () => controller.abort();
  }, [points, enabled, revision]);
  return summaries;
}
