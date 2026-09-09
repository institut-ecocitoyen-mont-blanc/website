"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "react-leaflet";
import Marker from "@/components/AtlasMarker";
import { environmentalPin, QualitySummary } from "@/components/EnvironmentalPin";
import { airQuality, unknownQuality, DEMO_PIN_PREVIEW, demoAirPinLevel } from "@/lib/environmental-quality";
import { DetailFacts, DetailSection } from "@/components/AtlasDetailDialog";
import styles from "./AtlasDetails.module.css";
import { AREA } from "@/lib/environmental-layers";
import { AIR_POLLUTANTS, combineAirStations, loadAirStations, latestAirValue, airChartSegments, airDate, airIsStale, airQueryUrl, dailyAirQueryUrl, type AirPollutant, type AirStation } from "@/lib/atmo-stations";

type Dataset = { status: "loading" | "ready" | "error"; stations: AirStation[]; error?: string };
type AirState = Record<AirPollutant, Dataset>;
const initialState = (): AirState => ({ pm25: { status: "loading", stations: [] }, pm10: { status: "loading", stations: [] }, no2: { status: "loading", stations: [] }, o3: { status: "loading", stations: [] } });

function useAirClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}

export function useAtmoStations(enabled: boolean, revision: number) {
  const [state, setState] = useState<AirState>(initialState);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState(initialState());
    for (const pollutant of AIR_POLLUTANTS) {
      loadAirStations(pollutant.id, AREA, controller.signal).then((stations) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, [pollutant.id]: { status: "ready", stations } }));
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, [pollutant.id]: { status: "error", stations: [], error: error instanceof Error && error.name === "TimeoutError" ? "Atmo met trop de temps à répondre." : "Impossible de charger ce polluant. Réessayez." } }));
      });
    }
    return () => controller.abort();
  }, [enabled, revision]);
  return state;
}

export function AtmoControls({ state, onRetry }: { state: AirState; onRetry: () => void }) {
  const groups = combineAirStations(state);
  const newest = Math.max(...Object.values(state).flatMap((data) => data.stations.flatMap((station) => station.readings.map((reading) => reading.time))));
  return <div className="space-y-3 text-xs">
    <p>Tous les polluants disponibles sont affichés ensemble.</p>
    <p>Sallanches Régie et Passy Chedde : moyennes journalières lorsque les mesures horaires ne sont pas disponibles.</p>
    <ul aria-label="Polluants affichés" aria-live="polite" className="space-y-1.5">
      {AIR_POLLUTANTS.map(({ id, label }) => <li key={id} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2"><span className="font-semibold">{label}</span><span className="text-slate-500">{state[id].status === "loading" ? "chargement…" : state[id].status === "error" ? "indisponible" : `${state[id].stations.length} station(s)`}</span></div>
        {state[id].status === "error" && <p className="mt-1 text-red-700">{state[id].error}</p>}
      </li>)}
    </ul>
    <p>{groups.length} station(s) · un pin par station, tous ses polluants dans la fiche.</p>
    {Object.values(state).some((data) => data.status === "error") && <button onClick={onRetry} className="underline text-blue-iec">Réessayer les mesures Atmo</button>}
    {Number.isFinite(newest) && <p className="text-slate-600">Dernier créneau du flux : {airDate(newest)} (heure de Paris).</p>}
    {Number.isFinite(newest) && airIsStale(newest) && <p className="rounded bg-amber-50 p-2 font-semibold text-amber-900">Flux historique : aucune donnée récente (moins de 48 h). Ne décrit pas la qualité de l’air actuelle.</p>}
    <p className="text-slate-500">{DEMO_PIN_PREVIEW ? "Icône vent · cliquez sur une station pour consulter les concentrations, leurs dates et l’historique." : "Icône vent · couleur selon le niveau le plus défavorable au même créneau, sur les polluants disponibles. Bleu si le créneau a plus de 6 h ou si la couverture est insuffisante. Repère indicatif, pas l’indice Atmo communal."}</p>
    <a className="text-blue-iec underline" href="https://airindex.eea.europa.eu/AQI/?webgl=0" target="_blank" rel="noreferrer">Méthode : bandes horaires européennes</a>
  </div>;
}

function HistoryChart({ station, label }: { station: AirStation; label: string }) {
  const values = station.readings.filter((reading) => reading.value !== null);
  if (!values.length) return <p>Aucune valeur numérique pour tracer l’historique.</p>;
  const first = station.readings[0].time, last = station.readings.at(-1)!.time;
  const min = Math.min(0, ...values.map((r) => r.value!)), max = Math.max(1, ...values.map((r) => r.value!));
  const x = (time: number) => 38 + (time - first) / (last - first || 1) * 254;
  const y = (value: number) => 114 - (value - min) / (max - min) * 98;
  return <figure className="m-0">
    <figcaption className="font-semibold">Historique disponible · {values[0].unit}</figcaption>
    <svg viewBox="0 0 306 144" role="img" aria-label={`Historique ${label} à ${station.name}. Moyennes ${station.period === "daily" ? "journalières" : "horaires"} ; tableau des valeurs ci-dessous.`} className="w-full mt-3">
      {[min, (min + max) / 2, max].map((value) => <g key={value}><line x1="38" x2="292" y1={y(value)} y2={y(value)} stroke="#e2e8f0" /><text x="32" y={y(value) + 3} textAnchor="end" fontSize="10" fill="#64748b">{value.toFixed(1)}</text></g>)}
      {airChartSegments(station.readings, station.period).map((segment, index) => <g key={index}>
        <polyline points={segment.map((r) => `${x(r.time)},${y(r.value!)}`).join(" ")} fill="none" stroke="var(--color-blue-iec, #1d6ab2)" strokeWidth="2" />
        {segment.map((r) => <circle key={r.time} cx={x(r.time)} cy={y(r.value!)} r="2" fill="var(--color-blue-iec, #1d6ab2)"><title>{airDate(r.time)} · {r.value} {r.unit} · validation : {r.validation ?? "non renseignée"}</title></circle>)}
      </g>)}
      <text x="38" y="137" fontSize="9" fill="#64748b">{airDate(first)}</text><text x="292" y="137" textAnchor="end" fontSize="9" fill="#64748b">{airDate(last)}</text>
    </svg>
    <p className="text-xs text-slate-500">Les interruptions correspondent aux créneaux manquants. Codes de validation conservés tels que publiés, sans interprétation.</p>
  </figure>;
}

function StationDetails({ station, pollutant }: { station: AirStation; pollutant: AirPollutant }) {
  const latest = latestAirValue(station), slot = station.readings.at(-1)!;
  const label = AIR_POLLUTANTS.find((p) => p.id === pollutant)!.label;
  return <article className={`${styles.card} space-y-4 text-sm`}>
    <h4 className="font-semibold text-xl text-blue-iec">{label}</h4>
    {latest ? <div className="rounded-lg bg-blue-50 p-4">
      <p className="text-xs text-slate-600 mb-2">Dernière valeur numérique disponible</p>
      <strong className="text-3xl text-blue-iec tabular-nums">{latest.value!.toLocaleString("fr-FR")} <span className="text-sm font-normal">{latest.unit}</span></strong>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">Moyenne {station.period === "daily" ? "journalière" : "horaire"} · {airDate(latest.time)}{latest.end ? ` → ${airDate(latest.end)}` : ""} (Paris)<br />Validation : {latest.validation === null ? "non renseignée" : `code fournisseur « ${latest.validation} »`}</p>
    </div> : <p>Aucune valeur numérique disponible.</p>}
    {slot.value === null && <p className="text-amber-900">Dernier créneau ({airDate(slot.time)}) : mesure absente, pas une valeur nulle.</p>}
    {airIsStale(latest?.time ?? slot.time) && <p className="font-semibold text-amber-900">Données historiques — pas une mesure actuelle.</p>}
    <HistoryChart station={station} label={label} />
    <details><summary className="cursor-pointer text-blue-iec underline underline-offset-4">Valeurs et statuts de validation ({station.readings.length})</summary>
      <div className="overflow-x-auto mt-3"><table className="w-full text-xs"><thead><tr><th className="text-left">Début (Paris)</th><th>Valeur</th><th>Validation*</th></tr></thead><tbody>{[...station.readings].reverse().map((r) => <tr className="border-t" key={r.time}><td className="py-2">{airDate(r.time)}</td><td>{r.value === null ? "Absente" : `${r.value.toLocaleString("fr-FR")} ${r.unit}`}</td><td>{r.validation ?? "Non renseignée"}</td></tr>)}</tbody></table></div>
    </details>
    <p className="text-xs text-slate-500">* Champ source « {station.period === "daily" ? "validite" : "statut_valid"} ». Les codes ne sont pas assimilés à une validation définitive. Une concentration ne permet pas à elle seule d’identifier la source d’émission.</p>
    <a className={styles.source} href={station.period === "daily" && (pollutant === "pm10" || pollutant === "pm25") ? dailyAirQueryUrl(pollutant, [station.id]) : airQueryUrl(pollutant, { west: station.lng - 0.00001, east: station.lng + 0.00001, south: station.lat - 0.00001, north: station.lat + 0.00001 })} target="_blank" rel="noreferrer">Données sources · Atmo</a>
  </article>;
}

export function AtmoMarkers({ state, opacity, onSelect }: { state: AirState; opacity: number; onSelect: (id: string) => void }) {
  const now = useAirClock();
  return combineAirStations(state).map(({ station, measurements }) => {
    const hourly = measurements.filter(({ station }) => station.period !== "daily");
    const quality = hourly.length ? airQuality(hourly, now, Object.values(state).every((data) => data.status === "ready")) : unknownQuality(measurements.length ? "Moyennes journalières : les bandes horaires ne sont pas applicables." : "Mesures en chargement ou indisponibles.");
    const pinLevel = DEMO_PIN_PREVIEW ? demoAirPinLevel(hourly, station.id) : quality.level;
    return <Marker key={station.id} position={[station.lat, station.lng]} icon={environmentalPin("air", pinLevel)} opacity={opacity} zIndexOffset={1000} title={`Station Atmo · ${station.name}`} attribution="Atmo Auvergne-Rhône-Alpes · mesures aux stations" onSelect={() => onSelect(station.id)}>
    <Tooltip>{station.name} · {quality.label}<br />{measurements.map(({ pollutant }) => AIR_POLLUTANTS.find((p) => p.id === pollutant)!.label).join(" · ")}</Tooltip>
  </Marker>;
  });
}

export function AtmoDetails({ state, stationId }: { state: AirState; stationId: string }) {
  const now = useAirClock();
  const group = combineAirStations(state).find(({ station }) => station.id === stationId);
  if (!group) return <p role="status">Les mesures de cette station ne sont plus disponibles. Actualisez la couche pour réessayer.</p>;
  const { station, measurements } = group;
  const hourly = measurements.filter(({ station }) => station.period !== "daily");
  const quality = hourly.length ? airQuality(hourly, now, Object.values(state).every((data) => data.status === "ready")) : unknownQuality(measurements.length ? "Moyennes journalières : les bandes horaires ne sont pas applicables." : "Mesures en chargement ou indisponibles.");
  return <>
    <DetailFacts items={[
      { label: "Station", value: station.id }, { label: "Implantation", value: [station.typology, station.influence].filter(Boolean).join(" · ") },
      { label: "Coordonnées publiées", value: `${station.lat.toFixed(5)}, ${station.lng.toFixed(5)}` },
    ]} />
    <QualitySummary quality={quality} />
    <DetailSection title="Les polluants mesurés" description="Toutes les mesures disponibles à cette station, avec leur historique. La période de moyenne et les dates sont précisées pour chaque polluant.">
      <div className={styles.cards}>{measurements.map(({ pollutant, station: data }) => <StationDetails key={pollutant} station={data} pollutant={pollutant} />)}</div>
      {!measurements.length && <p className={styles.notice}>Station aux coordonnées publiées par Atmo. Aucune mesure chargée pour le moment ; sa présence sur la carte ne signifie pas qu’un flux en temps réel est disponible.</p>}
      {Object.values(state).some((data) => data.status === "loading" || data.status === "error") && <p className={`${styles.notice} mt-5`}>Certains flux sont encore en chargement ou indisponibles. Leur absence n’indique pas une absence de pollution.</p>}
    </DetailSection>
    <DetailSection title="À propos de ces données"><p className={styles.notice}>Source : Atmo Auvergne-Rhône-Alpes. Mesures horaires ou journalières aux coordonnées des stations, pas des indices communaux. Les codes de validation sont reproduits tels que publiés. Une concentration ne permet pas à elle seule d’identifier la source d’émission.</p></DetailSection>
  </>;
}
