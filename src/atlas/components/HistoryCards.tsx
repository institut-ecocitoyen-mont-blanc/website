"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { historyMatches, historySegments, type HistoryPoint, type HistorySeries } from "../lib/history-series";
import { DetailTable } from "./DetailCard";
import styles from "./HistoryCards.module.css";

const PAGE_SIZE = 6;
const BLUE = "var(--color-blue-iec)";

function date(time: number, cadence?: HistorySeries["cadence"]) {
  return new Date(time).toLocaleString("fr-FR", cadence === "annual" ? { year: "numeric", timeZone: "UTC" } : { day: "2-digit", month: "2-digit", year: "numeric", ...(cadence === "hourly" ? { hour: "2-digit", minute: "2-digit" } as const : {}), timeZone: "Europe/Paris" });
}
function Graph({ series, points = series.points, small = false, onPoint, selectedIndex }: { series: HistorySeries; points?: HistoryPoint[]; small?: boolean; onPoint?: (index: number, announce: boolean) => void; selectedIndex?: number }) {
  const element = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  const values = points.filter(p => p.value !== null && p.qualifier !== "?");
  const visible = values.length > 0;
  useEffect(() => {
    if (small || !element.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.min(720, entry.contentRect.width))));
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [small, visible]);
  // Spans: the sparkline is rendered inside a card button.
  if (!values.length) return <span className={styles.empty}>Aucune valeur numérique représentable</span>;
  if (small && values.length === 1) return <span className={styles.empty}>Une seule valeur · pas de tendance</span>;
  const w = small ? 240 : width, h = small ? 70 : 270, left = small ? 5 : 55, right = small ? 5 : 15, bottom = small ? 5 : 38, top = small ? 5 : 25;
  const first = points[0].time, last = points.at(-1)!.time;
  let min = Infinity, max = -Infinity;
  for (const p of values) { min = Math.min(min, p.value!); max = Math.max(max, p.value!); }
  const pad = max === min ? Math.max(Math.abs(min) * .1, .01) : (max - min) * .1;
  const low = min >= 0 ? Math.max(0, min - pad) : min - pad, high = max + pad;
  const x = (time: number) => first === last ? w / 2 : left + (time - first) / (last - first) * (w - left - right);
  const y = (value: number) => h - bottom - (value - low) / (high - low) * (h - top - bottom);
  const path = historySegments(series, points).map(segment => segment.map((p, i) => `${i ? "L" : "M"}${x(p.time).toFixed(2)},${y(p.value!).toFixed(2)}`).join(" ")).join(" ");
  const selected = selectedIndex === undefined ? undefined : points[selectedIndex];
  const selectNearest = (clientX: number, announce: boolean) => {
    if (!element.current || !onPoint) return;
    const rect = element.current.getBoundingClientRect(), position = (clientX - rect.left) / rect.width * w;
    if (position < left || position > w - right) return;
    let nearest = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].time) - position) < Math.abs(x(points[nearest].time) - position)) nearest = i;
    onPoint(nearest, announce);
  };
  return <svg ref={element} className={small ? styles.spark : styles.graph} viewBox={`0 0 ${w} ${h}`} role={small ? undefined : "img"} aria-hidden={small || undefined} aria-label={small ? undefined : `Évolution de ${series.name}, en ${series.unit}. Sélectionnez une date sur le graphique ou utilisez les boutons précédent et suivant.`}
    onPointerMove={small ? undefined : e => { if (e.pointerType === "mouse") selectNearest(e.clientX, false); }} onPointerDown={small ? undefined : e => selectNearest(e.clientX, true)}>
    {!small && <>{[0, 1, 2, 3].map(i => { const v = low + (high - low) * i / 3; return <g key={i}><line x1={left} x2={w - right} y1={y(v)} y2={y(v)} stroke="#e3eaf2" /><text x={left - 8} y={y(v) + 4} textAnchor="end">{Number(v.toPrecision(3)).toLocaleString("fr-FR")}</text></g>; })}<text x={left} y={14}>{series.unit}</text><text x={left} y={h - 8}>{date(first, series.cadence)}</text>{first !== last && <text x={w - right} y={h - 8} textAnchor="end">{date(last, series.cadence)}</text>}</>}
    <path d={path} fill="none" stroke={BLUE} strokeWidth={small ? 1.5 : 1.7} opacity={.7} />
    {!small && selected && <g pointerEvents="none"><line x1={x(selected.time)} x2={x(selected.time)} y1={top} y2={h - bottom} stroke={BLUE} strokeDasharray="3 4" opacity={.5} />{selected.value !== null && selected.qualifier !== "?" && <circle cx={x(selected.time)} cy={y(selected.value)} r={8} fill={BLUE} fillOpacity={.12} stroke={BLUE} />}</g>}
    {points.map((p, i) => p.value === null || p.qualifier === "?" ? null : <g key={i} onClick={small ? undefined : e => { e.stopPropagation(); onPoint?.(i, true); }}>
      {p.qualifier === "=" ? <circle cx={x(p.time)} cy={y(p.value)} r={small ? 1.8 : 3.5} fill={BLUE} /> : <path d={`M${x(p.time) - 4},${y(p.value)}h8l-4,${p.qualifier.startsWith(">") ? -7 : 7}z`} fill="white" stroke="#94631f" strokeWidth="1.5" />}
    </g>)}
  </svg>;
}
function ExpandedHistory({ series, onClose, id }: { series: HistorySeries; onClose: () => void; id: string }) {
  // Selection is a timestamp (and rank among equal dates), so a refreshed sliding window keeps the same measurement.
  const [period, setPeriod] = useState(0), [activeKey, setActiveKey] = useState<{ time: number; nth: number }>(), [announcement, setAnnouncement] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.closest("section")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, []);
  const last = series.points.at(-1)!.time;
  const points = useMemo(() => series.points.filter(p => !period || p.time >= last - period * 86400000), [series.points, last, period]);
  const matches = activeKey ? points.flatMap((p, i) => p.time === activeKey.time ? [i] : []) : [];
  const index = matches.length ? matches[Math.min(activeKey!.nth, matches.length - 1)] : points.length - 1;
  const active = points[index];
  const select = (i: number, announce = true) => {
    const p = points[i];
    setActiveKey({ time: p.time, nth: i - points.findIndex(q => q.time === p.time) });
    if (announce) setAnnouncement(`${date(p.time, series.cadence)} · ${p.label}${p.value !== null ? ` ${series.unit}` : ""}`);
  };
  const periods = series.cadence === "hourly" || series.cadence === "daily" ? [[7, "7 jours"], [30, "30 jours"], [365, "1 an"]] as const : [[5 * 365.25, "5 ans"], [10 * 365.25, "10 ans"]] as const;
  return <section className={styles.panel} id={id} aria-labelledby={`${id}-heading`}>
    <div className={styles.panelHead}><div><p className={styles.eyebrow}>Historique des mesures</p><h4 tabIndex={-1} ref={heading} id={`${id}-heading`}>{series.name}</h4><p className={styles.meta}>{series.context} · {series.unit}{series.code && ` · ${series.code}`}</p></div><button type="button" onClick={onClose} aria-label="Fermer le graphique" className={styles.close}>×</button></div>
    <div className={styles.periods} role="group" aria-label="Période du graphique">{[[0, "Tout l’historique"], ...periods].map(([days, label]) => <button type="button" key={days} aria-pressed={period === days} onClick={() => { setPeriod(Number(days)); setActiveKey(undefined); }}>{label}</button>)}</div>
    <p className={styles.meta}>{points.length.toLocaleString("fr-FR")} résultats dans cette période · jusqu’au {date(last, series.cadence)}</p>
    <Graph series={series} points={points} onPoint={select} selectedIndex={index} />
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    {active && <div className={styles.selection}>
      <div className={styles.measurement}><span>{date(active.time, series.cadence)}</span><strong>{active.label} {active.value !== null && <small>{series.unit}</small>}</strong>{active.qualifier === "?" && active.value === null && <span>Non représenté sur le graphique</span>}</div>
      {points.length > 1 && <div className={styles.stepper} role="group" aria-label="Parcourir les mesures"><button type="button" aria-label="Mesure précédente" disabled={index === 0} onClick={() => select(index - 1)}>←</button><button type="button" aria-label="Mesure suivante" disabled={index === points.length - 1} onClick={() => select(index + 1)}>→</button></div>}
    </div>}
    <p className={styles.legend}><span>● Valeur mesurée</span><span>▽ △ Borne publiée (&lt; / &gt;), pas une valeur exacte</span></p>
    <p className={styles.note}>Dates à l’échelle du temps. Les traits guident la lecture, sans interpolation ; les valeurs absentes ou invalides ne sont pas remplacées par zéro. Les périodes se terminent au dernier résultat disponible, pas aujourd’hui. {points.length === 1 && "Une seule mesure ne permet pas de déduire une évolution."}</p>
    <details><summary>Voir les résultats de cette période</summary><DetailTable key={period} caption={`${series.name} · ${series.context}`} headers={["Prélèvement", "Résultat", "Qualification / statut", "Repères / couverture"]} records={[...points].reverse()} renderRow={p => [date(p.time, series.cadence), `${p.label} ${p.value !== null ? series.unit : ""}`, p.status || "Non renseigné", p.reference || "—"]} /></details>
  </section>;
}
export default function HistoryCards({ series, title = "L’évolution au fil des analyses", description }: { series: HistorySeries[]; title?: string; description?: string }) {
  const [query, setQuery] = useState(""), [page, setPage] = useState(0), [selected, setSelected] = useState<string>();
  const id = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const filtered = series.filter(s => historyMatches(s, query));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const start = currentPage * PAGE_SIZE, visible = filtered.slice(start, start + PAGE_SIZE);
  const chosen = series.find(s => s.id === selected);
  if (!series.length) return null;
  return <section className={styles.section} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className={styles.title}>{title}</h3><p className={styles.note}>{description && <>{description} </>}Un aperçu par paramètre. Cliquez pour explorer les mesures disponibles ; chaque graphique a sa propre échelle.</p>
    {series.length > PAGE_SIZE && <label className={styles.search}>Rechercher un paramètre<input type="search" placeholder="Nom, code, PFAS…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); setSelected(undefined); }} /></label>}
    <div className={styles.grid}>{visible.map(s => { const latest = s.points.at(-1)!; return <button type="button" ref={node => { if (node) buttons.current.set(s.id, node); else buttons.current.delete(s.id); }} key={s.id} className={styles.card} aria-expanded={selected === s.id} aria-controls={selected === s.id ? id : undefined} onClick={() => setSelected(selected === s.id ? undefined : s.id)}>
      <span className={styles.name}>{s.name}</span><span className={styles.context}>{s.context}</span><span className={styles.value}>{latest.label} <small>{latest.value !== null ? s.unit : ""}</small></span><span className={styles.meta}>Dernier résultat · {date(latest.time, s.cadence)}</span>
      <Graph small series={s} /><span className={styles.extent}><span>{new Date(s.points[0].time).getUTCFullYear()}–{new Date(latest.time).getUTCFullYear()}</span><span>{s.points.length.toLocaleString("fr-FR")} résultats</span></span><span className={styles.open}>Explorer l’évolution ↗</span>
    </button>; })}</div>
    {!filtered.length && <p>Aucun paramètre correspondant dans les résultats chargés.</p>}
    {filtered.length > PAGE_SIZE && <nav className={styles.pagination} aria-label="Paramètres"><button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelected(undefined); }}>Précédents</button><span>{start + 1}–{Math.min(filtered.length, start + PAGE_SIZE)} / {filtered.length}</span><button type="button" disabled={start + PAGE_SIZE >= filtered.length} onClick={() => { setPage(currentPage + 1); setSelected(undefined); }}>Suivants</button></nav>}
    {chosen && <ExpandedHistory key={chosen.id} series={chosen} id={id} onClose={() => { setSelected(undefined); buttons.current.get(chosen.id)?.focus(); }} />}
  </section>;
}
