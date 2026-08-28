"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ChevronDown,
  Clock3,
  ExternalLink,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
  lastUpdated: string | null;
  dataError: boolean;
}

interface InventoryData {
  sites: PollutionSite[];
  unmappedSites: UnmappedPollutionSite[];
  lastUpdated: string | null;
  fromLocalCache: boolean;
}

const INVENTORY_CACHE_KEY = "iec-pollution-inventory-v2";

interface FilterOption {
  value: string;
  color?: string;
}

interface MultiSelectFilterGroupProps {
  title: string;
  options: FilterOption[];
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
}

function MultiSelectFilterGroup({
  title,
  options,
  selectedValues,
  onToggle,
}: MultiSelectFilterGroupProps) {
  if (options.length === 0) return null;

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-800 mb-2">
        {title}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {options.map(({ value, color }) => {
          const isSelected = selectedValues.has(value);

          return (
            <label
              key={value}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(value)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-iec"
              />
              {color && (
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: color }}
                />
              )}
              <span>{value}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatLastUpdated(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
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
  lastUpdated,
  dataError,
}: CarteClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState<PollutionSiteBase | null>(
    null,
  );
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuPanelRef = useRef<HTMLDivElement>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [inventory, setInventory] = useState<InventoryData>({
    sites,
    unmappedSites,
    lastUpdated,
    fromLocalCache: false,
  });

  useEffect(() => {
    if (!filterMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !filterMenuRef.current?.contains(event.target) &&
        !filterMenuPanelRef.current?.contains(event.target)
      ) {
        setFilterMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterMenuOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    if (!filterMenuOpen) {
      setFilterMenuPosition(null);
      return;
    }

    const updateFilterMenuPosition = () => {
      const anchor = filterMenuRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const viewportPadding = 16;
      const gap = 8;
      const width = Math.min(
        704,
        anchor.width,
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.max(
        viewportPadding,
        Math.min(
          anchor.right - width,
          window.innerWidth - width - viewportPadding,
        ),
      );
      const top = anchor.bottom + gap;

      setFilterMenuPosition({
        top,
        left,
        width,
        maxHeight: Math.max(160, window.innerHeight - top - viewportPadding),
      });
    };

    updateFilterMenuPosition();
    window.addEventListener("resize", updateFilterMenuPosition);
    window.addEventListener("scroll", updateFilterMenuPosition, true);
    window.visualViewport?.addEventListener(
      "resize",
      updateFilterMenuPosition,
    );
    window.visualViewport?.addEventListener(
      "scroll",
      updateFilterMenuPosition,
    );

    return () => {
      window.removeEventListener("resize", updateFilterMenuPosition);
      window.removeEventListener("scroll", updateFilterMenuPosition, true);
      window.visualViewport?.removeEventListener(
        "resize",
        updateFilterMenuPosition,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        updateFilterMenuPosition,
      );
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    const hasServerData = sites.length > 0 || unmappedSites.length > 0;

    if (hasServerData || !dataError) {
      const currentInventory: InventoryData = {
        sites,
        unmappedSites,
        lastUpdated,
        fromLocalCache: false,
      };
      setInventory(currentInventory);

      if (hasServerData) {
        try {
          window.localStorage.setItem(
            INVENTORY_CACHE_KEY,
            JSON.stringify(currentInventory),
          );
        } catch {
          // The live inventory remains usable if browser storage is unavailable.
        }
      }
      return;
    }

    try {
      const cachedValue = window.localStorage.getItem(INVENTORY_CACHE_KEY);
      if (!cachedValue) return;

      const cachedInventory = JSON.parse(cachedValue) as InventoryData;
      if (
        !Array.isArray(cachedInventory.sites) ||
        !Array.isArray(cachedInventory.unmappedSites)
      ) {
        return;
      }

      setInventory({ ...cachedInventory, fromLocalCache: true });
    } catch {
      // A corrupt or unavailable cache should not prevent the page from loading.
    }
  }, [sites, unmappedSites, lastUpdated, dataError]);

  const selectedCommunes = useMemo(
    () => new Set(searchParams.getAll("commune")),
    [searchParams],
  );
  const selectedSectors = useMemo(
    () => new Set(searchParams.getAll("sector")),
    [searchParams],
  );
  const selectedStatuses = useMemo(
    () => new Set(searchParams.getAll("status")),
    [searchParams],
  );
  const selectedLocalizationTypes = useMemo(
    () => new Set(searchParams.getAll("localization")),
    [searchParams],
  );
  const selectedCompartments = useMemo(
    () => new Set(searchParams.getAll("compartment")),
    [searchParams],
  );

  const allSites = useMemo<PollutionSiteBase[]>(
    () => [...inventory.sites, ...inventory.unmappedSites],
    [inventory.sites, inventory.unmappedSites],
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
  const compartmentOptions = useMemo(() => {
    const values = new Set<string>();

    allSites.forEach((site) => {
      site.pollutions.forEach((pollution) => {
        if (pollution.environmentalCompartment) {
          values.add(pollution.environmentalCompartment);
        }
      });
    });

    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
      .map((value) => ({
        value,
        color: getCompartmentColor(value),
      }));
  }, [allSites]);

  const replaceSearchParams = useCallback(
    (params: URLSearchParams) => {
      const queryString = params.toString();
      router.replace(queryString ? "/carte?" + queryString : "/carte", {
        scroll: false,
      });
    },
    [router],
  );

  const getCurrentSearchParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    } else {
      params.delete("q");
    }

    return params;
  }, [searchParams, searchQuery]);

  const toggleFilterValue = useCallback(
    (key: string, value: string) => {
      const params = getCurrentSearchParams();
      const values = new Set(params.getAll(key));

      if (values.has(value)) {
        values.delete(value);
      } else {
        values.add(value);
      }

      params.delete(key);
      Array.from(values)
        .sort((a, b) => a.localeCompare(b, "fr"))
        .forEach((selectedValue) => params.append(key, selectedValue));
      replaceSearchParams(params);
    },
    [getCurrentSearchParams, replaceSearchParams],
  );

  useEffect(() => {
    const urlQuery = searchParams.get("q") ?? "";
    if (urlQuery !== searchQuery) setSearchQuery(urlQuery);
    // searchParams changing through browser navigation is the only trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const urlQuery = searchParams.get("q") ?? "";
    const normalizedQuery = searchQuery.trim();
    if (urlQuery === normalizedQuery) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (normalizedQuery) {
        params.set("q", normalizedQuery);
      } else {
        params.delete("q");
      }
      replaceSearchParams(params);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, searchParams, replaceSearchParams]);

  const normalizedQuery = normalizeSearchText(searchQuery);

  const matchesFilters = useCallback(
    (site: PollutionSiteBase) => {
      if (normalizedQuery) {
        const pollutionText = site.pollutions
          .flatMap((pollution) => [
            pollution.process,
            pollution.chemicalFamilies,
            pollution.chemicalForm,
            pollution.environmentalCompartment,
            pollution.transferPathway,
            pollution.receivingEnvironments,
          ])
          .join(" ");
        const searchableText = normalizeSearchText(
          [
            site.id,
            site.name,
            site.commune,
            site.activity,
            site.sector,
            site.activityPeriod,
            site.emissionTiming,
            site.localizationType,
            site.knowledgeLevel,
            site.risk,
            pollutionText,
          ].join(" "),
        );

        if (!searchableText.includes(normalizedQuery)) return false;
      }
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
      if (
        selectedCompartments.size > 0 &&
        !site.pollutions.some((pollution) =>
          selectedCompartments.has(pollution.environmentalCompartment),
        )
      ) {
        return false;
      }

      return true;
    },
    [
      normalizedQuery,
      selectedCommunes,
      selectedSectors,
      selectedStatuses,
      selectedLocalizationTypes,
      selectedCompartments,
    ],
  );

  const filteredSites = useMemo(
    () => inventory.sites.filter(matchesFilters),
    [inventory.sites, matchesFilters],
  );
  const filteredUnmappedSites = useMemo(
    () => inventory.unmappedSites.filter(matchesFilters),
    [inventory.unmappedSites, matchesFilters],
  );
  const filteredCount = filteredSites.length + filteredUnmappedSites.length;
  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    selectedCommunes.size > 0 ||
    selectedSectors.size > 0 ||
    selectedStatuses.size > 0 ||
    selectedLocalizationTypes.size > 0 ||
    selectedCompartments.size > 0;

  const selectedFilterCount =
    selectedCommunes.size +
    selectedSectors.size +
    selectedStatuses.size +
    selectedLocalizationTypes.size +
    selectedCompartments.size;
  const formattedLastUpdated = formatLastUpdated(inventory.lastUpdated);

  const clearSelectedFilters = () => {
    const params = getCurrentSearchParams();
    ["commune", "sector", "status", "localization", "compartment"].forEach(
      (key) => params.delete(key),
    );
    replaceSearchParams(params);
  };

  useEffect(() => {
    const siteId = searchParams.get("site");
    if (!siteId) {
      setSelectedSite(null);
      return;
    }

    const site = allSites.find((candidate) => candidate.id === siteId);
    if (site) setSelectedSite(site);
  }, [searchParams, allSites]);

  const handleSelectSite = useCallback(
    (site: PollutionSiteBase | null) => {
      setFilterMenuOpen(false);
      setSelectedSite(site);
      const params = getCurrentSearchParams();

      if (site) {
        params.set("site", site.id);
      } else {
        params.delete("site");
      }

      replaceSearchParams(params);
    },
    [getCurrentSearchParams, replaceSearchParams],
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

          {dataError && (
            <div
              role="alert"
              className={
                "border rounded-lg p-4 mb-6 flex items-start gap-3 " +
                (inventory.fromLocalCache
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-red-50 border-red-200 text-red-900")
              }
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Le fichier d’inventaire est temporairement indisponible.
                </p>
                <p className="text-sm mt-1">
                  {inventory.fromLocalCache
                    ? "La dernière version enregistrée sur cet appareil reste affichée."
                    : "Aucune version enregistrée n’est disponible sur cet appareil. Veuillez réessayer plus tard."}
                </p>
              </div>
            </div>
          )}

          <div
            ref={filterMenuRef}
            className="relative z-10 w-full mb-6"
          >
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
              <div className="relative w-full min-w-0">
                <label htmlFor="inventory-search" className="sr-only">
                  Rechercher dans l’inventaire
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="inventory-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher une source, une activité, une commune…"
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-iec focus:ring-2 focus:ring-blue-iec/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Effacer la recherche"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-label={
                  selectedFilterCount > 0
                    ? "Filtres (" +
                      selectedFilterCount +
                      " sélectionné" +
                      (selectedFilterCount > 1 ? "s" : "") +
                      ")"
                    : "Filtres"
                }
                aria-expanded={filterMenuOpen}
                aria-controls="map-filter-menu"
                onClick={() => setFilterMenuOpen((open) => !open)}
                className="h-12 shrink-0 rounded-lg border border-gray-300 bg-white px-3 sm:px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filtres</span>
                {selectedFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-iec text-white text-xs min-w-5 h-5 px-1">
                    {selectedFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={
                    "w-4 h-4 transition-transform " +
                    (filterMenuOpen ? "rotate-180" : "")
                  }
                />
              </button>
            </div>

            {filterMenuOpen &&
              filterMenuPosition &&
              createPortal(
                <div
                  ref={filterMenuPanelRef}
                  id="map-filter-menu"
                  style={{
                    position: "fixed",
                    top: filterMenuPosition.top,
                    left: filterMenuPosition.left,
                    width: filterMenuPosition.width,
                    maxHeight: filterMenuPosition.maxHeight,
                  }}
                  className="z-[3000] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xl"
                >
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        Filtrer la carte
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Plusieurs choix sont possibles dans chaque catégorie.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Fermer les filtres"
                      onClick={() => setFilterMenuOpen(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MultiSelectFilterGroup
                    title="Commune"
                    options={communeOptions}
                    selectedValues={selectedCommunes}
                    onToggle={(value) =>
                      toggleFilterValue("commune", value)
                    }
                  />
                  <div className="space-y-6">
                    <MultiSelectFilterGroup
                      title="Activité actuelle ou passée"
                      options={statusOptions}
                      selectedValues={selectedStatuses}
                      onToggle={(value) =>
                        toggleFilterValue("status", value)
                      }
                    />
                    <MultiSelectFilterGroup
                      title="Source localisée ou diffuse"
                      options={localizationOptions}
                      selectedValues={selectedLocalizationTypes}
                      onToggle={(value) =>
                        toggleFilterValue("localization", value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2 pt-5 border-t">
                    <MultiSelectFilterGroup
                      title="Secteur d’activité"
                      options={sectorOptions}
                      selectedValues={selectedSectors}
                      onToggle={(value) =>
                        toggleFilterValue("sector", value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2 pt-5 border-t">
                    <MultiSelectFilterGroup
                      title="Compartiments"
                      options={compartmentOptions}
                      selectedValues={selectedCompartments}
                      onToggle={(value) =>
                        toggleFilterValue("compartment", value)
                      }
                    />
                  </div>
                </div>

                {selectedFilterCount > 0 && (
                  <div className="mt-5 pt-4 border-t flex justify-end">
                    <button
                      type="button"
                      onClick={clearSelectedFilters}
                      className="text-sm font-medium text-blue-iec hover:underline"
                    >
                      Effacer tous les filtres
                    </button>
                  </div>
                )}
                </div>,
                document.body,
              )}
          </div>

          <div className="relative z-0 bg-white rounded-lg shadow-lg overflow-hidden">
            <MapComponent
              sites={filteredSites}
              onSelectSite={handleSelectSite}
            />
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

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              {filteredCount} source{filteredCount !== 1 ? "s" : ""} de
              pollution affichée{filteredCount !== 1 ? "s" : ""}, dont{" "}
              {filteredSites.length} sur la carte
              {hasActiveFilters
                ? " (sur " + allSites.length + " au total)"
                : ""}
            </p>
            {formattedLastUpdated && (
              <p className="text-gray-500 text-xs mt-1 flex items-center justify-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5" />
                Dernière mise à jour : {formattedLastUpdated}
                {inventory.fromLocalCache && " (version enregistrée)"}
              </p>
            )}
          </div>
        </div>
      </section>

      {selectedSite && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[4000] p-4"
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
