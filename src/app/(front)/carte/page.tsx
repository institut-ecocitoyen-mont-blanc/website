import { Suspense } from "react";
import {
  fetchAllPollutionSites,
  type PollutionSite,
  type UnmappedPollutionSite,
} from "@/lib/google-sheets";
import CarteClient from "./CarteClient";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Carte participative des sources de pollution",
  description:
    "Consultez la carte participative des sources potentielles de pollution recensées dans la vallée de l’Arve.",
  path: "/carte",
});

export const revalidate = 3600; // Revalidate every hour

export default async function CartePage() {
  let sites: PollutionSite[] = [];
  let unmappedSites: UnmappedPollutionSite[] = [];
  let lastUpdated: string | null = null;
  let dataError = false;

  try {
    const result = await fetchAllPollutionSites();
    sites = result.sites;
    unmappedSites = result.unmappedSites;
    lastUpdated = result.lastUpdated;
  } catch (error) {
    dataError = true;
    console.error("Unable to load the pollution inventory", error);
  }

  return (
    <main className="grow min-h-screen bg-gray-100">
      <section className="py-16 pt-32 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-iec mb-4">
              Carte des Sites de Pollution
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Visualisez les sites de pollution recensés dans le Pays du Mont
              Blanc.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              Cet inventaire est en cours de construction. Nous nous appuyons
              également sur la mémoire et la connaissance collective. Si vous
              connaissez une source de pollution qui ne figure pas sur cette
              carte,{" "}
              <a
                href="https://forms.gle/oUp7WnxcNppePk5PA"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-amber-900"
              >
                merci de remplir ce formulaire
              </a>
              .
            </p>
          </div>

          <Suspense
            fallback={
              // Reserve room for the 48px toolbar, 24px gap and 600px map.
              <div
                role="status"
                className="h-[672px] flex items-center justify-center text-gray-600"
              >
                Chargement de la carte...
              </div>
            }
          >
            <CarteClient
              sites={sites}
              unmappedSites={unmappedSites}
              lastUpdated={lastUpdated}
              dataError={dataError}
            />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
