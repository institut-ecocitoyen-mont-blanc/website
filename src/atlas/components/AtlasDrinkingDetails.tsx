"use client";

import { useState } from "react";
import type { LayerPoint } from "@/atlas/lib/environmental-layers";
import type { DrinkingSummary } from "@/atlas/lib/drinking-networks";
import AtlasWaterDetails from "./AtlasWaterDetails";
import styles from "./AtlasDetails.module.css";
import { DetailHeadline, DetailLimits } from "./DetailCard";

export default function AtlasDrinkingDetails({ point, summary }: { point: LayerPoint; summary?: DrinkingSummary }) {
  const [selectedId, setSelectedId] = useState<string>();
  if (!summary) return <p role="status" className={styles.notice}>Chargement des réseaux de distribution…</p>;
  const selected = summary.networks.find((n) => n.id === selectedId) ?? summary.networks.find((n) => n.quality.level === "poor") ?? summary.networks.find((n) => n.quality.level === "moderate") ?? summary.networks[0];
  const controls = <>
    <div className={styles.chips} aria-label={`Réseaux de distribution · catalogue ${summary.year ?? "non daté"}`}>{summary.networks.map(network => <button key={network.id} type="button" aria-pressed={network.id === selected?.id} onClick={() => setSelectedId(network.id)} className={styles.chip} style={network.quality.level === "good" ? { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" } : undefined}>{network.name} · {network.quality.label}</button>)}</div>
  </>;
  const context = <p>Catalogue des dessertes : {summary.year ?? "année non renseignée"}. Bilan communal : {summary.quality.label}. {summary.quality.detail}</p>;
  return selected ? <AtlasWaterDetails key={selected.id} kind="drinking" point={point} network={selected} quality={selected.quality} sample={selected.sample} networkControls={controls} networkContext={context} /> : <><DetailHeadline title={summary.quality.label} subtitle="Aucun réseau avec des données disponibles" /><DetailLimits>{context}</DetailLimits></>;
}
