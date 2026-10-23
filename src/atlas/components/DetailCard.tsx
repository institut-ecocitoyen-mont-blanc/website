"use client";
import { useState, type ReactNode } from "react";
import styles from "./AtlasDetails.module.css";

export function DetailHeadline({ title, subtitle, date, color = "#e2e8f0", count }: { title: ReactNode; subtitle: ReactNode; date?: ReactNode; color?: string; count?: { value: number; total: number } }) {
  const fraction = count && count.total > 0 ? Math.min(1, Math.max(0, count.value / count.total)) : 0;
  return <section className={styles.headline} aria-label="En résumé">
    {count ? <div aria-hidden="true" className={styles.ring} style={{ background: `conic-gradient(#cbd5e1 ${fraction * 100}%, #f1f5f9 0)` }}><span><b>{count.value}</b><small>/{count.total}</small></span></div> : <span aria-hidden="true" className={styles.dot} style={{ background: color }} />}
    <div className={styles.headlineText}><h3>{title}</h3><p>{subtitle}</p></div>
    {date && <div className={styles.headlineDate}>{date}</div>}
  </section>;
}

export function DetailData({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return <details className={styles.allData}><summary><span className={styles.toggleIcon} aria-hidden="true" />Toutes les données{hint && <span className={styles.dataHint}>{hint}</span>}</summary><div className={styles.dataContent}>{children}</div></details>;
}

export function DetailLimits({ children, sources }: { children: ReactNode; sources?: ReactNode }) {
  return <footer className={styles.limits}><h3>Limites et sources</h3><div>{children}</div>{sources && <div className={styles.sourceLinks}>{sources}</div>}</footer>;
}

export function DetailTable<T = ReactNode[]>({ headers, rows, records, renderRow, caption }: { headers: string[]; caption: string } & ({ rows: ReactNode[][]; records?: never; renderRow?: never } | { rows?: never; records: T[]; renderRow: (record: T) => ReactNode[] })) {
  const [page, setPage] = useState(0);
  const count = rows ? rows.length : records.length;
  const pages = Math.max(1, Math.ceil(count / 50)), current = Math.min(page, pages - 1);
  const visible = rows ? rows.slice(current * 50, (current + 1) * 50) : records.slice(current * 50, (current + 1) * 50).map(renderRow);
  return <><div className={styles.tableScroll}><table className={styles.dataTable}><caption>{caption}</caption><thead><tr>{headers.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visible.map((row, i) => <tr key={current * 50 + i}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}>{cell ?? "Non renseigné"}</th> : <td key={j}>{cell ?? "Non renseigné"}</td>)}</tr>)}</tbody></table></div>{pages > 1 && <nav aria-label="Pagination des résultats" className="flex items-center justify-between gap-3 py-3 text-sm"><button disabled={current === 0} className="text-blue-iec disabled:opacity-40" onClick={() => setPage(current - 1)}>Précédent</button><span>Page {current + 1} / {pages} · {count.toLocaleString("fr-FR")} résultats</span><button disabled={current + 1 >= pages} className="text-blue-iec disabled:opacity-40" onClick={() => setPage(current + 1)}>Suivant</button></nav>}</>;
}

export function DetailStats({ items }: { items: { label: string; value: ReactNode; unit?: string; note?: ReactNode }[] }) {
  return <div className={styles.stats}>{items.map(item => <div key={item.label}><p>{item.label}</p><strong>{item.value} <small>{item.unit}</small></strong>{item.note && <p className={styles.statNote}>{item.note}</p>}</div>)}</div>;
}

type Band = { color: string; label: string; max: number };
export function DetailGauges({ rows, bands, label }: { rows: { label: string; value: number | null | undefined; text: string }[]; bands: readonly Band[]; label: string }) {
  // Equal-width, explicitly labelled classes; no invented upper bound for the final class.
  return <section className={styles.visual} aria-label={label}><p className={styles.visualLabel}>{label}</p><ul className={styles.gauges}>{rows.map(row => {
    const index = row.value == null || !Number.isFinite(row.value) || row.value < 0 ? -1 : bands.findIndex(b => row.value! < b.max);
    return <li key={row.label}><span>{row.label}</span><span aria-hidden="true" className={styles.gaugeTrack} style={{ background: `linear-gradient(to right, ${bands.map((b, i) => `${b.color} ${i / bands.length * 100}% ${(i + 1) / bands.length * 100}%`).join(", ")})` }}>{index >= 0 && <i style={{ left: `${(index + .5) / bands.length * 100}%` }} />}</span><strong>{row.text}</strong></li>;
  })}</ul><ul className={styles.legend}>{bands.map(b => <li key={b.label}><i style={{ background: b.color }} />{b.label}</li>)}</ul></section>;
}

export function DetailBars({ rows, label }: { rows: { label: string; value: number | null; max: number; text: string; color?: string }[]; label: string }) {
  return <section className={styles.visual}><p className={styles.visualLabel}>{label}</p><ul className={styles.gauges}>{rows.map((r, i) => <li key={`${r.label}-${i}`}><span>{r.label}</span><span aria-hidden="true" className={styles.barTrack}><i style={{ width: `${r.value === null || r.max <= 0 ? 0 : Math.max(0, Math.min(100, r.value / r.max * 100))}%`, background: r.color ?? "#1d6ab2" }} /></span><strong>{r.text}</strong></li>)}</ul></section>;
}
