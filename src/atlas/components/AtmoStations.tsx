"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "react-leaflet";
import Marker from "@/atlas/components/AtlasMarker";
import { atmoIndexPin } from "@/atlas/components/EnvironmentalPin";
import { ATMO_INDEX_CLASSES, ATMO_INDEX_SOURCE, stationAtmoIndex, indexDateLabel, type AtmoIndexData } from "@/atlas/lib/atmo-index";
import { DetailFacts, DetailSection } from "@/atlas/components/AtlasDetailDialog";
import styles from "./AtlasDetails.module.css";
import { DetailData, DetailHeadline, DetailLimits, DetailStats, DetailTable } from "./DetailCard";
import LayerAbout from "./LayerAbout";
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
    {state.nationalError && <p className="text-amber-900">{state.nationalError}</p>}
    <p className="font-medium">{groups.length} stations · tous les polluants disponibles</p>
    <ul aria-label="Polluants affichés" aria-live="polite" className="flex flex-wrap gap-1.5">
      {AIR_POLLUTANTS.map(({ id, label }) => <li key={id} className="rounded-md border border-blue-100 bg-white px-2 py-1">
        <span className="font-semibold">{label}</span>{!state[id].stations.length && <span className="text-slate-500"> · {state[id].status === "loading" ? "chargement…" : "indisponible"}</span>}
        {state[id].status === "error" && <p className="mt-1 text-red-700">{state[id].error}</p>}
      </li>)}
    </ul>
    {state.indexError && <p className="text-amber-900">{state.indexError}</p>}
    {(state.nationalError || state.indexError || datasets(state).some((data) => data.status === "error")) && <button onClick={onRetry} className="underline text-blue-iec">Réessayer les données Atmo</button>}
    {Number.isFinite(newest) && <p className="text-slate-600">Dernier créneau du flux : {airDate(newest)} (heure de Paris).</p>}
    {Number.isFinite(newest) && airIsStale(newest) && <p className="rounded bg-amber-50 p-2 font-semibold text-amber-900">Flux historique : aucune donnée récente (moins de 48 h). Ne décrit pas la qualité de l’air actuelle.</p>}
    <p className="font-medium">Couleur : indice Atmo communal du jour</p>
    <ul aria-label="Légende de l’indice Atmo" className="grid grid-cols-2 gap-2">{ATMO_INDEX_CLASSES.map(c => <li key={c.code} className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full border border-slate-400" style={{ background: c.color }} />{c.label}</li>)}</ul>
    <p className="text-slate-500">Pas une mesure à la station. Gris : indice du jour indisponible.</p>
    <LayerAbout>
    <p>Passy : mesures horaires Geod’air, dont NO et NOₓ dans la fiche. Historique annuel et prélèvements de benzo[a]pyrène disponibles séparément.</p>
    <p>Sallanches Régie et Passy Chedde : moyennes journalières lorsque les mesures horaires ne sont pas disponibles. Tous les polluants sont affichés ensemble.</p>
    <a className="block text-blue-iec underline" href="https://www.atmo-auvergnerhonealpes.fr/dataviz/mesures-aux-stations" target="_blank" rel="noreferrer">Mesures aux stations · Atmo</a>
    <a className="text-blue-iec underline" href={ATMO_INDEX_SOURCE} target="_blank" rel="noreferrer">Indice communal officiel · Atmo Auvergne-Rhône-Alpes</a>
    <p className="text-slate-500">Source ATMO Auvergne - Rhône-Alpes : Indice communal de la qualité de l’air sur la région Auvergne - Rhône-Alpes · ODbL 1.0.</p>
    <p className="text-slate-500">Flux régional : Source ATMO Auvergne - Rhône-Alpes, Mesure de la pollution atmosphérique sur la région Auvergne - Rhône-Alpes. <a className="underline" href="https://institut-ecocitoyen-mont-blanc.github.io/iec-atlas-data/" target="_blank" rel="noreferrer">Extrait local normalisé</a> disponible sous <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a>.</p>
    <p className="text-slate-500">Le flux national de Passy est publié séparément : Atmo Auvergne-Rhône-Alpes · Geod’air / LCSQA-Ineris, Licence Ouverte.</p>
    </LayerAbout>
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
  return <section className="min-w-0 space-y-4">
    <DetailTable caption={`${label} · dernière valeur numérique disponible`} headers={["Période (Paris)", "Valeur", "Validation publiée"]} rows={latest ? [[`${station.period === "daily" ? "Journalière" : "Horaire"} · ${airDate(latest.time)}${latest.end ? ` → ${airDate(latest.end)}` : ""}`, `${latest.value!.toLocaleString("fr-FR")} ${latest.unit}`, airReadingStatus(latest, national)]] : [["Non disponible", "Non disponible", "Non renseignée"]]} />
    {slot?.value === null && <p className="text-xs text-slate-500">Dernier créneau ({airDate(slot.time)}) : mesure absente ou invalide, pas une valeur nulle.</p>}
    {airIsStale(latest?.time ?? slot?.time) && <p className="text-xs text-slate-500">Données historiques — pas une mesure actuelle.</p>}
    <HistoryChart station={station} label={label} />
    <details><summary className="cursor-pointer text-blue-iec">Valeurs et statuts de validation ({station.readings.length})</summary>
      <DetailTable caption={`Historique · ${label}`} headers={["Début (Paris)", "Valeur", "Validation*"]} rows={[...station.readings].reverse().map(r => [airDate(r.time), r.value === null ? "Absente / invalide" : `${r.value.toLocaleString("fr-FR")} ${r.unit}`, airReadingStatus(r, national)])} />
    </details>
    <p className="text-xs text-slate-500">{national ? "* Type de valeur, validité et code qualité Geod’air conservés séparément. Les valeurs invalides ne sont pas tracées. Une moyenne brute peut encore être révisée ; le code qualité seul n’indique pas une validation définitive." : `* Champ source « ${station.period === "daily" ? "validite" : "statut_valid"} ». Les codes ne sont pas assimilés à une validation définitive.`}</p>
    <a className={styles.source} href={sourceUrl} target="_blank" rel="noreferrer">Données sources · {national ? "Geod’air / Atmo" : "Atmo régional"}</a>
  </section>;
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
  const latest = measurements.map(({ pollutant, station: data }) => ({ label: AIR_POLLUTANTS.find(p => p.id === pollutant)!.label, data, reading: latestAirValue(data) }));
  const newest = Math.max(...measurements.flatMap(m => m.station.readings.map(r => r.time)));
  const otherGases = stationId === GEODAIR_STATION ? (["no", "nox"] as const).flatMap(id => {
    const data = state.national?.stations[id], r = data && latestAirValue(data);
    return r ? [`${GEODAIR_POLLUTANTS.find(p => p.id === id)!.label} : ${r.value?.toLocaleString("fr-FR")} ${r.unit} · ${airDate(r.time)}`] : [];
  }) : [];
  return <>
    <DetailHeadline title={`Indice Atmo · ${index.label}`} color={index.available ? index.color : "#e2e8f0"} subtitle={`Commune de ${index.commune?.nom ?? "localisation inconnue"} · prévision communale, pas une mesure à la station`} date={<>{indexDateLabel(index.date)}{index.record && <><br />Diffusé le {airDate(Date.parse(index.record.publishedAt))}</>}</>} />
    <DetailStats items={latest.map(({ label, data, reading }) => ({ label: `${label} · ${data.period === "daily" ? "journalière" : "horaire"}`, value: reading?.value?.toLocaleString("fr-FR") ?? "Non disponible", unit: reading?.unit, note: reading ? <>{airDate(reading.time)} (Paris)<br />{airReadingStatus(reading, data.source === "geodair")}</> : undefined }))} />
    <DetailFacts items={[
      { label: "Dernier créneau du flux", value: Number.isFinite(newest) ? `${airDate(newest)} (Paris)` : "Non disponible" },
      { label: "Implantation", value: [station.typology, station.influence].filter(Boolean).join(" · ") },
      ...(otherGases.length ? [{ label: "Autres gaz (hors indice)", value: otherGases.join(" · ") }] : []),
    ]} />
    <DetailData hint="Historiques, validation et autres polluants">
      <DetailSection title="Les polluants mesurés" description="Toutes les mesures disponibles, avec leurs dates, périodes de moyenne et codes publiés.">
        <div className={styles.cards}>{measurements.map(({ pollutant, station: data }) => <StationDetails key={pollutant} station={data} pollutant={pollutant} />)}</div>
      </DetailSection>
      {stationId === GEODAIR_STATION && <>
        {state.national && <DetailSection title="Autres gaz mesurés" description="NO et NOₓ ne participent pas au calcul de la couleur du pin."><div className={styles.cards}>{(["no", "nox"] as const).map(id => state.national?.stations[id] && <StationDetails key={id} station={state.national.stations[id]!} pollutant={id} />)}</div></DetailSection>}
        <GeodairHistoryDetails />
      </>}
    </DetailData>
    <DetailLimits sources={<><a href={ATMO_INDEX_SOURCE} target="_blank" rel="noreferrer">Indice communal · Atmo Auvergne-Rhône-Alpes · ODbL 1.0</a><a href={GEODAIR_SOURCE} target="_blank" rel="noreferrer">Geod’air / LCSQA-Ineris · Licence Ouverte</a></>}>
      <p>La couleur est celle de l’indice Atmo du jour de la commune, pas une mesure à cette station. Les concentrations horaires ou journalières sont présentées séparément, sans leur attribuer une classe de l’indice communal. Codes de validation conservés tels que publiés ; une moyenne brute peut encore être révisée, le code qualité seul n’indique pas une validation définitive. Une concentration ne permet pas à elle seule d’identifier la source d’émission.</p>
      {!index.available && <p>Aucun indice disponible pour aujourd’hui. Les mesures de la station restent affichées.</p>}
      {Number.isFinite(newest) && airIsStale(newest) && <p>Données historiques : aucun créneau de moins de 48 h, pas une mesure de l’air actuel.</p>}
      {!measurements.length && <p>Aucune mesure chargée. La présence d’une station ne signifie pas qu’un flux en temps réel est disponible.</p>}
      {datasets(state).some(d => d.status === "loading" || d.status === "error") && <p>Certains flux sont en chargement ou indisponibles. Leur absence n’indique pas une absence de pollution.</p>}
      {state.nationalError && <p>{state.nationalError}</p>}{state.indexError && <p>{state.indexError}</p>}
      {state.indices?.fetchedAt && <p>Indices récupérés le {airDate(Date.parse(state.indices.fetchedAt))} (Paris).</p>}
    </DetailLimits>
  </>;
}
