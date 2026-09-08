"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, Wind, Waves, GlassWater, MapPin } from "lucide-react";
import styles from "./AtlasDetails.module.css";

export default function AtlasDetailDialog({ title, kind, subtitle, children, onClose }: {
  title: string; kind: "atmo" | "rivers" | "drinking" | "inventory"; subtitle: string;
  children: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const backdropDown = useRef(false);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    // Focus static content so Enter on a map pin cannot also activate Close.
    headingRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      // Release the native modal's inert background before restoring focus.
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  const Icon = { atmo: Wind, rivers: Waves, drinking: GlassWater, inventory: MapPin }[kind];
  const label = { atmo: "Qualité de l’air", rivers: "Qualité des cours d’eau", drinking: "Eau potable", inventory: "Inventaire écocitoyen" }[kind];
  return <dialog ref={ref} aria-labelledby={titleId} aria-modal="true" className={styles.dialog}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, [tabindex="0"]')].filter((el) => el.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }}
    onPointerDown={(event) => { backdropDown.current = event.target === event.currentTarget; }}
    onClick={(event) => { if (event.target === event.currentTarget && backdropDown.current) onClose(); }}>
    <div className={styles.layout}>
      <header className={styles.hero}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}><Icon size={18} aria-hidden="true" />{label}<span> / Fiche du territoire</span></p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <button type="button" aria-label="Fermer la fiche" onClick={onClose} className={styles.close}><X size={22} /></button>
      </header>
      <div className={styles.body} data-atlas-detail-body>{children}</div>
      <footer className={styles.footer}><span>Atlas environnemental · Pays du Mont-Blanc</span><button type="button" onClick={onClose}>Revenir à la carte</button></footer>
    </div>
  </dialog>;
}

export function DetailFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className={styles.facts}>{items.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value || "Non renseigné"}</dd></div>)}</dl>;
}

export function DetailSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className={styles.section}><div className={styles.sectionHeading}><h3>{title}</h3>{description && <p>{description}</p>}</div>{children}</section>;
}
