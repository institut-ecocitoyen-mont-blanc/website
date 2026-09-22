"use client";

import { useState } from "react";
import type { LayerPoint } from "@/atlas/lib/environmental-layers";
import type { DrinkingSummary } from "@/atlas/lib/drinking-networks";
import { QualitySummary } from "./EnvironmentalPin";
import { DetailSection } from "./AtlasDetailDialog";
import AtlasWaterDetails from "./AtlasWaterDetails";
import styles from "./AtlasDetails.module.css";

export default function AtlasDrinkingDetails({ point, summary }: { point: LayerPoint; summary?: DrinkingSummary }) {
  const [selectedId, setSelectedId] = useState<string>();
  if (!summary) return <p role="status" className={styles.notice}>Chargement des réseaux de distribution…</p>;
  const selected = summary.networks.find((n) => n.id === selectedId) ?? summary.networks.find((n) => n.quality.level === "poor") ?? summary.networks.find((n) => n.quality.level === "moderate") ?? summary.networks[0];
  return <>
    <QualitySummary quality={summary.quality} />
    <DetailSection title="Réseaux de distribution" description={`Repère communal, pas un lieu de prélèvement. ${summary.year ? `Catalogue des dessertes publié pour ${summary.year}.` : ""} Sélectionnez votre réseau pour consulter ses résultats.`}>
      <div className="grid gap-3 sm:grid-cols-2">{summary.networks.map((network) => <button key={network.id} type="button" aria-pressed={network.id === selected?.id} onClick={() => setSelectedId(network.id)} className={`rounded-xl border-2 p-3 text-left ${network.id === selected?.id ? "border-blue-iec bg-blue-50" : "border-slate-200"}`}>
        <p className="font-semibold text-sm mb-1">{network.name}</p><p className="text-xs text-slate-500 mb-2">Réseau {network.id}</p>
        <QualitySummary quality={network.quality} />
      </button>)}</div>
    </DetailSection>
    {selected && <DetailSection title={`Résultats · ${selected.name}`}>
      <AtlasWaterDetails key={selected.id} kind="drinking" point={point} network={selected} quality={selected.quality} sample={selected.sample} />
    </DetailSection>}
  </>;
}
