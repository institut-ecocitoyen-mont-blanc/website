"use client";

import { useEffect, useState } from "react";
import { analysisUrl, fetchJson, rows, type LayerPoint, type Row } from "@/lib/environmental-layers";
import { drinkingQuality, unknownQuality, type Quality } from "@/lib/environmental-quality";

export type WaterSummary = { quality: Quality; sample?: Row };

// A single lightweight result per commune supplies sample-level conformity.
// Four concurrent requests at most; detailed analyses remain loaded on click.
export function useDrinkingQuality(points: LayerPoint[], enabled: boolean, revision: number) {
  const [summaries, setSummaries] = useState<Record<string, WaterSummary>>({});
  useEffect(() => {
    setSummaries({});
    if (!enabled || !points.length) return;
    const controller = new AbortController();
    let cursor = 0;
    const worker = async () => {
      while (!controller.signal.aborted && cursor < points.length) {
        const point = points[cursor++];
        let summary: WaterSummary;
        try {
          const url = new URL(analysisUrl("drinking", point.id));
          url.searchParams.set("size", "1");
          const [sample] = rows(await fetchJson(url.toString(), controller.signal));
          summary = { sample, quality: drinkingQuality(sample) };
        } catch {
          summary = { quality: unknownQuality("Conclusion sanitaire indisponible. Actualisez la couche pour réessayer.") };
        }
        if (!controller.signal.aborted) setSummaries((prev) => ({ ...prev, [point.id]: summary }));
      }
    };
    for (let i = 0; i < Math.min(4, points.length); i++) void worker();
    return () => controller.abort();
  }, [points, enabled, revision]);
  return summaries;
}
