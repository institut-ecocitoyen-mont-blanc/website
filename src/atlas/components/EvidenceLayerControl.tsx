import type { ReactNode } from "react";
import AtlasLayerControl from "./AtlasLayerControl";
import { createPinIcon } from "@/components/map/pin-icon";

export default function EvidenceLayerControl({ title, source, enabled, onEnabled, opacityControl, children }: {
  title: string; source: string; enabled: boolean; onEnabled: (value: boolean) => void; children: ReactNode;
  opacityControl?: { value: number; onChange: (value: number) => void };
}) {
  return <AtlasLayerControl title={title} source={source} enabled={enabled} onEnabled={onEnabled}>
    <div className="space-y-3 text-xs text-slate-600">
      {opacityControl && <label className="flex items-center gap-2">Opacité<input aria-label={`Opacité · ${title}`} className="min-w-0 flex-1 accent-blue-iec" type="range" min="0.15" max="1" step="0.05" value={opacityControl.value} onChange={(event) => opacityControl.onChange(Number(event.target.value))} /><span>{Math.round(opacityControl.value * 100)} %</span></label>}
      {children}
    </div>
  </AtlasLayerControl>;
}
let icon: ReturnType<typeof createPinIcon> | undefined;
const soilIcons = new Map<string, ReturnType<typeof createPinIcon>>();
export function georisquesPin(kind: "sis" | "instruction" | "installation") {
  if (!soilIcons.has(kind)) {
    const color = kind === "sis" ? "#7c3aed" : kind === "installation" ? "#247184" : "#925323";
    soilIcons.set(kind, createPinIcon({ className: "georisques-pin", fill: color,
      glyph: kind === "installation" ? '<path d="M3 21V10l6 3V7l6 3V3h4l2 18ZM7 17h1m4 0h1m4 0h1"/>' : '<path d="m15 3 6 6-3 3-6-6ZM14 10 5 19M3 15l6 6-5 1-2-2Z"/>' }));
  }
  return soilIcons.get(kind)!;
}
export function groundwaterPin() {
  return icon ??= createPinIcon({ className: "groundwater-pin", fill: "white", stroke: "#0e7490",
    glyph: '<path d="M12 2C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-13ZM2 22h20M8 17q4 3 8 0"/>' });
}
