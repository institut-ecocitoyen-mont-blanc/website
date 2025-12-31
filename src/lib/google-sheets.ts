// Fetch and parse pollution site data from Google Sheets

const SPREADSHEET_ID = "18z15WmDqTfmiZggT-zCTraNS5ze-6nqgN3EgfgnCG4s";

interface GoogleSheetsCell {
  v?: string | number | null;
  f?: string;
}

interface GoogleSheetsRow {
  c: (GoogleSheetsCell | null)[];
}

interface GoogleSheetsResponse {
  table: {
    cols: { label: string }[];
    rows: GoogleSheetsRow[];
  };
}

export interface PollutionEntry {
  environmentalCompartment: string;
  chemicalForm: string;
  chemicalFamilies: string;
  frequency: string;
  healthImpact: string;
}

export interface PollutionSiteBase {
  id: number;
  name: string;
  location: string;
  sector: string;
  pollutionType: string;
  pollutions: PollutionEntry[];
  accidents: string;
  link: string;
}

export interface PollutionSite extends PollutionSiteBase {
  coordinates: { lat: number; lng: number };
}

export interface DiffusePollutionSite extends PollutionSiteBase {
  coordinates: null;
}

function getCellValue(row: GoogleSheetsRow, index: number): string {
  const cell = row.c[index];
  if (!cell) return "";
  // Use formatted value (f) if available, otherwise use raw value (v)
  return (cell.f || cell.v?.toString() || "").trim();
}

function getCellNumber(row: GoogleSheetsRow, index: number): number | null {
  const cell = row.c[index];
  if (!cell || cell.v === null || cell.v === undefined) return null;
  const num = typeof cell.v === "number" ? cell.v : parseFloat(cell.v.toString());
  return isNaN(num) ? null : num;
}

export interface PollutionSitesResult {
  sites: PollutionSite[];
  diffuseSites: DiffusePollutionSite[];
}

export async function fetchPollutionSites(): Promise<PollutionSite[]> {
  const result = await fetchAllPollutionSites();
  return result.sites;
}

export async function fetchAllPollutionSites(): Promise<PollutionSitesResult> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;

  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${response.status}`);
  }

  const text = await response.text();

  // Google Visualization API wraps JSON in a function call, we need to extract it
  // Format: google.visualization.Query.setResponse({...})
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Google Sheets response");
  }

  const data: GoogleSheetsResponse = JSON.parse(jsonMatch[1]);
  const rows = data.table.rows;

  const sites: PollutionSite[] = [];
  const diffuseSites: DiffusePollutionSite[] = [];
  const seenSites = new Map<string, PollutionSite>();
  const seenDiffuseSites = new Map<string, DiffusePollutionSite>();

  // Track current site for sub-entries (rows without ID)
  let currentSiteKey: string | null = null;
  let currentSiteHasCoordinates = false;

  // Track previous row values for fields that should carry over when empty
  let prevCompartment = "";
  let prevChemicalForm = "";
  let prevChemicalFamilies = "";

  // Column mapping based on current spreadsheet structure:
  // 0: N° (ID)
  // 1: Identification (name)
  // 2: Secteur d'activité (detailed description)
  // 3: Secteur d'activité (category for legend/colors)
  // 4: Pollution actuelle/passée
  // 5: Localisation du site émetteur
  // 6: Latitude
  // 7: Longitude
  // 8: Compartiment environnemental de rejet
  // 9: Forme physico-chimique
  // 10: Famille(s) chimique(s) de polluant(s)
  // 11: Ponctuelle/continue
  // 12: Impact sanitaire ou environnemental
  // 13: ACCIDENTS RECENSÉS
  // 14: Lien du site ou référence

  for (const row of rows) {
    if (!row.c || row.c.length === 0) continue;

    const idValue = row.c[0]?.v;
    const isMainEntry = typeof idValue === "number" && !isNaN(idValue);

    // Extract pollution entry data (common to both main and sub-entries)
    // Use previous row value if current cell is empty
    const rawCompartment = getCellValue(row, 8);
    const rawChemicalForm = getCellValue(row, 9);
    const rawChemicalFamilies = getCellValue(row, 10);

    const environmentalCompartment = rawCompartment || prevCompartment;
    const chemicalForm = rawChemicalForm || prevChemicalForm;
    const chemicalFamilies = rawChemicalFamilies || prevChemicalFamilies;

    // Update previous values for next iteration
    if (rawCompartment) prevCompartment = rawCompartment;
    if (rawChemicalForm) prevChemicalForm = rawChemicalForm;
    if (rawChemicalFamilies) prevChemicalFamilies = rawChemicalFamilies;

    const frequency = getCellValue(row, 11);
    const healthImpact = getCellValue(row, 12);

    const pollutionEntry: PollutionEntry = {
      environmentalCompartment,
      chemicalForm,
      chemicalFamilies,
      frequency,
      healthImpact,
    };

    // Check if this pollution entry has any meaningful data
    const hasPollutionData =
      environmentalCompartment || chemicalForm || chemicalFamilies || frequency || healthImpact;

    if (isMainEntry) {
      // This is a main site entry
      const id = idValue;
      const name = getCellValue(row, 1);
      const sector = getCellValue(row, 3); // Column D - sector category for colors
      const pollutionType = getCellValue(row, 4);
      const location = getCellValue(row, 5);
      const latitude = getCellNumber(row, 6);
      const longitude = getCellNumber(row, 7);
      const accidents = getCellValue(row, 13);
      const link = getCellValue(row, 14);

      const siteKey = `${id}-${name}`;
      currentSiteKey = siteKey;

      const hasValidCoordinates =
        latitude !== null &&
        longitude !== null &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;

      currentSiteHasCoordinates = hasValidCoordinates;

      if (hasValidCoordinates) {
        if (!seenSites.has(siteKey)) {
          const site: PollutionSite = {
            id,
            name: name || "Site inconnu",
            location: location || "",
            sector: sector || "Non spécifié",
            pollutionType: pollutionType || "",
            pollutions: hasPollutionData ? [pollutionEntry] : [],
            accidents: accidents || "",
            link: link || "",
            coordinates: { lat: latitude!, lng: longitude! },
          };

          seenSites.set(siteKey, site);
          sites.push(site);
        }
      } else {
        if (!seenDiffuseSites.has(siteKey)) {
          const diffuseSite: DiffusePollutionSite = {
            id,
            name: name || "Site inconnu",
            location: location || "",
            sector: sector || "Non spécifié",
            pollutionType: pollutionType || "",
            pollutions: hasPollutionData ? [pollutionEntry] : [],
            accidents: accidents || "",
            link: link || "",
            coordinates: null,
          };

          seenDiffuseSites.set(siteKey, diffuseSite);
          diffuseSites.push(diffuseSite);
        }
      }
    } else if (currentSiteKey && hasPollutionData) {
      // This is a sub-entry for the current site - add pollution data
      if (currentSiteHasCoordinates) {
        const existing = seenSites.get(currentSiteKey);
        if (existing) {
          existing.pollutions.push(pollutionEntry);
        }
      } else {
        const existing = seenDiffuseSites.get(currentSiteKey);
        if (existing) {
          existing.pollutions.push(pollutionEntry);
        }
      }
    }
  }

  return { sites, diffuseSites };
}

// Sector color mapping for markers (based on column D categories)
export const sectorColors: Record<string, string> = {
  "Gestion des déchets et effluents": "#8B4513", // Brown - waste
  "Carrière et extraction": "#708090", // Slate gray - quarries
  "Service secteur routier": "#FF6B35", // Orange - road services/gas stations
  "Traffic routier (tunnel, autoroute..)": "#2F4F4F", // Dark slate - road traffic
  "Secteur du décolletage": "#4169E1", // Royal blue - metal turning
  "Industrie": "#9932CC", // Dark orchid - industry
  "Production de chaleur": "#DC143C", // Crimson - heat production
  "Production d'énergie électrique": "#FFD700", // Gold - electricity
  "Non spécifié": "#999999", // Gray - unspecified
};

// Ordered list for legend display
export const sectorList = [
  { name: "Gestion des déchets et effluents", color: "#8B4513" },
  { name: "Carrière et extraction", color: "#708090" },
  { name: "Service secteur routier", color: "#FF6B35" },
  { name: "Traffic routier (tunnel, autoroute..)", color: "#2F4F4F" },
  { name: "Secteur du décolletage", color: "#4169E1" },
  { name: "Industrie", color: "#9932CC" },
  { name: "Production de chaleur", color: "#DC143C" },
  { name: "Production d'énergie électrique", color: "#FFD700" },
];

export function getSectorColor(sector: string): string {
  // Try exact match first
  if (sectorColors[sector]) {
    return sectorColors[sector];
  }

  // Try partial match
  const sectorLower = sector.toLowerCase();
  for (const [key, color] of Object.entries(sectorColors)) {
    if (sectorLower.includes(key.toLowerCase()) || key.toLowerCase().includes(sectorLower)) {
      return color;
    }
  }

  return "#1d6ab2"; // Default blue
}

// Environmental compartment color mapping
export const compartmentColors: Record<string, string> = {
  "Air": "#87CEEB", // Sky blue
  "Eau": "#1E90FF", // Dodger blue
  "Sol": "#8B4513", // Saddle brown
  "Sous-sol": "#654321", // Dark brown
  "Nappe phréatique": "#4169E1", // Royal blue
};

// Ordered list for compartment filter display
export const compartmentList = [
  { name: "Air", color: "#87CEEB" },
  { name: "Eau", color: "#1E90FF" },
  { name: "Sol", color: "#8B4513" },
  { name: "Sous-sol", color: "#654321" },
  { name: "Nappe phréatique", color: "#4169E1" },
];

export function getCompartmentColor(compartment: string): string {
  // Try exact match first
  if (compartmentColors[compartment]) {
    return compartmentColors[compartment];
  }

  // Try partial match
  const compartmentLower = compartment.toLowerCase();
  for (const [key, color] of Object.entries(compartmentColors)) {
    if (compartmentLower.includes(key.toLowerCase()) || key.toLowerCase().includes(compartmentLower)) {
      return color;
    }
  }

  return "#999999"; // Default gray
}
