"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Layers, X } from "lucide-react";
import styles from "./AtlasLayerSidebar.module.css";

const query = "(max-width: 1023px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const mobileSnapshot = () => window.matchMedia(query).matches;

function MobileDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropDown = useRef(false);
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={ref} id="atlas-mobile-layers" aria-label="Couches de l’atlas" aria-modal="true" className={styles.drawer}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')].filter((el) => el.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onPointerDown={(event) => { backdropDown.current = event.target === event.currentTarget; }}
    onClick={(event) => { if (event.target === event.currentTarget && backdropDown.current) onClose(); }}>
    <div className={styles.layout}>
      <header className={styles.header}><h2><Layers size={20} aria-hidden="true" />Couches de l’atlas</h2><button type="button" onClick={onClose} aria-label="Fermer les couches"><X size={22} /></button></header>
      <div className={styles.content}>{children}</div>
      <footer className={styles.footer}><button type="button" onClick={onClose}>Voir la carte</button></footer>
    </div>
  </dialog>, document.body);
}

export default function AtlasLayerSidebar({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, () => false);
  const [open, setOpen] = useState(false);
  // Reset the mobile drawer on breakpoint changes; layer state lives in AtlasMap.
  useEffect(() => { if (!mobile) setOpen(false); }, [mobile]);
  const content = <><p className="text-xs text-slate-500 mb-5">{activeCount} couche{activeCount > 1 ? "s" : ""} active{activeCount > 1 ? "s" : ""} · Superposez les données et réglez leur transparence.</p>{children}</>;
  if (mobile) return <>
    <div className="p-3 border-b border-slate-200 lg:hidden"><button type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="atlas-mobile-layers" onClick={() => setOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-iec px-4 py-2 font-semibold text-sm text-white"><Layers size={18} aria-hidden="true" />Couches<span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{activeCount}</span></button></div>
    {open && <MobileDrawer onClose={() => setOpen(false)}>{content}</MobileDrawer>}
  </>;
  return <aside aria-label="Couches de l’atlas" className="hidden lg:block p-5 border-r max-h-[740px] overflow-y-auto"><h2 className="font-bold text-lg flex items-center gap-2 mb-2"><Layers size={19} />Couches</h2>{content}</aside>;
}
