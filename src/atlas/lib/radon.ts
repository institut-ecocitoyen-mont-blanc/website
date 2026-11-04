import { CCPMB_COMMUNES } from "./ccpmb-territory.ts";

export const RADON_SOURCE = "https://www.georisques.gouv.fr/consulter-les-dossiers-thematiques/radon";
export const RADON_LICENSE = "https://www.georisques.gouv.fr/mentions-legales";
export type RadonCategory = 1 | 2 | 3;
export interface RadonCommune { code: string; name: string; category: RadonCategory | null }
export interface RadonData { communes: RadonCommune[]; fetchedAt: string }
export const RADON_CATEGORIES = [
  { category: 1, color: "#fef0b5", label: "Potentiel faible", description: "Les formations géologiques présentent généralement de faibles teneurs en uranium." },
  { category: 2, color: "#f9ad55", label: "Potentiel faible avec facteurs de transfert", description: "Des particularités géologiques, comme les failles ou les cavités, peuvent faciliter la remontée du radon malgré de faibles teneurs en uranium." },
  { category: 3, color: "#c65328", label: "Potentiel significatif", description: "Une partie au moins de la commune présente des formations plus riches en uranium, favorisant la présence de radon dans les bâtiments." },
] as const;
export function radonCategory(category: RadonCategory | null) {
  return RADON_CATEGORIES.find(band => band.category === category);
}
export function radonApiUrl() {
  return `https://www.georisques.gouv.fr/api/v1/radon?${new URLSearchParams({ code_insee: CCPMB_COMMUNES.map(({ code }) => code).join(","), page_size: "100" })}`;
}
export function radonCommuneUrl(code: string) {
  return `https://www.georisques.gouv.fr/api/v1/radon?${new URLSearchParams({ code_insee: code })}`;
}

// Keep the whole previous snapshot if the provider truncates or changes its response.
export function parseRadonResponse(value: unknown, fetchedAt: string): RadonData {
  const response = value as { response_code?: number; results?: number; page?: number; total_pages?: number; next?: unknown; data?: Record<string, unknown>[] } | null;
  if (!response || response.response_code !== 200 || !Array.isArray(response.data) || response.next || response.page !== 1 || response.total_pages !== 1 || response.results !== response.data.length || !Number.isFinite(Date.parse(fetchedAt))) {
    throw new Error("Réponse radon incomplète ou incompatible.");
  }
  const categories = new Map<string, RadonCategory | null>();
  for (const row of response.data) {
    if (!row || typeof row !== "object" || typeof row.code_insee !== "string" || !CCPMB_COMMUNES.some(({ code }) => code === row.code_insee) || categories.has(row.code_insee)) {
      throw new Error("Commune inattendue ou dupliquée dans les données radon.");
    }
    const raw = row.classe_potentiel;
    const category = raw === "1" || raw === 1 ? 1 : raw === "2" || raw === 2 ? 2 : raw === "3" || raw === 3 ? 3 : null;
    if (category === null && raw !== null && raw !== undefined && raw !== "") throw new Error("Catégorie radon inconnue.");
    categories.set(row.code_insee, category);
  }
  if (categories.size !== CCPMB_COMMUNES.length) throw new Error("La couverture radon des dix communes est incomplète.");
  // A renamed or blanked field must not replace the snapshot with ten unknown categories.
  if (!response.data.some(row => "classe_potentiel" in row) || ![...categories.values()].some(category => category !== null)) throw new Error("Catégories radon absentes de la réponse.");
  return { communes: CCPMB_COMMUNES.map(({ code, nom }) => ({ code, name: nom, category: categories.get(code) ?? null })), fetchedAt };
}
