import type { ReactNode } from "react";

export default function LayerAbout({ children }: { children: ReactNode }) {
  return <details className="border-t border-slate-200 pt-2 text-xs text-slate-600">
    <summary className="cursor-pointer py-1 font-medium text-blue-iec focus-visible:outline-2 focus-visible:outline-offset-2">À propos de cette couche</summary>
    <div className="mt-2 space-y-3 leading-relaxed">{children}</div>
  </details>;
}
