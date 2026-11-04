"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { clearManifestCache, datasetNeedsAttention, loadDataManifest, loadPublishedData, type DataManifest } from "./lib/published-data";
import { clipAtlasInventory } from "./lib/atlas-inventory";
import { filterCcpmbPoints } from "./lib/ccpmb-territory";
import type { PollutionSitesResult } from "@/lib/google-sheets";
import type { BathingData } from "@/atlas/lib/bathing-water";
import type { RiverAssessments } from "@/atlas/lib/river-assessments";
import type { RoadTrafficData } from "@/atlas/lib/road-traffic";
import type { IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";
import type { GroundwaterCatalogue } from "@/atlas/lib/groundwater";
import type { GeorisquesData } from "@/atlas/lib/georisques";

const AtlasMap = dynamic(() => import("@/atlas/components/AtlasMap"), { ssr: false, loading: () => <div role="status" className="h-[700px] rounded-2xl bg-white border flex items-center justify-center text-slate-500">Chargement de l’atlas…</div> });

interface AtlasData { inventory: PollutionSitesResult | null; bathing: BathingData; riverAssessments: RiverAssessments; traffic: RoadTrafficData; emissions: IndustrialEmissionsData; groundwater: GroundwaterCatalogue; georisques: GeorisquesData }
export type DatasetLoad = "loading" | "ready" | "error";
export type AtlasLoads = Record<keyof AtlasData, DatasetLoad>;
const INITIAL: AtlasData = { inventory: null, bathing: { points: [] }, riverAssessments: { stations: {}, fetchedAt: null }, traffic: { segments: [], year: null, fetchedAt: null }, emissions: { facilities: [], year: null, downloadUrl: null, fetchedAt: null }, groundwater: { stations: [], fetchedAt: null }, georisques: { sites: [], fetchedAt: null, errors: [] } };
const DATASETS = { inventory: "inventory", bathing: "bathing", riverAssessments: "river-assessments", traffic: "traffic", emissions: "emissions", groundwater: "groundwater", georisques: "georisques" } as const;
const LOADING = Object.fromEntries(Object.keys(DATASETS).map(key => [key, "loading"])) as AtlasLoads;
// Shown only when no earlier load succeeded; a failed refresh keeps the last data.
const UNAVAILABLE: Partial<AtlasData> = {
  riverAssessments: { ...INITIAL.riverAssessments, error: "Évaluations officielles indisponibles : les stations sont affichées sans classe." },
  traffic: { ...INITIAL.traffic, error: "Comptages routiers indisponibles. Les autres couches restent accessibles." },
  emissions: { ...INITIAL.emissions, error: "Déclarations d’émissions (IREP) indisponibles : les fiches n’affichent pas les rejets déclarés." },
};
// Published snapshots are shared with other pages: never display points outside the ten communes.
function clip(property: keyof AtlasData, value: unknown) {
  if (property === "inventory") return clipAtlasInventory(value as PollutionSitesResult);
  if (property === "bathing") return { ...(value as BathingData), points: filterCcpmbPoints((value as BathingData).points) };
  if (property === "groundwater") return { ...(value as GroundwaterCatalogue), stations: filterCcpmbPoints((value as GroundwaterCatalogue).stations) };
  return value;
}

export default function AtlasClient() {
  const [data, setData] = useState<AtlasData>(INITIAL);
  const [loads, setLoads] = useState<AtlasLoads>(LOADING);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const loaded = new Map<string, string | undefined>();
    let running = false, signature: string | undefined;
    const fail = (property: keyof AtlasData) => {
      if (loaded.has(DATASETS[property])) return;
      const unavailable = UNAVAILABLE[property];
      if (unavailable) setData(prev => ({ ...prev, [property]: unavailable }));
      setLoads(prev => ({ ...prev, [property]: "error" }));
    };
    const refresh = async () => {
      if (running) return; // A slow refresh must never overwrite a newer one.
      running = true;
      clearManifestCache();
      const failures: string[] = [];
      let problems: { dataset: string; lastSuccessAt: string | null }[] = [];
      try {
        const status: DataManifest = await loadDataManifest();
        if (controller.signal.aborted) return;
        problems = Object.entries(status.datasets).filter(([, entry]) => datasetNeedsAttention(entry)).map(([dataset, entry]) => ({ dataset, lastSuccessAt: entry.lastSuccessAt ?? null }));
        // Only download datasets whose published hash changed since the last successful load.
        await Promise.all(Object.entries(DATASETS).filter(([, key]) => !loaded.has(key) || loaded.get(key) !== status.datasets[key]?.hash).map(async ([name, key]) => {
          const property = name as keyof AtlasData;
          try {
            const value = await loadPublishedData(key, controller.signal);
            if (controller.signal.aborted) return;
            loaded.set(key, status.datasets[key]?.hash);
            setData(prev => ({ ...prev, [property]: clip(property, value) }));
            setLoads(prev => ({ ...prev, [property]: "ready" }));
          } catch { if (!controller.signal.aborted) { failures.push(key); fail(property); } }
        }));
        // Layers loading their own snapshots refresh only when the manifest changed.
        const next = JSON.stringify(Object.entries(status.datasets).map(([key, entry]) => [key, entry.hash]));
        if (signature !== undefined && next !== signature) setRevision(r => r + 1);
        signature = next;
      } catch {
        if (!controller.signal.aborted) { failures.push("catalogue"); for (const property of Object.keys(DATASETS) as (keyof AtlasData)[]) fail(property); }
      } finally { running = false; }
      if (!controller.signal.aborted) {
        if (failures.length || problems.length) console.warn("[Atlas] Imports indisponibles ou en retard. Les dernières données disponibles sont conservées.", { loadingFailures: failures, imports: problems });
        setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 300000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return <>
    {loading && <p className="mb-3 text-xs text-slate-600" role="status">Chargement des jeux de données publiés…</p>}
    <AtlasMap {...data} loads={loads} dataRevision={revision} />
  </>;
}
