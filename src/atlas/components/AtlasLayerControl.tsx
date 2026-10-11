"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import styles from "./AtlasLayerSidebar.module.css";

/** Layer visibility and disclosure are separate: folding a row keeps its map data visible. */
export default function AtlasLayerControl({ title, source, enabled, onEnabled, children, description }: {
  title: string; source: string; enabled: boolean; onEnabled: (value: boolean) => void;
  children: ReactNode; description?: string;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const open = expanded ?? enabled;
  return <section className={`${styles.layer} ${open ? styles.layerExpanded : ""}`}>
    <div className={styles.layerRow}>
      <input type="checkbox" className={styles.checkbox} aria-label={title} checked={enabled} onChange={(event) => {
        onEnabled(event.target.checked);
        setExpanded(event.target.checked);
      }} />
      <button type="button" className={styles.layerDisclosure} aria-expanded={open} aria-controls={id} onClick={() => setExpanded(!open)}>
        <span className={styles.layerIdentity}><span className={styles.layerTitle}>{title}</span><span className={styles.layerSource}>{source}</span></span>
        <ChevronRight size={18} aria-hidden="true" className={open ? styles.chevronOpen : styles.chevron} />
      </button>
    </div>
    <div id={id} hidden={!open} className={styles.layerBody}>
      {enabled ? children : <p>{description ?? "Activez cette couche pour afficher ses données et ses réglages sur la carte."}</p>}
    </div>
  </section>;
}
