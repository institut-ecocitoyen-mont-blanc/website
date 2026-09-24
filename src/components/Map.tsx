"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type PollutionSite, getSectorColor } from "@/lib/google-sheets";
import Marker from "./map/MapMarker";
import PinGroups from "./map/PinGroups";
import { createPinIcon } from "./map/pin-icon";

interface MapProps {
  sites: PollutionSite[];
  onSelectSite: (site: PollutionSite) => void;
}

function normalizeSector(sector: string): string {
  return sector
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getSectorIconMarkup(sector: string): string {
  const normalizedSector = normalizeSector(sector);

  if (
    normalizedSector.includes("dechet") ||
    normalizedSector.includes("effluent")
  ) {
    return `
      <path d="M5 7h14"/>
      <path d="M9 7V4h6v3"/>
      <path d="m7 7 1 13h8l1-13"/>
      <path d="M10 11v5M14 11v5"/>
    `;
  }

  if (
    normalizedSector.includes("carriere") ||
    normalizedSector.includes("extraction")
  ) {
    return `
      <path d="m3 19 6-10 4 6 2-3 6 7H3Z"/>
      <path d="m8 15 2-3 2 3"/>
    `;
  }

  if (normalizedSector.includes("service secteur routier")) {
    return `
      <path d="M10 3h4l5 18H5L10 3Z"/>
      <path d="M8 11h8M7 16h10"/>
    `;
  }

  if (
    normalizedSector.includes("traffic routier") ||
    normalizedSector.includes("trafic routier")
  ) {
    return `
      <path d="m5 16-1 3M19 16l1 3"/>
      <path d="m4 13 2-6h12l2 6"/>
      <path d="M4 13h16v4H4z"/>
      <path d="M7 13v.01M17 13v.01"/>
    `;
  }

  if (normalizedSector.includes("decolletage")) {
    return `
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      <path d="m5 5 2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>
    `;
  }

  if (normalizedSector.includes("industrie")) {
    return `
      <path d="M4 21V10l6-3v4l5-3v4l5-3v12H4Z"/>
      <path d="M8 16h2M14 16h2M8 21v-3"/>
    `;
  }

  if (normalizedSector.includes("production de chaleur")) {
    return `
      <path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 0 2-1 3-2 4 0-4-2-7-5-9 1 5-3 8-3 12 0 4 3 7 7 7Z"/>
    `;
  }

  if (
    normalizedSector.includes("energie electrique") ||
    normalizedSector.includes("electricite")
  ) {
    return `<path d="M13 2 4 14h8l-1 8 9-12h-8l1-8Z"/>`;
  }

  if (
    normalizedSector.includes("tourisme") ||
    normalizedSector.includes("loisir")
  ) {
    return `
      <circle cx="17" cy="6" r="2"/>
      <path d="m3 20 6-10 4 6 2-3 6 7H3Z"/>
    `;
  }

  return `<circle cx="12" cy="12" r="2.5" fill="#64748b" stroke="none"/>`;
}

// Create custom marker icons based on sector color and activity.
export const createCustomIcon = (color: string, sector: string) => {
  const sectorIcon = getSectorIconMarkup(sector);
  return createPinIcon({ className: "custom-marker", fill: color, glyph: sectorIcon, glyphColor: color, whiteCenter: true });
};

function FitMapToSites({ sites }: { sites: PollutionSite[] }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length === 0) return;

    if (sites.length === 1) {
      const site = sites[0];
      map.setView([site.coordinates.lat, site.coordinates.lng], 14, {
        animate: true,
      });
      return;
    }

    const bounds = L.latLngBounds(
      sites.map((site) => [
        site.coordinates.lat,
        site.coordinates.lng,
      ]),
    );
    map.fitBounds(bounds, {
      animate: true,
      maxZoom: 14,
      padding: [40, 40],
    });
  }, [map, sites]);

  return null;
}

export default function Map({ sites, onSelectSite }: MapProps) {
  // Center on the Mont Blanc region
  const center: [number, number] = [45.9, 6.7];

  return (
    <>
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .site-popup {
          min-width: 200px;
        }
        .site-popup h3 {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .site-popup p {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .site-popup button {
          background-color: #1d6ab2;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          width: 100%;
        }
        .site-popup button:hover {
          background-color: #155a94;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "600px", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMapToSites sites={sites} />
        <PinGroups>
        {sites.map((site) => {
          const color = getSectorColor(site.sector);

          return (
            <Marker
              key={`${site.id}-${site.name}`}
              position={[site.coordinates.lat, site.coordinates.lng]}
              icon={createCustomIcon(color, site.sector)}
              alt={`${site.name} — ${site.sector}`}
              title={`${site.name} — ${site.sector}`}
            >
              <Popup>
                <div className="site-popup">
                  <h3>{site.name}</h3>
                  <p>{site.commune}</p>
                  <p style={{ color }}>{site.sector}</p>
                  <button onClick={() => onSelectSite(site)}>
                    Voir les détails
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </PinGroups>
      </MapContainer>
    </>
  );
}
