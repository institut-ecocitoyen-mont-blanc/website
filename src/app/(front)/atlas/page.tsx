import { createPageMetadata } from "@/lib/seo";
import AtlasClient from "@/atlas/AtlasClient";

export const metadata = createPageMetadata({ title: "Atlas environnemental du Pays du Mont-Blanc", description: "Superposez l’inventaire participatif, la qualité de l’air et les données publiques sur l’eau dans le Pays du Mont-Blanc.", path: "/atlas" });
export default function AtlasPage() {
  return (
    <main className="grow bg-slate-50 min-h-screen pt-32 pb-12">
      <div className="w-full px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Atlas environnemental</h1>
            <p className="mt-3 text-slate-600 max-w-2xl">Croisez les regards sur le territoire. Activez plusieurs couches et cliquez sur la carte pour explorer leurs données.</p>
          </div>
        </div>
        <AtlasClient />
      </div>
    </main>
  );
}
