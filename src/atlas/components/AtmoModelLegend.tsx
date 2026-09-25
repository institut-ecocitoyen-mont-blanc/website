import { ATMO_MODELS, ATMO_MODEL_SCALES, ATMO_MODEL_REFERENCES, atmoLegendGradient, type AtmoModelId } from "@/atlas/lib/atmo-model";

export default function AtmoModelLegend({ pollutant }: { pollutant: AtmoModelId }) {
  const model = ATMO_MODELS.find(({ id }) => id === pollutant)!;
  const { ticks, stops, unit } = ATMO_MODEL_SCALES[pollutant];
  const max = stops.at(-1)!.value;
  const reference = ATMO_MODEL_REFERENCES[pollutant];
  const labels = reference.who === undefined ? ticks : [0, reference.who, reference.limit, max];
  return <figure aria-label={`Échelle ${model.label}`} className="m-0 rounded-lg border border-slate-200 bg-white p-3">
    <figcaption className="mb-3 flex items-baseline justify-between gap-2">
      <span className="font-semibold text-slate-800">{model.label}</span>
      <span className="text-slate-500">{unit}</span>
    </figcaption>
    <div role="img" aria-label={`Échelle continue Atmo de 0 à ${max} ${unit}`} className="h-3 rounded-full ring-1 ring-inset ring-black/5" style={{ background: atmoLegendGradient(pollutant) }} />
    <div className="relative mt-1.5 h-7 text-[11px] tabular-nums text-slate-600">
      {labels.map((value) => <span key={value} className={`absolute rounded px-1.5 py-0.5 ${value === reference.limit ? "bg-red-700 font-bold text-white" : value === reference.who ? "bg-green-700 font-bold text-white" : ""}`} style={{ left: `${value / max * 100}%`, transform: value === 0 ? undefined : value === max ? "translateX(-100%)" : "translateX(-50%)" }}>{value}</span>)}
    </div>
    <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-600">
      <p><span className="mr-1.5 inline-block rounded bg-red-700 px-1.5 py-0.5 font-bold tabular-nums text-white">{reference.limit} {unit}</span>{reference.label}</p>
      {pollutant === "o3" && <p className="text-slate-500">Moyenne sur 2023–2025.</p>}
      {reference.who !== undefined && <p><span className="mr-1.5 inline-block rounded bg-green-700 px-1.5 py-0.5 font-bold tabular-nums text-white">{reference.who} {unit}</span>Repère OMS</p>}
    </div>
    <p className="mt-2 text-[10px] text-slate-500">Repères de la légende Atmo 2025</p>
    <p className="mt-1 text-[10px] text-slate-500">Échelle de couleurs Atmo · valeurs avant opacité</p>
  </figure>;
}
