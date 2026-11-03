import type { GroundwaterAnalysis } from "./groundwater";
import type { Row } from "./environmental-layers";
import type { BathingSample } from "./bathing-water";
import type { AirReading } from "./atmo-stations";

export type HistoryQualifier = "=" | "<" | "<=" | ">" | ">=" | "?";
export interface HistoryPoint {
  time: number;
  value: number | null;
  qualifier: HistoryQualifier;
  label: string;
  status: string;
  reference?: string;
}
export interface HistorySeries {
  id: string;
  name: string;
  unit: string;
  context: string;
  code: string;
  points: HistoryPoint[];
  cadence?: "hourly" | "daily" | "annual";
}
type Entry = Omit<HistorySeries, "points"> & { point: HistoryPoint; identity?: string };
const text = (value: unknown) => value == null ? "" : String(value);
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
export const historyNumber = (value: number) => value.toLocaleString("fr-FR", { maximumSignificantDigits: 8 });
export function parseHistoryValue(value: unknown): Pick<HistoryPoint, "value" | "qualifier" | "label"> {
  const label = text(value).trim();
  const match = label.replaceAll("−", "-").replaceAll("≤", "<=").replaceAll("≥", ">=").replace(",", ".")
    .match(/^([<>]=?)?\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i);
  return match && Number.isFinite(Number(match[2]))
    ? { value: Number(match[2]), qualifier: (match[1] || "=") as HistoryQualifier, label }
    : { value: null, qualifier: "?", label: label || "Non renseigné" };
}
function codedValue(value: unknown, code: unknown, remark: string) {
  const number = numeric(value), c = Number(code);
  const qualifier: HistoryQualifier = c === 1 ? "=" : [2, 7, 9, 10].includes(c) ? "<" : [3, 8].includes(c) ? ">" : "?";
  if (number === null || qualifier === "?") return { value: null, qualifier: "?" as const, label: remark || "Non représentable" };
  return { value: number, qualifier, label: `${qualifier === "=" ? "" : `${qualifier} `}${historyNumber(number)}` };
}
function group(entries: Entry[]): HistorySeries[] {
  const groups = new Map<string, HistorySeries>(), seen = new Set<string>();
  for (const { point, identity, ...series } of entries) {
    if (!Number.isFinite(point.time)) continue;
    // Deduplicate only identified, identical results repeated by a provider join.
    const key = identity && JSON.stringify([series.id, identity, point]);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    const existing = groups.get(series.id);
    if (existing) existing.points.push(point); else groups.set(series.id, { ...series, points: [point] });
  }
  return [...groups.values()].map(s => ({ ...s, points: s.points.sort((a, b) => a.time - b.time) }))
    .sort((a, b) => b.points.at(-1)!.time - a.points.at(-1)!.time || b.points.length - a.points.length || a.name.localeCompare(b.name, "fr"));
}
export function groundwaterHistory(rows: GroundwaterAnalysis[]): HistorySeries[] {
  return group(rows.map(r => ({
    id: JSON.stringify([r.parameter, r.unit, r.fraction]), code: r.parameter, name: r.name, unit: r.unit,
    context: r.fraction || "Fraction non renseignée",
    point: { time: Date.parse(r.date), ...codedValue(r.value, r.remarkCode, r.remark), status: [r.qualification, r.status, r.remark].filter(Boolean).join(" · "),
      ...(/incorrect|douteu/i.test(r.qualification) ? { value: null, qualifier: "?" as const } : {}) },
  })));
}
export function waterHistory(rows: Row[], kind: "rivers" | "drinking"): HistorySeries[] {
  return group(rows.map(r => {
    const drinking = kind === "drinking", unit = text(r.libelle_unite ?? r.symbole_unite), code = text(r.code_parametre);
    const context = drinking ? ["Eau distribuée", r.code_lieu_analyse === "L" ? "Laboratoire" : r.code_lieu_analyse === "T" ? "Terrain" : text(r.code_lieu_analyse)]
      : [text(r.libelle_support), text(r.libelle_fraction), text(r.libelle_insitu)];
    return {
      id: JSON.stringify([code || r.libelle_parametre, unit, r.code_fraction, r.libelle_fraction, r.code_support, r.code_lieu_analyse, r.code_insitu, context]),
      name: text(r.libelle_parametre) || code, code, unit, context: context.filter(Boolean).join(" · "),
      identity: text(drinking ? r.reference_analyse : r.code_analyse) || undefined,
      point: { time: Date.parse(text(r.date_prelevement)),
        ...(drinking ? parseHistoryValue(r.resultat_alphanumerique) : codedValue(r.resultat, r.code_remarque, text(r.mnemo_remarque))),
        status: drinking ? "Résultat publié · SISE-Eaux" : [r.libelle_qualification, r.mnemo_statut, r.mnemo_remarque].filter(Boolean).join(" · "),
        reference: [r.limite_qualite_parametre, r.reference_qualite_parametre].filter(Boolean).join(" · "),
        ...(!drinking && /incorrect|douteu/i.test(text(r.libelle_qualification)) ? { value: null, qualifier: "?" as const } : {}),
      },
    };
  }));
}
export function bathingHistory(samples: BathingSample[]): HistorySeries[] {
  return group(([['ecoli', 'Escherichia coli (E. coli)'], ['enterococci', 'Entérocoques intestinaux']] as const).flatMap(([code, name]) => samples.map(s => ({
    id: code, code, name, unit: "/100 mL", context: "Prélèvements de baignade",
    point: { time: Date.parse(s.date), ...parseHistoryValue(s[code]), status: `Appréciation du prélèvement : ${s.assessment}` },
  }))));
}
export function airHistory(readings: AirReading[], options: { code: string; name: string; context: string; cadence?: HistorySeries["cadence"]; national?: boolean }): HistorySeries[] {
  return group(readings.map(r => ({
    id: JSON.stringify([options.code, r.unit, options.context, options.cadence]), code: options.code, name: options.name, unit: r.unit,
    context: options.context, cadence: options.cadence,
    point: { time: r.time, value: options.national && r.validity !== 1 ? null : numeric(r.value), qualifier: r.value === null || (options.national && r.validity !== 1) ? "?" : "=",
      label: r.value === null || (options.national && r.validity !== 1) ? "Absente / invalide" : historyNumber(r.value),
      status: options.national ? `${r.valueType || "Type non renseigné"} · validité ${r.validity ?? "non renseignée"} · qualité ${r.qualityCode || "non renseignée"}` : `Code fournisseur : ${r.validation ?? "non renseigné"}`,
      reference: "coverage" in r && r.coverage != null ? `Couverture : ${r.coverage} %` : undefined,
    },
  })));
}
export function historySegments(series: HistorySeries, points = series.points): HistoryPoint[][] {
  const gap = series.cadence === "hourly" ? 1.5 * 3600000 : series.cadence === "daily" ? 1.5 * 86400000 : series.cadence === "annual" ? 370 * 86400000 : 2 * 366 * 86400000;
  const segments: HistoryPoint[][] = [];
  let current: HistoryPoint[] = [];
  for (const p of points) {
    if (p.qualifier !== "=" || p.value === null) { current = []; continue; }
    if (!current.length || p.time - current.at(-1)!.time > gap || p.time === current.at(-1)!.time) { current = []; segments.push(current); }
    current.push(p);
  }
  return segments;
}
export function historyMatches(series: HistorySeries, query: string) {
  const aliases: Record<string, string> = { "5980": "PFBA PFAS", "5979": "PFPeA PFAS", "8847": "PFAS" };
  return `${series.name} ${series.code} ${series.context} ${series.unit} ${aliases[series.code] || ""}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .includes(query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim());
}
