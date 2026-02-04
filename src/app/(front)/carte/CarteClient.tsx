"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, ExternalLink, X, Filter, XCircle } from "lucide-react";
import {
  type PollutionSite,
  type DiffusePollutionSite,
  type PollutionSiteBase,
  getSectorColor,
  getCompartmentColor,
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
    null,
  );
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCompartments, setSelectedCompartments] = useState<Set<string>>(
    new Set(),
  );

  // Dynamically extract unique compartments from all sites
  const compartmentList = useMemo(() => {
    const allCompartments = new Set<string>();
    [...sites, ...diffuseSites].forEach((site) => {
      site.pollutions.forEach((p) => {
        if (p.environmentalCompartment) {
          allCompartments.add(p.environmentalCompartment);
        }
      });
    });
    return Array.from(allCompartments)
      .sort()
      .map((name) => ({ name, color: getCompartmentColor(name) }));
  }, [sites, diffuseSites]);

  // Filter sites based on selected sectors and compartments
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      // Filter by sector
      if (selectedSectors.size > 0 && !selectedSectors.has(site.sector)) {
        return false;
      }
      // Filter by compartment (site must have at least one pollution with matching compartment)
      if (selectedCompartments.size > 0) {
        const hasMatchingCompartment = site.pollutions.some((p) =>
          selectedCompartments.has(p.environmentalCompartment),
        );
        if (!hasMatchingCompartment) {
          return false;
        }
      }
      return true;
    });
  }, [sites, selectedSectors, selectedCompartments]);

  const filteredDiffuseSites = useMemo(() => {
    return diffuseSites.filter((site) => {
      if (selectedSectors.size > 0 && !selectedSectors.has(site.sector)) {
        return false;
      }
      if (selectedCompartments.size > 0) {
        const hasMatchingCompartment = site.pollutions.some((p) =>
          selectedCompartments.has(p.environmentalCompartment),
        );
        if (!hasMatchingCompartment) {
          return false;
        }
      }
      return true;
    });
  }, [diffuseSites, selectedSectors, selectedCompartments]);

  const hasActiveFilters =
    selectedSectors.size > 0 || selectedCompartments.size > 0;

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sector)) {
        newSet.delete(sector);
      } else {
        newSet.add(sector);
      }
      return newSet;
    });
  };

  const toggleCompartment = (compartment: string) => {
    setSelectedCompartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(compartment)) {
        newSet.delete(compartment);
      } else {
        newSet.add(compartment);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedSectors(new Set());
    setSelectedCompartments(new Set());
  };

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
            <MapComponent
              sites={filteredSites}
              onSelectSite={handleSelectSite}
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              {/* Results count */}
              <span className="text-gray-500 text-sm">
                {filteredSites.length} site
                {filteredSites.length !== 1 ? "s" : ""} de pollution affiché
                {filteredSites.length !== 1 ? "s" : ""}
                {hasActiveFilters && ` (sur ${sites.length} au total)`}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Effacer les filtres
                </button>
              )}
            </div>

            {/* Compartment filters */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Compartiment environnemental
              </h3>
              <div className="flex flex-wrap gap-2">
                {compartmentList.map(({ name, color }) => {
                  const isSelected = selectedCompartments.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleCompartment(name)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        isSelected
                          ? "text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={
                        isSelected ? { backgroundColor: color } : undefined
                      }
                    >
                      <div
                        className="w-3 h-3 rounded-full border border-white/50"
                        style={{ backgroundColor: color }}
                      />
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sector filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Secteur d&apos;activité
              </h3>
              <div className="flex flex-wrap gap-2">
                {sectorList.map(({ name, color }) => {
                  const isSelected = selectedSectors.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleSector(name)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                        isSelected
                          ? "text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={
                        isSelected ? { backgroundColor: color } : undefined
                      }
                    >
                      <div
                        className="w-3 h-3 rounded-full border border-white/50"
                        style={{ backgroundColor: color }}
                      />
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Diffuse Pollution Section */}
          {filteredDiffuseSites.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-blue-iec mb-4">
                Pollution Diffuse
              </h2>
              <p className="text-gray-600 mb-6">
                Sources de pollution sans localisation géographique précise.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDiffuseSites.map((site) => (
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

              {/* Pollutions list */}
              {selectedSite.pollutions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                    {selectedSite.pollutions.length > 1
                      ? `Polluants Potentiels (${selectedSite.pollutions.length})`
                      : "Polluant Potentiel"}
                  </h4>
                  <div className="space-y-3">
                    {selectedSite.pollutions.map((pollution, index) => (
                      <div
                        key={index}
                        className={`${
                          selectedSite.pollutions.length > 1
                            ? "bg-gray-50 rounded-lg p-3 border-l-4"
                            : ""
                        }`}
                        style={
                          selectedSite.pollutions.length > 1
                            ? {
                                borderLeftColor: getCompartmentColor(
                                  pollution.environmentalCompartment,
                                ),
                              }
                            : undefined
                        }
                      >
                        {pollution.environmentalCompartment && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Compartiment
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.environmentalCompartment}
                            </p>
                          </div>
                        )}
                        {pollution.chemicalForm && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Forme physico-chimique
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.chemicalForm}
                            </p>
                          </div>
                        )}
                        {pollution.chemicalFamilies && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Familles chimiques
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.chemicalFamilies}
                            </p>
                          </div>
                        )}
                        {pollution.frequency && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Fréquence
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.frequency}
                            </p>
                          </div>
                        )}
                        {pollution.healthImpact && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Impact sanitaire
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.healthImpact}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
