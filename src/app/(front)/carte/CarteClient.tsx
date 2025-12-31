"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, ExternalLink, X } from "lucide-react";
import {
  type PollutionSite,
  type DiffusePollutionSite,
  type PollutionSiteBase,
  getSectorColor,
  sectorList,
} from "@/lib/google-sheets";

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-iec mx-auto mb-4" />
        <p className="text-gray-600">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

interface CarteClientProps {
  sites: PollutionSite[];
  diffuseSites: DiffusePollutionSite[];
}

export default function CarteClient({ sites, diffuseSites }: CarteClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState<PollutionSiteBase | null>(
    null
  );

  // Open site from URL search param on initial load
  useEffect(() => {
    const siteId = searchParams.get("site");
    if (siteId) {
      const parsedId = parseInt(siteId, 10);
      const site =
        sites.find((s) => s.id === parsedId) ||
        diffuseSites.find((s) => s.id === parsedId);
      if (site) {
        setSelectedSite(site);
      }
    }
  }, [searchParams, sites, diffuseSites]);

  // Update URL when selecting/deselecting a site
  const handleSelectSite = (site: PollutionSiteBase | null) => {
    setSelectedSite(site);
    if (site) {
      router.replace(`/carte?site=${site.id}`, { scroll: false });
    } else {
      router.replace("/carte", { scroll: false });
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (selectedSite) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedSite]);

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

          {/* Note about collaborative inventory */}
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

          {/* Map container */}
          <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
            <MapComponent sites={sites} onSelectSite={handleSelectSite} />
          </div>

          {/* Legend - below map */}
          <div className="bg-white rounded-lg shadow-md p-4 mt-6">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Légende
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sectorList.map(({ name, color }) => (
                <div key={name} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-600">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diffuse Pollution Section */}
          {diffuseSites.length > 0 && (
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-blue-iec mb-4">
                Pollution Diffuse
              </h2>
              <p className="text-gray-600 mb-6">
                Sources de pollution sans localisation géographique précise.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diffuseSites.map((site) => (
                  <div
                    key={`diffuse-${site.id}-${site.name}`}
                    className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectSite(site)}
                  >
                    <div
                      className="w-full h-2 rounded-full mb-3"
                      style={{ backgroundColor: getSectorColor(site.sector) }}
                    />
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {site.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">{site.sector}</p>
                    {site.location && (
                      <p className="text-sm text-gray-600">{site.location}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Site details modal */}
      {selectedSite && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
          onClick={() => handleSelectSite(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-4 border-b flex justify-between items-start"
              style={{
                backgroundColor: getSectorColor(selectedSite.sector),
              }}
            >
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedSite.name}
                </h3>
                <p className="text-white/80 text-sm">{selectedSite.location}</p>
              </div>
              <button
                onClick={() => handleSelectSite(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  Secteur d&apos;activité
                </h4>
                <p className="text-gray-900">{selectedSite.sector}</p>
              </div>

              {selectedSite.pollutionType && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Type de pollution
                  </h4>
                  <p className="text-gray-900">{selectedSite.pollutionType}</p>
                </div>
              )}

              {selectedSite.environmentalCompartment && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Compartiment environnemental
                  </h4>
                  <p className="text-gray-900">
                    {selectedSite.environmentalCompartment}
                  </p>
                </div>
              )}

              {selectedSite.chemicalForm && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Forme physico-chimique
                  </h4>
                  <p className="text-gray-900">{selectedSite.chemicalForm}</p>
                </div>
              )}

              {selectedSite.chemicalFamilies && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Familles chimiques
                  </h4>
                  <p className="text-gray-900">
                    {selectedSite.chemicalFamilies}
                  </p>
                </div>
              )}

              {selectedSite.frequency && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Fréquence
                  </h4>
                  <p className="text-gray-900">{selectedSite.frequency}</p>
                </div>
              )}

              {selectedSite.healthImpact && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Impact sanitaire
                  </h4>
                  <p className="text-gray-900">{selectedSite.healthImpact}</p>
                </div>
              )}

              {selectedSite.accidents && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Accidents recensés
                  </h4>
                  <p className="text-gray-900">{selectedSite.accidents}</p>
                </div>
              )}

              {selectedSite.link && (
                <div className="pt-4 border-t">
                  <a
                    href={selectedSite.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-iec hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Plus d&apos;informations
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
