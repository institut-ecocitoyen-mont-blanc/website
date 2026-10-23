import type { GroundwaterAnalysis } from "./groundwater.ts";
import type { Row } from "./environmental-layers.ts";

export type ResultAssessment = "within" | "outside" | "unknown";
export interface WaterResultSummary {
  date: string | null;
  total: number;
  within: number;
  outside: number;
  unknown: number;
  incomplete: boolean;
}
type Interval = { min: number; max: number; minOpen: boolean; maxOpen: boolean };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const numeric = "([+-]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)(?:[eE][+-]?\\d+)?)";
const unit = (value: string) => value.normalize("NFKC").replace(/μ/g, "µ").replace(/\s/g, "");

function bound(operator: string, value: number): Interval {
  if (operator === "<" || operator === "<=") return { min: -Infinity, max: value, minOpen: true, maxOpen: operator === "<" };
  if (operator === ">" || operator === ">=") return { min: value, max: Infinity, minOpen: operator === ">", maxOpen: true };
  return { min: value, max: value, minOpen: false, maxOpen: false };
}
const normalized = (value: string) => value.replace(/≤/g, "<=").replace(/≥/g, ">=");
const number = (value: string) => Number(value.replace(",", "."));

// Only compare the reference attached to this drinking-water result, in exactly
// its published unit. No invented thresholds, unit conversion or cross-medium reuse.
function referenceInterval(value: string, publishedUnit: string): Interval | null {
  const parts = normalized(value).split(/\s+et\s+/i);
  if (!publishedUnit || parts.length > 2) return null;
  let interval: Interval = { min: -Infinity, max: Infinity, minOpen: true, maxOpen: true };
  for (const [index, part] of parts.entries()) {
    const match = part.trim().match(new RegExp(`^(<=|>=|<|>|=)\\s*${numeric}\\s*(.*?)$`));
    if (!match || !Number.isFinite(number(match[2]))) return null;
    // A shared trailing unit is allowed for a range, e.g. >=6,5 et <=9 unité pH.
    if ((!match[3] && index === parts.length - 1) || (match[3] && unit(match[3]) !== unit(publishedUnit))) return null;
    const next = bound(match[1], number(match[2]));
    interval = {
      min: Math.max(interval.min, next.min), max: Math.min(interval.max, next.max),
      minOpen: next.min > interval.min ? next.minOpen : next.min < interval.min ? interval.minOpen : next.minOpen || interval.minOpen,
      maxOpen: next.max < interval.max ? next.maxOpen : next.max > interval.max ? interval.maxOpen : next.maxOpen || interval.maxOpen,
    };
  }
  return interval.min > interval.max || (interval.min === interval.max && (interval.minOpen || interval.maxOpen)) ? null : interval;
}
function assessInterval(result: Interval, reference: Interval): ResultAssessment {
  const below = result.max < reference.min || result.max === reference.min && (result.maxOpen || reference.minOpen);
  const above = result.min > reference.max || result.min === reference.max && (result.minOpen || reference.maxOpen);
  if (below || above) return "outside";
  const withinMin = result.min > reference.min || result.min === reference.min && (!reference.minOpen || result.minOpen);
  const withinMax = result.max < reference.max || result.max === reference.max && (!reference.maxOpen || result.maxOpen);
  return withinMin && withinMax ? "within" : "unknown";
}
export function assessDrinkingResult(row: Row): ResultAssessment {
  // The numeric field can be zero for a censored result. Use its qualified text.
  const match = normalized(text(row.resultat_alphanumerique)).match(new RegExp(`^(<=|>=|<|>|=)?\\s*${numeric}$`));
  if (!match || !Number.isFinite(number(match[2]))) return "unknown";
  const refs = [row.limite_qualite_parametre, row.reference_qualite_parametre].map(text).filter(Boolean);
  if (!refs.length) return "unknown";
  const result = bound(match[1] || "=", number(match[2]));
  const statuses = refs.map(raw => {
    const reference = referenceInterval(raw, text(row.libelle_unite));
    return reference ? assessInterval(result, reference) : "unknown";
  });
  return statuses.includes("outside") ? "outside" : statuses.every(status => status === "within") ? "within" : "unknown";
}

export function latestWaterSample<T>(rows: readonly T[], dateOf: (row: T) => string, idOf: (row: T) => string = () => ""): { date: string | null; rows: T[] } {
  let newest: T | undefined, newestTime = -Infinity;
  for (const row of rows) {
    const time = Date.parse(dateOf(row));
    if (Number.isFinite(time) && (time > newestTime || time === newestTime && idOf(row) > (newest === undefined ? "" : idOf(newest)))) {
      newest = row; newestTime = time;
    }
  }
  if (newest === undefined) return { date: null, rows: [] };
  const id = idOf(newest);
  return { date: dateOf(newest), rows: rows.filter(row => Date.parse(dateOf(row)) === newestTime && idOf(row) === id) };
}
function summarize<T>(date: string | null, rows: readonly T[], assess: (row: T) => ResultAssessment, incomplete: boolean): WaterResultSummary {
  const result: WaterResultSummary = { date, total: rows.length, within: 0, outside: 0, unknown: 0, incomplete };
  for (const row of rows) result[assess(row)]++;
  return result;
}
export function groundwaterResultSummary(analyses: readonly GroundwaterAnalysis[], incomplete = false): WaterResultSummary {
  const sample = latestWaterSample(analyses, row => row.date);
  // ADES qualification and analytical detection limits are not quality references.
  return summarize(sample.date, sample.rows, () => "unknown", incomplete || analyses.length > 0 && !sample.date);
}
export function waterResultSummary(rows: readonly Row[], kind: "drinking" | "rivers"): WaterResultSummary {
  const sample = latestWaterSample(rows, row => text(row.date_prelevement), row => text(row.code_prelevement));
  // A distributed-water analysis can be repeated for each commune served.
  // Deduplicate only identified, identical analytical records; don't merge values.
  const seen = new Set<string>();
  const unique = sample.rows.filter(row => {
    const id = text(kind === "drinking" ? row.reference_analyse : row.code_analyse);
    if (!id) return true;
    const key = JSON.stringify([id, row.code_parametre, row.code_lieu_analyse, row.code_fraction, row.code_unite, row.resultat_alphanumerique ?? row.resultat, row.limite_qualite_parametre, row.reference_qualite_parametre, row.code_qualification]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return summarize(sample.date, unique, kind === "drinking" ? assessDrinkingResult : () => "unknown", rows.length > 0 && !sample.date);
}

export function waterSummaryTitle(summary: WaterResultSummary): string {
  const { total, within, outside, unknown, incomplete } = summary;
  if (!total) return incomplete ? "Prélèvement non identifiable" : "Aucune analyse disponible";
  if (incomplete) return "Synthèse partielle du dernier prélèvement";
  if (outside) return `${outside} résultat${outside > 1 ? "s" : ""} hors des repères`;
  if (!within) return "Résultats sans classement de qualité";
  return unknown ? `Aucun écart parmi les ${within} résultats évaluables` : "Aucun écart aux repères publiés";
}
