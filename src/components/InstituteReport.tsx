"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import { Droplets, Wind, Sprout, MapPin, FlaskConical, Info } from "lucide-react";
import type { InstituteReport as Report } from "@/lib/institute-report";
import { INSTITUTE_DEMO_NOTICE } from "@/lib/institute-demo";
import styles from "./InstituteReport.module.css";

const format = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function InstituteReport({ report }: { report: Report }) {
  const Icon = { Air: Wind, Eau: Droplets, Sol: Sprout }[report.medium];
  const count = report.groups.reduce((total, group) => total + group.readings.length, 0);
  const chart = report.groups.find((group) => group.readings.length > 1 && group.readings.every((r) => r.unit === group.readings[0].unit));
  const maximum = chart ? Math.max(...chart.readings.map((r) => r.value), 1) : 1;
  const campaign = /^\d{4}-\d{2}-\d{2}$/.test(report.campaign) ? new Date(`${report.campaign}T12:00:00Z`).toLocaleDateString("fr-FR") : report.campaign;
  return <article className={styles.report} aria-label="Rapport de suivi de l’Institut">
    <div className={styles.overview}>
      <div><h3>Commune</h3><strong className={styles.commune}>{report.commune}</strong><p>Haute-Savoie · Pays du Mont-Blanc</p><p className={styles.date}>Campagne fictive · {campaign}</p></div>
      <div><h3>Milieu étudié</h3><span className={styles.chip}><Icon size={17} />{report.medium}</span><p>{count} paramètres présentés</p></div>
      <div><h3>Moyens d’étude envisagés</h3><p className={styles.method}>{report.method}</p><p>Institut écocitoyen</p></div>
    </div>
    <div className={styles.synthesis}>
      <div><strong>{report.index === undefined ? "Suivi simulé" : `${report.index} / 100`}</strong><span>{report.index === undefined ? "Données de démonstration" : "Indice illustratif · sans unité"}</span>{report.index !== undefined && <div className={styles.indexTrack}><div style={{ width: `${report.index}%` }} /></div>}</div>
      <p>{report.context}</p>
    </div>
    <p className={styles.disclaimer}><Info size={17} aria-hidden="true" />{INSTITUTE_DEMO_NOTICE}</p>
    <section className={styles.location} aria-label="Localisation du site">
      <h3><MapPin size={20} />Localisation du site</h3>
      <div className={styles.map}>
        <MapContainer center={[report.lat, report.lng]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} dragging={false} touchZoom={false} doubleClickZoom={false} boxZoom={false} keyboard={false} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          <CircleMarker center={[report.lat, report.lng]} radius={9} pathOptions={{ color: "white", weight: 3, fillColor: "#1d6ab2", fillOpacity: 1 }} interactive={false} />
          <ResizeMap />
        </MapContainer>
      </div>
      <p className={styles.coordinates}>{report.lat.toFixed(4)}, {report.lng.toFixed(4)} <span>· Repère illustratif, pas un prélèvement vérifié</span></p>
    </section>
    <section className={styles.results}>
      <div className={styles.sectionHeading}><Icon size={25} /><h3>{report.medium} <span>Résultats simulés</span></h3></div>
      <p className={styles.subtitle}>Méthode envisagée : {report.method}. Ouvrez un paramètre pour consulter sa fiche.</p>
      {report.groups.map((group) => <div className={styles.group} key={group.title}>
        <h4>{group.title}</h4>
        {group.readings.map((reading) => <details className={styles.parameter} key={reading.name}>
          <summary><span className={styles.parameterName}>{reading.name}<small>Fiche du paramètre · détails et lecture</small></span><span className={styles.value}>{format(reading.value)} <small>{reading.unit}</small></span><span className={styles.badge}>Simulé</span><span className={styles.expand} aria-hidden="true" /></summary>
          <div className={styles.parameterDetails}>
            <div><h5>Provenance</h5><p>Scénario de démonstration de l’Institut · {report.id}. Aucune analyse de laboratoire réelle.</p></div>
            <div><h5>Interprétation</h5><p>{reading.note}</p></div>
            <div><h5>Limites de lecture</h5><p>Cette valeur ne permet pas d’évaluer un risque sanitaire, une conformité réglementaire ou l’origine d’une pollution.</p></div>
          </div>
        </details>)}
      </div>)}
    </section>
    {chart && <section className={styles.chart} aria-label="Profil des valeurs simulées">
      <h3>Profil des valeurs simulées</h3><p>{chart.title} · {chart.readings[0].unit}</p>
      <div className={styles.bars}>{chart.readings.map((reading) => <div key={reading.name}><span>{reading.name}</span><div className={styles.barTrack}><div style={{ width: `${reading.value / maximum * 100}%` }} /></div><strong>{format(reading.value)}</strong></div>)}</div>
      <p>Valeurs du scénario dans une même unité. Longueurs relatives aux valeurs affichées, sans seuil réglementaire ni comparaison de toxicité.</p>
    </section>}
    <footer className={styles.sources}><FlaskConical size={20} /><div><strong>Source envisagée · Institut écocitoyen</strong><p>Fiche de démonstration · {report.id} · {campaign}. Les valeurs, unités et milieux restent distincts. Les résultats officiels des autres couches de l’atlas ne sont pas intégrés à ce scénario.</p></div></footer>
  </article>;
}
