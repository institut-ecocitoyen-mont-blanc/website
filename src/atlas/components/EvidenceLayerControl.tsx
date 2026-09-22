import type { ReactNode } from "react";
import { divIcon } from "leaflet";

export default function EvidenceLayerControl({ title, source, enabled, onEnabled, opacity, onOpacity, children }: {
  title: string; source: string; enabled: boolean; onEnabled: (value: boolean) => void; opacity: number; onOpacity: (value: number) => void; children: ReactNode;
}) {
  return <section className={`rounded-xl border p-3 ${enabled ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
    <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} /><span><span className="block font-semibold text-sm text-slate-900">{title}</span><span className="block text-xs text-slate-500 mt-1">{source}</span></span></label>
    {enabled && <div className="mt-3 space-y-3 text-xs text-slate-600">
      <label className="flex items-center gap-2">Opacité<input aria-label={`Opacité · ${title}`} className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacity} onChange={(event) => onOpacity(Number(event.target.value))} /><span>{Math.round(opacity * 100)} %</span></label>
      {children}
    </div>}
  </section>;
}
let icon: ReturnType<typeof divIcon> | undefined;
export function groundwaterPin() {
  return icon ??= divIcon({ className: "groundwater-pin", iconSize: [36, 46], iconAnchor: [18, 44],
    html: '<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44C14 37 2 27 2 18a16 16 0 1 1 32 0c0 9-12 19-16 26Z" fill="white" stroke="#0e7490" stroke-width="2"/><g transform="translate(7 6) scale(.92)" fill="none" stroke="#0e7490" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-13ZM2 22h20M8 17q4 3 8 0"/></g></svg>' });
}
