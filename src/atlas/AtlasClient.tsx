"use client";

import dynamic from "next/dynamic";
import type { PollutionSitesResult } from "@/lib/google-sheets";
import type { BathingData } from "@/atlas/lib/bathing-water";
import type { RiverAssessments } from "@/atlas/lib/river-assessments";
import type { RiverCatalogue } from "@/atlas/lib/river-catalogue";
import type { RoadTrafficData } from "@/atlas/lib/road-traffic";
import type { IndustrialEmissionsData } from "@/atlas/lib/industrial-emissions";
import type { GroundwaterCatalogue } from "@/atlas/lib/groundwater";

const AtlasMap = dynamic(() => import("@/atlas/components/AtlasMap"), { ssr: false, loading: () => <div role="status" className="h-[700px] rounded-2xl bg-white border flex items-center justify-center text-slate-500">Chargement de l’atlas…</div> });

export default function AtlasClient({ inventory, bathing, riverAssessments, riverCatalogue, traffic, emissions, groundwater }: { inventory: PollutionSitesResult | null; bathing: BathingData; riverAssessments: RiverAssessments; riverCatalogue: RiverCatalogue; traffic: RoadTrafficData; emissions: IndustrialEmissionsData; groundwater: GroundwaterCatalogue }) {
  return <AtlasMap inventory={inventory} bathing={bathing} riverAssessments={riverAssessments} riverCatalogue={riverCatalogue} traffic={traffic} emissions={emissions} groundwater={groundwater} />;
}
