import { divIcon } from "leaflet";

// Shared visible silhouette, canvas and geographic anchor for every map pin.
export function createPinIcon({ className, fill, stroke = "white", glyph = "", glyphColor = stroke, whiteCenter = false, content, quality }: {
  className: string; fill: string; stroke?: string; glyph?: string; glyphColor?: string; whiteCenter?: boolean; content?: string; quality?: string;
}) {
  return divIcon({
    className,
    iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38],
    html: `<svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true"${quality ? ` data-quality="${quality}"` : ""}>
      <path fill="${fill}" stroke="${stroke}" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      ${whiteCenter ? '<circle cx="12" cy="9" r="4.6" fill="white"/>' : ""}
      ${content ?? `<g transform="${whiteCenter ? "translate(8.5 5.5) scale(.292)" : "translate(7.5 4.5) scale(.375)"}" fill="none" stroke="${glyphColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`}
    </svg>`,
  });
}
