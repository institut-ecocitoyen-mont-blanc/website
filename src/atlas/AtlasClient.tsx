"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { clearManifestCache, datasetNeedsAttention, loadDataManifest, loadPublishedData, type DataManifest } from "./lib/published-data";
import type { PollutionSitesResult } from "@/lib/google-sheets";
import type { BathingData } from "@/atlas/lib/bathing-water";
import type { RiverAssessments } from "@/atlas/lib/river-assessments";
import type { RiverCatalogue } from "@/atlas/lib/river-catalogue";
import type { RoadTrafficData } from "@/atlas/lib/road-traffic";
import type { IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";
import type { GroundwaterCatalogue } from "@/atlas/lib/groundwater";
import type { GeorisquesData } from "@/atlas/lib/georisques";

const AtlasMap = dynamic(() => import("@/atlas/components/AtlasMap"), { ssr: false, loading: () => <div role="status" className="h-[700px] rounded-2xl bg-white border flex items-center justify-center text-slate-500">Chargement de l’atlas…</div> });

interface AtlasData { inventory: PollutionSitesResult | null; bathing: BathingData; riverAssessments: RiverAssessments; riverCatalogue: RiverCatalogue; traffic: RoadTrafficData; emissions: IndustrialEmissionsData; groundwater: GroundwaterCatalogue; georisques: GeorisquesData }
const INITIAL: AtlasData = { inventory: null, bathing: { points: [] }, riverAssessments: { stations: {}, fetchedAt: null }, riverCatalogue: { points: [], fetchedAt: null }, traffic: { segments: [], year: null, fetchedAt: null }, emissions: { facilities: [], year: null, downloadUrl: null, fetchedAt: null }, groundwater: { stations: [], fetchedAt: null }, georisques: { sites: [], fetchedAt: null, errors: [] } };
const DATASETS = { inventory: "inventory", bathing: "bathing", riverAssessments: "river-assessments", riverCatalogue: "rivers", traffic: "traffic", emissions: "emissions", groundwater: "groundwater", georisques: "georisques" } as const;

export default function AtlasClient() {
  const [data, setData] = useState<AtlasData>(INITIAL);
  const [manifest, setManifest] = useState<DataManifest>();
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      clearManifestCache();
      const failures: string[] = [];
      try {
        const status = await loadDataManifest();
        if (!controller.signal.aborted) setManifest(status);
        await Promise.all(Object.entries(DATASETS).map(async ([property, key]) => {
          try {
            const value = await loadPublishedData(key, controller.signal);
            if (!controller.signal.aborted) setData((prev) => ({ ...prev, [property]: value }));
          } catch { failures.push(key); }
        }));
      } catch { failures.push("catalogue"); }
      if (!controller.signal.aborted) { setErrors(failures); setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 300000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [revision]);
  const problems = manifest ? Object.entries(manifest.datasets).filter(([, entry]) => datasetNeedsAttention(entry)) : [];
  return <>
    <div className="mb-3 text-xs text-slate-600" aria-live="polite">
      {loading ? <p>Chargement des jeux de données publiés…</p> : <p>Données synchronisées automatiquement · les dates des mesures restent indiquées dans chaque fiche. <button className="underline text-blue-iec" onClick={() => setRevision((value) => value + 1)}>Actualiser</button></p>}
      {(errors.length > 0 || problems.length > 0) && <details className="mt-2 rounded-lg bg-amber-50 p-3 text-amber-900"><summary>Certains imports sont indisponibles ou en retard. Les dernières données récupérées restent affichées lorsqu’elles existent.</summary>
        {errors.length > 0 && <p className="mt-2">Chargement indisponible : {errors.join(", ")}.</p>}
        <ul className="mt-2 list-disc pl-4">{problems.map(([key, entry]) => <li key={key}>{key} · dernier import réussi : {entry.lastSuccessAt ? new Date(entry.lastSuccessAt).toLocaleString("fr-FR") : "aucun"}.</li>)}</ul>
      </details>}
    </div>
    <AtlasMap {...data} dataRevision={revision + (manifest ? Date.parse(manifest.checkedAt) : 0)} />
  </>;
}
