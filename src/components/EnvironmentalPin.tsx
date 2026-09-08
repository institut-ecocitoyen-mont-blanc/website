"use client";

import { divIcon } from "leaflet";
import { QUALITY_COLORS, type Quality, type QualityLevel } from "@/lib/environmental-quality";

type PinKind = "air" | "rivers" | "drinking" | "bathing";
// Small, code-native line icons: wind, flowing water, and drinking glass.
const ICONS: Record<PinKind, string> = {
  air: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
  rivers: '<path d="M2 6q3-4 7 0t7 0q3-4 6 0M2 12q3-4 7 0t7 0q3-4 6 0M2 18q3-4 7 0t7 0q3-4 6 0"/>',
  drinking: '<path d="m5 3 2 18h10l2-18ZM6 10q3-3 6 0t6 0"/>',
  bathing: '<circle cx="17" cy="5" r="2"/><path d="m3 11 5-5 5 4-4 4M2 16q3-3 6 0t6 0q3-3 6 0M2 21q3-3 6 0t6 0q3-3 6 0"/>',
};
const icons = new Map<string, ReturnType<typeof divIcon>>();
export function environmentalPin(kind: PinKind, level: QualityLevel) {
  const key = `${kind}-${level}`;
  let icon = icons.get(key);
  if (!icon) {
    icon = divIcon({ className: kind === "air" ? "atmo-station-pin" : `${kind}-station-pin`,
      html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true" data-quality="${level}"><path d="M18 44C14 37 2 27 2 18a16 16 0 1 1 32 0c0 9-12 19-16 26Z" fill="${QUALITY_COLORS[level]}" stroke="white" stroke-width="2"/><g transform="translate(7 7) scale(.92)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</g></svg>`,
      iconSize: [36, 46], iconAnchor: [18, 44], popupAnchor: [0, -40] });
    icons.set(key, icon);
  }
  return icon;
}

export function QualitySummary({ quality }: { quality: Quality }) {
  return <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
    <p className="flex items-center gap-2 font-semibold"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: QUALITY_COLORS[quality.level] }} />{quality.label}</p>
    {quality.time !== undefined && <p>{new Date(quality.time).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris)</p>}
    <p>{quality.detail}</p>
  </div>;
}

export function QualityLegend() {
  return <div aria-label="Couleurs des mesures" className="mt-4 space-y-2 text-xs text-slate-600">
    <p className="font-semibold">Air et eau potable</p>
    <div className="flex flex-wrap gap-x-3 gap-y-1">{([["good", "Bon / conforme"], ["moderate", "Intermédiaire"], ["poor", "Mauvais / non conforme"], ["unknown", "Non déterminé"]] as const).map(([level, label]) => <span key={level} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: QUALITY_COLORS[level] }} />{label}</span>)}</div>
    <p>Bleu : données anciennes, absentes ou insuffisantes. Consultez la date et la portée du résultat dans la fiche. L’inventaire conserve ses couleurs par secteur.</p>
  </div>;
}
