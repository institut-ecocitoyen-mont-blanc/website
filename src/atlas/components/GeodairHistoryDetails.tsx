"use client";

import { useEffect, useMemo, useState } from "react";
import HistoryCards from "./HistoryCards";
import { airHistory } from "../lib/history-series";
import { DetailSection } from "./AtlasDetailDialog";
import { loadPublishedData } from "../lib/published-data";
import { airDate } from "../lib/atmo-stations";
import { airReadingStatus, GEODAIR_POLLUTANTS, GEODAIR_SOURCE, type GeodairHistory, type GeodairHistoricalReading } from "../lib/geodair";
import styles from "./AtlasDetails.module.css";

function Values({ rows, annual = false }: { rows: GeodairHistoricalReading[]; annual?: boolean }) {
  return <div className="overflow-x-auto mt-4"><table className="w-full text-xs text-left">
    <thead><tr><th className="p-2">{annual ? "Année" : "Prélèvement"}</th><th className="p-2">Polluant</th><th className="p-2">Valeur publiée</th><th className="p-2">Statut fournisseur</th></tr></thead>
    <tbody>{[...rows].reverse().map(r => <tr key={`${r.pollutant}-${r.time}`} className="border-t">
      <td className="p-2 whitespace-nowrap">{annual ? new Date(r.time).getUTCFullYear() : <>{airDate(r.time)}<br />→ {airDate(r.end!)}</>}</td>
      <td className="p-2">{GEODAIR_POLLUTANTS.find(p => p.id === r.pollutant)?.label}</td>
      <td className="p-2 tabular-nums">{r.value === null ? "Absente / invalide" : `${r.value.toLocaleString("fr-FR")} ${r.unit}`}{r.coverage !== null && <div className="text-slate-500">Couverture : {r.coverage} %</div>}</td>
      <td className="p-2">{airReadingStatus(r, true)}</td>
    </tr>)}</tbody>
  </table></div>;
}

// Loaded once for Passy: the cards and the detailed tables are rendered in different parts of the dialog.
export function useGeodairHistory(enabled: boolean) {
  const [data, setData] = useState<GeodairHistory>();
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadPublishedData<GeodairHistory>("geodair-history", controller.signal).then(value => {
      if (!controller.signal.aborted) { setData(value); setError(false); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [enabled, revision]);
  const series = useMemo(() => !data ? [] : GEODAIR_POLLUTANTS.flatMap(p => [
    ...airHistory(data.annual.filter(r => r.pollutant === p.id), { code: p.id, name: p.label, context: "Moyennes annuelles · Geod’air", cadence: "annual", national: true }),
    ...airHistory(data.samples.filter(r => r.pollutant === p.id), { code: p.id, name: p.label, context: "Prélèvements différés · Geod’air", national: true }),
  ]), [data]);
  return { data, error, series, retry: () => setRevision(r => r + 1) };
}
type GeodairHistoryState = ReturnType<typeof useGeodairHistory>;

const Unavailable = ({ history }: { history: GeodairHistoryState }) => history.error
  ? <p role="status">Historique indisponible. <button className="underline text-blue-iec" onClick={history.retry}>Réessayer</button></p>
  : <p role="status">Chargement de l’historique…</p>;

export function GeodairHistoryCards({ history }: { history: GeodairHistoryState }) {
  return history.data ? <HistoryCards series={history.series} title="Évolution à long terme · Geod’air" description="Moyennes annuelles et prélèvements différés : ces résultats ne décrivent pas la qualité de l’air actuelle et ne colorent pas le pin." /> : <div className={styles.visual}><Unavailable history={history} /></div>;
}

export default function GeodairHistoryDetails({ history }: { history: GeodairHistoryState }) {
  const { data } = history;
  return <DetailSection title="Historique Geod’air" description="Moyennes annuelles et prélèvements différés : ces résultats ne décrivent pas la qualité de l’air actuelle et ne colorent pas le pin.">
    {!data ? <Unavailable history={history} /> : <div className="space-y-4">
      {data.annual.length > 0 && <details className={styles.card}><summary className="cursor-pointer font-semibold text-blue-iec">Moyennes annuelles · {new Date(data.annual[0].time).getUTCFullYear()}–{new Date(data.annual.at(-1)!.time).getUTCFullYear()}</summary><Values rows={data.annual} annual /></details>}
      {data.samples.length > 0 && <details className={styles.card}><summary className="cursor-pointer font-semibold text-blue-iec">Benzo[a]pyrène · {data.samples.length} prélèvements</summary><p className="mt-3 text-sm">Dernier prélèvement disponible : {airDate(data.samples.at(-1)!.time)}. Résultats en ng/m³, distincts des concentrations horaires en µg/m³.</p><Values rows={data.samples} /></details>}
      <p className="text-xs text-slate-500">Import : {airDate(Date.parse(data.fetchedAt))}. Valeurs publiées arrondies ; les valeurs brutes sont conservées dans l’export. Résultats susceptibles de révision.</p>
    </div>}
    <a className={styles.source} href={GEODAIR_SOURCE} target="_blank" rel="noreferrer">Atmo Auvergne-Rhône-Alpes · Geod’air / LCSQA-Ineris · Licence Ouverte</a>
  </DetailSection>;
}
