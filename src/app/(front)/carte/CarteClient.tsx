"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ExternalLink, X, XCircle } from "lucide-react";
import {
  type PollutionSite,
  type PollutionSiteBase,
  type UnmappedPollutionSite,
  getCompartmentColor,
  getSectorColor,
} from "@/lib/google-sheets";

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
  unmappedSites: UnmappedPollutionSite[];
}

interface FilterOption {
  value: string;
  color?: string;
}

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
}

function FilterGroup({
  title,
  options,
  selectedValues,
  onToggle,
}: FilterGroupProps) {
  if (options.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, color }) => {
          const isSelected = selectedValues.has(value);
          const buttonClassName =
            "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 " +
            (isSelected
              ? "text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200");

          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(value)}
              className={buttonClassName}
              style={
                isSelected
                  ? { backgroundColor: color ?? "#1d6ab2" }
                  : undefined
              }
            >
              {color && (
                <span
                  className="w-3 h-3 rounded-full border border-white/50"
                  style={{ backgroundColor: color }}
                />
              )}
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getUniqueValues(
  sites: PollutionSiteBase[],
  getValue: (site: PollutionSiteBase) => string,
): string[] {
  return Array.from(
    new Set(sites.map(getValue).map((value) => value.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function toggleSetValue(
  setValues: Dispatch<SetStateAction<Set<string>>>,
  value: string,
) {
  setValues((previousValues) => {
    const nextValues = new Set(previousValues);

    if (nextValues.has(value)) {
      nextValues.delete(value);
    } else {
      nextValues.add(value);
    }

    return nextValues;
  });
}

function isWebLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CarteClient({
  sites,
  unmappedSites,
}: CarteClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState<PollutionSiteBase | null>(
    null,
  );
  const [selectedCommunes, setSelectedCommunes] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(
    new Set(),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(),
  );
  const [selectedLocalizationTypes, setSelectedLocalizationTypes] = useState<
    Set<string>
  >(new Set());

  const allSites = useMemo<PollutionSiteBase[]>(
    () => [...sites, ...unmappedSites],
    [sites, unmappedSites],
  );

  const communeOptions = useMemo(
    () =>
      getUniqueValues(allSites, (site) => site.commune).map((value) => ({
        value,
      })),
    [allSites],
  );
  const sectorOptions = useMemo(
    () =>
      getUniqueValues(allSites, (site) => site.sector).map((value) => ({
        value,
        color: getSectorColor(value),
      })),
    [allSites],
  );
  const statusOptions = useMemo(() => {
    const values = getUniqueValues(allSites, (site) => site.activityStatus);
    const order = ["Actuelle", "Passée"];

    return values
      .sort((a, b) => {
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, "fr");
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map((value) => ({ value }));
  }, [allSites]);
  const localizationOptions = useMemo(() => {
    const values = getUniqueValues(allSites, (site) => site.localizationType);
    const order = ["Localisée", "Diffuse"];

    return values
      .sort((a, b) => {
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, "fr");
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map((value) => ({ value }));
  }, [allSites]);

  const matchesFilters = (site: PollutionSiteBase) => {
    if (
      selectedCommunes.size > 0 &&
      !selectedCommunes.has(site.commune)
    ) {
      return false;
    }
    if (selectedSectors.size > 0 && !selectedSectors.has(site.sector)) {
      return false;
    }
    if (
      selectedStatuses.size > 0 &&
      !selectedStatuses.has(site.activityStatus)
    ) {
      return false;
    }
    if (
      selectedLocalizationTypes.size > 0 &&
      !selectedLocalizationTypes.has(site.localizationType)
    ) {
      return false;
    }

    return true;
  };

  const filteredSites = sites.filter(matchesFilters);
  const filteredUnmappedSites = unmappedSites.filter(matchesFilters);
  const filteredCount = filteredSites.length + filteredUnmappedSites.length;
  const hasActiveFilters =
    selectedCommunes.size > 0 ||
    selectedSectors.size > 0 ||
    selectedStatuses.size > 0 ||
    selectedLocalizationTypes.size > 0;

  const clearFilters = () => {
    setSelectedCommunes(new Set());
    setSelectedSectors(new Set());
    setSelectedStatuses(new Set());
    setSelectedLocalizationTypes(new Set());
  };

  useEffect(() => {
    const siteId = searchParams.get("site");
    if (!siteId) return;

    const site = allSites.find((candidate) => candidate.id === siteId);
    if (site) setSelectedSite(site);
  }, [searchParams, allSites]);

  const handleSelectSite = useCallback(
    (site: PollutionSiteBase | null) => {
      setSelectedSite(site);

      if (site) {
        router.replace("/carte?site=" + encodeURIComponent(site.id), {
          scroll: false,
        });
      } else {
        router.replace("/carte", { scroll: false });
      }
    },
    [router],
  );

  useEffect(() => {
    if (!selectedSite) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleSelectSite(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedSite, handleSelectSite]);

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

          <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
            <MapComponent
              sites={filteredSites}
              onSelectSite={handleSelectSite}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mt-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="text-gray-500 text-sm">
                {filteredCount} source{filteredCount !== 1 ? "s" : ""} de
                pollution affichée{filteredCount !== 1 ? "s" : ""}, dont{" "}
                {filteredSites.length} sur la carte
                {hasActiveFilters
                  ? " (sur " + allSites.length + " au total)"
                  : ""}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Effacer les filtres
                </button>
              )}
            </div>

            <div className="space-y-5">
              <FilterGroup
                title="Commune"
                options={communeOptions}
                selectedValues={selectedCommunes}
                onToggle={(value) =>
                  toggleSetValue(setSelectedCommunes, value)
                }
              />
              <FilterGroup
                title="Secteur d’activité"
                options={sectorOptions}
                selectedValues={selectedSectors}
                onToggle={(value) => toggleSetValue(setSelectedSectors, value)}
              />
              <FilterGroup
                title="Activité actuelle ou passée"
                options={statusOptions}
                selectedValues={selectedStatuses}
                onToggle={(value) =>
                  toggleSetValue(setSelectedStatuses, value)
                }
              />
              <FilterGroup
                title="Source localisée ou diffuse"
                options={localizationOptions}
                selectedValues={selectedLocalizationTypes}
                onToggle={(value) =>
                  toggleSetValue(setSelectedLocalizationTypes, value)
                }
              />
            </div>
          </div>

          {filteredUnmappedSites.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-blue-iec mb-4">
                Pollution Diffuse
              </h2>
              <p className="text-gray-600 mb-6">
                Sources de pollution sans localisation géographique précise.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUnmappedSites.map((site) => (
                  <button
                    type="button"
                    key={"unmapped-" + site.id}
                    className="text-left bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectSite(site)}
                  >
                    <span
                      className="block w-full h-2 rounded-full mb-3"
                      style={{ backgroundColor: getSectorColor(site.sector) }}
                    />
                    <span className="block font-semibold text-gray-900 mb-1">
                      {site.name}
                    </span>
                    <span className="block text-sm text-gray-500 mb-2">
                      {site.sector}
                    </span>
                    {site.commune && (
                      <span className="block text-sm text-gray-600">
                        {site.commune}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedSite && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
          onClick={() => handleSelectSite(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pollution-source-title"
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="p-4 border-b flex justify-between items-start"
              style={{ backgroundColor: getSectorColor(selectedSite.sector) }}
            >
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">
                  {selectedSite.id}
                </p>
                <h3
                  id="pollution-source-title"
                  className="text-xl font-bold text-white"
                >
                  {selectedSite.name}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fermer la fiche"
                onClick={() => handleSelectSite(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedSite.commune && (
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                      Commune
                    </h4>
                    <p className="text-gray-900">{selectedSite.commune}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Secteur d’activité
                  </h4>
                  <p className="text-gray-900">{selectedSite.sector}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Activité actuelle / passée
                  </h4>
                  <p className="text-gray-900">
                    {selectedSite.activityPeriod || selectedSite.activityStatus}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Localisation de la source
                  </h4>
                  <p className="text-gray-900">
                    {selectedSite.localizationDetail ||
                      selectedSite.localizationType}
                  </p>
                </div>
              </div>

              {selectedSite.activity && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Activité
                  </h4>
                  <p className="text-gray-900 whitespace-pre-line">
                    {selectedSite.activity}
                  </p>
                </div>
              )}

              {selectedSite.emissionTiming && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Temporalité de l’émission
                  </h4>
                  <p className="text-gray-900">
                    {selectedSite.emissionTiming}
                  </p>
                </div>
              )}

              {selectedSite.knowledgeLevel && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Niveau de connaissance
                  </h4>
                  <p className="text-gray-900">
                    {selectedSite.knowledgeLevel}
                  </p>
                </div>
              )}

              {selectedSite.pollutions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
                    {selectedSite.pollutions.length > 1
                      ? "Émissions et polluants potentiels (" +
                        selectedSite.pollutions.length +
                        ")"
                      : "Émission et polluant potentiel"}
                  </h4>
                  <div className="space-y-3">
                    {selectedSite.pollutions.map((pollution, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg p-3 border-l-4"
                        style={{
                          borderLeftColor: getCompartmentColor(
                            pollution.environmentalCompartment,
                          ),
                        }}
                      >
                        {pollution.process && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Processus d’émission
                            </span>
                            <p className="text-gray-900 text-sm whitespace-pre-line">
                              {pollution.process}
                            </p>
                          </div>
                        )}
                        {pollution.chemicalFamilies && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Familles chimiques
                            </span>
                            <p className="text-gray-900 text-sm whitespace-pre-line">
                              {pollution.chemicalFamilies}
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
                        {pollution.environmentalCompartment && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Compartiment ou nuisance
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.environmentalCompartment}
                            </p>
                          </div>
                        )}
                        {pollution.transferPathway && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase">
                              Voie de transfert
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.transferPathway}
                            </p>
                          </div>
                        )}
                        {pollution.receivingEnvironments && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Milieux récepteurs
                            </span>
                            <p className="text-gray-900 text-sm">
                              {pollution.receivingEnvironments}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSite.risk && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    Risque associé
                  </h4>
                  <p className="text-gray-900 whitespace-pre-line">
                    {selectedSite.risk}
                  </p>
                </div>
              )}

              {selectedSite.link && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">
                    Lien ou référence
                  </h4>
                  {isWebLink(selectedSite.link) ? (
                    <a
                      href={selectedSite.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-iec hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      Plus d’informations
                    </a>
                  ) : (
                    <p className="text-gray-900">{selectedSite.link}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
