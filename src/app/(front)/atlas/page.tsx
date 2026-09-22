import { fetchAllPollutionSites, type PollutionSitesResult } from "@/lib/google-sheets";
import { createPageMetadata } from "@/lib/seo";
import AtlasClient from "@/atlas/AtlasClient";
import { loadBathingWater } from "@/atlas/lib/bathing-water-source";
import { loadRiverAssessments } from "@/atlas/lib/river-assessments-source";
import { loadRiverCatalogue } from "@/atlas/lib/river-catalogue";
import { loadRoadTraffic } from "@/atlas/lib/road-traffic-source";
import { clipAtlasInventory } from "@/atlas/lib/atlas-inventory";
import { loadIndustrialEmissions } from "@/atlas/lib/industrial-emissions-source";
import { loadGroundwaterCatalogue } from "@/atlas/lib/groundwater-source";

export const metadata = createPageMetadata({ title: "Atlas environnemental du Pays du Mont-Blanc", description: "Superposez l’inventaire participatif, la qualité de l’air et les données publiques sur l’eau dans le Pays du Mont-Blanc.", path: "/atlas" });
export const revalidate = 3600;

export default async function AtlasPage() {
  const bathingPromise = loadBathingWater();
  const riverPromise = loadRiverAssessments();
  const riverCataloguePromise = loadRiverCatalogue();
  const trafficPromise = loadRoadTraffic();
  const emissionsPromise = loadIndustrialEmissions();
  const groundwaterPromise = loadGroundwaterCatalogue();
  let inventory: PollutionSitesResult | null = null;
  try { inventory = clipAtlasInventory(await fetchAllPollutionSites()); }
  catch (error) { console.error("Unable to load atlas inventory", error); }
  return (
    <main className="grow bg-slate-50 min-h-screen pt-32 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-iec mb-2">PAYS DU MONT-BLANC · AIR, EAU ET TERRITOIRE</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Atlas environnemental</h1>
            <p className="mt-3 text-slate-600 max-w-2xl">Croisez les regards sur le territoire. Activez plusieurs couches et cliquez sur la carte pour explorer leurs données.</p>
          </div>
        </div>
        <AtlasClient inventory={inventory} bathing={await bathingPromise} riverAssessments={await riverPromise} riverCatalogue={await riverCataloguePromise} traffic={await trafficPromise} emissions={await emissionsPromise} groundwater={await groundwaterPromise} />
      </div>
    </main>
  );
}
