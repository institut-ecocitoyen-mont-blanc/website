"use client";

import dynamic from "next/dynamic";
import type { PollutionSitesResult } from "@/lib/google-sheets";

const AtlasMap = dynamic(() => import("@/components/AtlasMap"), { ssr: false, loading: () => <div role="status" className="h-[700px] rounded-2xl bg-white border flex items-center justify-center text-slate-500">Chargement de l’atlas…</div> });

export default function AtlasClient({ inventory }: { inventory: PollutionSitesResult | null }) {
  return <AtlasMap inventory={inventory} />;
}
