"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "react-leaflet";
import Marker from "@/atlas/components/AtlasMarker";
import { atmoIndexPin } from "@/atlas/components/EnvironmentalPin";
import { ATMO_INDEX_CLASSES, ATMO_INDEX_SOURCE, stationAtmoIndex, indexDateLabel, type AtmoIndexData } from "@/atlas/lib/atmo-index";
import { DetailFacts, DetailSection } from "@/atlas/components/AtlasDetailDialog";
import styles from "./AtlasDetails.module.css";
import { loadPublishedData } from "@/atlas/lib/published-data";
import { airReadingStatus, GEODAIR_SOURCE, GEODAIR_STATION, GEODAIR_POLLUTANTS, withGeodairStation, type GeodairHourly, type GeodairPollutant } from "@/atlas/lib/geodair";
import GeodairHistoryDetails from "./GeodairHistoryDetails";
import { AIR_POLLUTANTS, combineAirStations, latestAirValue, airChartSegments, airDate, airIsStale, airQueryUrl, dailyAirQueryUrl, type AirPollutant, type AirStation } from "@/atlas/lib/atmo-stations";

type Dataset = { status: "loading" | "ready" | "error"; stations: AirStation[]; error?: string };
type AirState = Record<AirPollutant, Dataset> & { national?: GeodairHourly; nationalError?: string; indices?: AtmoIndexData; indexError?: string };
const datasets = (state: AirState) => AIR_POLLUTANTS.map(({ id }) => state[id]);
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
  const [national, setNational] = useState<GeodairHourly>();
  const [nationalError, setNationalError] = useState<string>();
  const [indices, setIndices] = useState<AtmoIndexData>();
  const [indexError, setIndexError] = useState<string>();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadPublishedData<AtmoIndexData>("atmo-index", controller.signal).then(data => {
      if (!controller.signal.aborted) { setIndices(data); setIndexError(undefined); }
    }).catch(() => {
      if (!controller.signal.aborted) setIndexError("Le flux des indices Atmo est indisponible. Seul un indice daté d’aujourd’hui peut colorer les pins.");
    });
    loadPublishedData<GeodairHourly>("geodair-hourly", controller.signal).then((data) => {
      if (!controller.signal.aborted) { setNational(data); setNationalError(undefined); }
    }).catch(() => {
      if (!controller.signal.aborted) setNationalError("Le flux Geod’air est indisponible. Les données déjà chargées ou le flux régional sont conservés, avec leurs dates.");
    });
    for (const pollutant of AIR_POLLUTANTS) {
      loadPublishedData<AirStation[]>(`air-${pollutant.id}`, controller.signal).then((stations) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, [pollutant.id]: { status: "ready", stations } }));
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, [pollutant.id]: { status: "error", stations: prev[pollutant.id].stations, error: error instanceof Error ? error.message : "Impossible de charger ce polluant. Réessayez." } }));
      });
    }
    return () => controller.abort();
  }, [enabled, revision]);
  const merged: AirState = { ...state, national, nationalError, indices, indexError };
  for (const { id } of AIR_POLLUTANTS) merged[id] = { ...state[id], stations: withGeodairStation(state[id].stations, id, national) };
  return merged;
}

export function AtmoControls({ state, onRetry }: { state: AirState; onRetry: () => void }) {
  const groups = combineAirStations(state);
  const newest = Math.max(...datasets(state).flatMap((data) => data.stations.flatMap((station) => station.readings.map((reading) => reading.time))));
  return <div className="space-y-3 text-xs">
    <p>Tous les polluants disponibles sont affichés ensemble.</p>
    <p>Passy : mesures horaires Geod’air, dont NO et NOₓ dans la fiche. Historique annuel et prélèvements de benzo[a]pyrène disponibles séparément.</p>
    {state.nationalError && <p className="text-amber-900">{state.nationalError}</p>}
    <p>Sallanches Régie et Passy Chedde : moyennes journalières lorsque les mesures horaires ne sont pas disponibles.</p>
    <ul aria-label="Polluants affichés" aria-live="polite" className="space-y-1.5">
      {AIR_POLLUTANTS.map(({ id, label }) => <li key={id} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2"><span className="font-semibold">{label}</span><span className="text-slate-500">{state[id].stations.length ? `${state[id].stations.length} station(s)` : state[id].status === "loading" ? "chargement…" : "indisponible"}</span></div>
        {state[id].status === "error" && <p className="mt-1 text-red-700">{state[id].error}</p>}
      </li>)}
    </ul>
    <p>{groups.length} station(s) · un pin par station, tous ses polluants dans la fiche.</p>
    {state.indexError && <p className="text-amber-900">{state.indexError}</p>}
    {(state.nationalError || state.indexError || datasets(state).some((data) => data.status === "error")) && <button onClick={onRetry} className="underline text-blue-iec">Réessayer les données Atmo</button>}
    {Number.isFinite(newest) && <p className="text-slate-600">Dernier créneau du flux : {airDate(newest)} (heure de Paris).</p>}
    {Number.isFinite(newest) && airIsStale(newest) && <p className="rounded bg-amber-50 p-2 font-semibold text-amber-900">Flux historique : aucune donnée récente (moins de 48 h). Ne décrit pas la qualité de l’air actuelle.</p>}
    <p className="text-slate-500">Icône vent · couleur de l’indice Atmo du jour pour la commune, pas une mesure à la station. Gris si l’indice du jour est indisponible. Les concentrations mesurées restent consultables dans la fiche.</p>
    <ul aria-label="Légende de l’indice Atmo" className="grid grid-cols-2 gap-2">{ATMO_INDEX_CLASSES.map(c => <li key={c.code} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full border border-slate-400" style={{ background: c.color }} />{c.label}</li>)}</ul>
    <a className="text-blue-iec underline" href={ATMO_INDEX_SOURCE} target="_blank" rel="noreferrer">Indice communal officiel · Atmo Auvergne-Rhône-Alpes</a>
    <p className="text-slate-500">Source ATMO Auvergne - Rhône-Alpes : Indice communal de la qualité de l’air sur la région Auvergne - Rhône-Alpes · ODbL 1.0.</p>
    <p className="text-slate-500">Flux régional : Source ATMO Auvergne - Rhône-Alpes, Mesure de la pollution atmosphérique sur la région Auvergne - Rhône-Alpes. <a className="underline" href="https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data/" target="_blank" rel="noreferrer">Extrait local normalisé</a> disponible sous <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a>.</p>
    <p className="text-slate-500">Le flux national de Passy est publié séparément : Atmo Auvergne-Rhône-Alpes · Geod’air / LCSQA-Ineris, Licence Ouverte.</p>
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
        {segment.map((r) => <circle key={r.time} cx={x(r.time)} cy={y(r.value!)} r="2" fill="var(--color-blue-iec, #1d6ab2)"><title>{airDate(r.time)} · {r.value} {r.unit} · {airReadingStatus(r, station.source === "geodair")}</title></circle>)}
      </g>)}
      <text x="38" y="137" fontSize="9" fill="#64748b">{airDate(first)}</text><text x="292" y="137" textAnchor="end" fontSize="9" fill="#64748b">{airDate(last)}</text>
    </svg>
    <p className="text-xs text-slate-500">Les interruptions correspondent aux créneaux manquants. Codes de validation conservés tels que publiés, sans interprétation.</p>
  </figure>;
}

function StationDetails({ station, pollutant }: { station: AirStation; pollutant: Exclude<GeodairPollutant, "bap"> }) {
  const latest = latestAirValue(station), slot = station.readings.at(-1)!;
  const label = GEODAIR_POLLUTANTS.find((p) => p.id === pollutant)!.label;
  const national = station.source === "geodair";
  const sourceUrl = national || pollutant === "no" || pollutant === "nox" ? GEODAIR_SOURCE : station.period === "daily" && (pollutant === "pm10" || pollutant === "pm25") ? dailyAirQueryUrl(pollutant, [station.id]) : airQueryUrl(pollutant, { west: station.lng - 0.00001, east: station.lng + 0.00001, south: station.lat - 0.00001, north: station.lat + 0.00001 });
  return <article className={`${styles.card} space-y-4 text-sm`}>
    <h4 className="font-semibold text-xl text-blue-iec">{label}</h4>
    {latest ? <div className="rounded-lg bg-blue-50 p-4">
      <p className="text-xs text-slate-600 mb-2">Dernière valeur numérique disponible</p>
      <strong className="text-3xl text-blue-iec tabular-nums">{latest.value!.toLocaleString("fr-FR")} <span className="text-sm font-normal">{latest.unit}</span></strong>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">Moyenne {station.period === "daily" ? "journalière" : "horaire"} · {airDate(latest.time)}{latest.end ? ` → ${airDate(latest.end)}` : ""} (Paris)<br />{airReadingStatus(latest, national)}</p>
    </div> : <p>Aucune valeur numérique disponible.</p>}
    {slot.value === null && <p className="text-amber-900">Dernier créneau ({airDate(slot.time)}) : mesure absente ou invalide, pas une valeur nulle.</p>}
    {airIsStale(latest?.time ?? slot.time) && <p className="font-semibold text-amber-900">Données historiques — pas une mesure actuelle.</p>}
    <HistoryChart station={station} label={label} />
    <details><summary className="cursor-pointer text-blue-iec underline underline-offset-4">Valeurs et statuts de validation ({station.readings.length})</summary>
      <div className="overflow-x-auto mt-3"><table className="w-full text-xs"><thead><tr><th className="text-left">Début (Paris)</th><th>Valeur</th><th>Validation*</th></tr></thead><tbody>{[...station.readings].reverse().map((r) => <tr className="border-t" key={r.time}><td className="py-2">{airDate(r.time)}</td><td>{r.value === null ? "Absente / invalide" : `${r.value.toLocaleString("fr-FR")} ${r.unit}`}</td><td>{airReadingStatus(r, national)}</td></tr>)}</tbody></table></div>
    </details>
    <p className="text-xs text-slate-500">{national ? "* Type de valeur, validité et code qualité Geod’air conservés séparément. Les valeurs invalides ne sont pas tracées. Une moyenne brute peut encore être révisée ; le code qualité seul n’indique pas une validation définitive." : `* Champ source « ${station.period === "daily" ? "validite" : "statut_valid"} ». Les codes ne sont pas assimilés à une validation définitive.`}</p>
    <a className={styles.source} href={sourceUrl} target="_blank" rel="noreferrer">Données sources · {national ? "Geod’air / Atmo" : "Atmo régional"}</a>
  </article>;
}

export function AtmoMarkers({ state, opacity, onSelect }: { state: AirState; opacity: number; onSelect: (id: string) => void }) {
  const now = useAirClock();
  return combineAirStations(state).map(({ station, measurements }) => {
    const index = stationAtmoIndex(station, state.indices, now);
    return <Marker key={station.id} position={[station.lat, station.lng]} icon={atmoIndexPin(index.available ? index.record?.code : null)} opacity={opacity} zIndexOffset={1000} title={`Station Atmo · ${station.name}`} attribution="Atmo Auvergne-Rhône-Alpes · indices communaux et mesures aux stations" onSelect={() => onSelect(station.id)}>
    <Tooltip>{station.name}<br />Indice Atmo · {index.commune?.nom ?? "Commune inconnue"} · {indexDateLabel(index.date)} : {index.label}<br />{measurements.map(({ pollutant }) => AIR_POLLUTANTS.find((p) => p.id === pollutant)!.label).join(" · ")}</Tooltip>
  </Marker>;
  });
}

export function AtmoDetails({ state, stationId }: { state: AirState; stationId: string }) {
  const now = useAirClock();
  const group = combineAirStations(state).find(({ station }) => station.id === stationId);
  if (!group) return <p role="status">Les mesures de cette station ne sont plus disponibles. Actualisez la couche pour réessayer.</p>;
  const { station, measurements } = group;
  const index = stationAtmoIndex(station, state.indices, now);
  return <>
    <DetailFacts items={[
      { label: "Station", value: station.id }, { label: "Implantation", value: [station.typology, station.influence].filter(Boolean).join(" · ") },
      { label: "Coordonnées publiées", value: `${station.lat.toFixed(5)}, ${station.lng.toFixed(5)}` },
    ]} />
    <section aria-label="Indice Atmo communal" className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-slate-400" style={{ background: index.color }} />Indice Atmo · {index.label}</p>
      <p>Commune de {index.commune?.nom ?? "localisation inconnue"} · {indexDateLabel(index.date)}</p>
      <p className="text-xs text-slate-600">{index.available ? "Prévision quotidienne à l’échelle de la commune, pas une mesure à cette station." : "Aucun indice disponible pour aujourd’hui. Les mesures de la station restent affichées ci-dessous."}</p>
      {index.record && <p className="text-xs text-slate-500">Diffusé le {airDate(Date.parse(index.record.publishedAt))} (Paris).</p>}
      <a href={ATMO_INDEX_SOURCE} target="_blank" rel="noreferrer" className="text-blue-iec underline">Source : Atmo Auvergne-Rhône-Alpes</a>
    </section>
    <DetailSection title="Les polluants mesurés" description="Toutes les mesures disponibles à cette station, avec leur historique. La période de moyenne et les dates sont précisées pour chaque polluant.">
      <div className={styles.cards}>{measurements.map(({ pollutant, station: data }) => <StationDetails key={pollutant} station={data} pollutant={pollutant} />)}</div>
      {!measurements.length && <p className={styles.notice}>Station aux coordonnées publiées par Atmo. Aucune mesure chargée pour le moment ; sa présence sur la carte ne signifie pas qu’un flux en temps réel est disponible.</p>}
      {datasets(state).some((data) => data.status === "loading" || data.status === "error") && <p className={`${styles.notice} mt-5`}>Certains flux sont encore en chargement ou indisponibles. Leur absence n’indique pas une absence de pollution.</p>}
    </DetailSection>
    {stationId === GEODAIR_STATION && <>
      {state.national && <DetailSection title="Autres gaz mesurés" description="NO et NOₓ ne participent pas au calcul de la couleur du pin."><div className={styles.cards}>{(["no", "nox"] as const).map(id => state.national?.stations[id] && <StationDetails key={id} station={state.national.stations[id]!} pollutant={id} />)}</div></DetailSection>}
      <GeodairHistoryDetails />
    </>}
    <DetailSection title="À propos de ces données"><p className={styles.notice}>Source : Atmo Auvergne-Rhône-Alpes. Mesures horaires ou journalières aux coordonnées des stations, pas des indices communaux. Les codes de validation sont reproduits tels que publiés. Une concentration ne permet pas à elle seule d’identifier la source d’émission.</p></DetailSection>
  </>;
}
