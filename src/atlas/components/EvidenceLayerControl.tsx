import type { ReactNode } from "react";
import { createPinIcon } from "@/components/map/pin-icon";

export default function EvidenceLayerControl({ title, source, enabled, onEnabled, opacityControl, children }: {
  title: string; source: string; enabled: boolean; onEnabled: (value: boolean) => void; children: ReactNode;
  opacityControl?: { value: number; onChange: (value: number) => void };
}) {
  return <section className={`rounded-xl border p-3 ${enabled ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
    <label className="flex gap-3 items-start cursor-pointer"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-iec" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} /><span><span className="block font-semibold text-sm text-slate-900">{title}</span><span className="block text-xs text-slate-500 mt-1">{source}</span></span></label>
    {enabled && <div className="mt-3 space-y-3 text-xs text-slate-600">
      {opacityControl && <label className="flex items-center gap-2">Opacité<input aria-label={`Opacité · ${title}`} className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacityControl.value} onChange={(event) => opacityControl.onChange(Number(event.target.value))} /><span>{Math.round(opacityControl.value * 100)} %</span></label>}
      {children}
    </div>}
  </section>;
}
let icon: ReturnType<typeof createPinIcon> | undefined;
const soilIcons = new Map<boolean, ReturnType<typeof createPinIcon>>();
export function georisquesPin(sis: boolean) {
  if (!soilIcons.has(sis)) {
    const color = sis ? "#7c3aed" : "#925323";
    soilIcons.set(sis, createPinIcon({ className: "georisques-pin", fill: color,
      glyph: '<path d="m15 3 6 6-3 3-6-6ZM14 10 5 19M3 15l6 6-5 1-2-2Z"/>' }));
  }
  return soilIcons.get(sis)!;
}
export function groundwaterPin() {
  return icon ??= createPinIcon({ className: "groundwater-pin", fill: "white", stroke: "#0e7490",
    glyph: '<path d="M12 2C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-13ZM2 22h20M8 17q4 3 8 0"/>' });
}
