"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type PollutionSite, getSectorColor } from "@/lib/google-sheets";

interface MapProps {
  sites: PollutionSite[];
  onSelectSite: (site: PollutionSite) => void;
}

// Create custom marker icons based on sector color
const createCustomIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

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
        {sites.map((site) => {
          const color = getSectorColor(site.sector);

          return (
            <Marker
              key={`${site.id}-${site.name}`}
              position={[site.coordinates.lat, site.coordinates.lng]}
              icon={createCustomIcon(color)}
            >
              <Popup>
                <div className="site-popup">
                  <h3>{site.name}</h3>
                  <p>{site.location}</p>
                  <p style={{ color }}>{site.sector}</p>
                  <button onClick={() => onSelectSite(site)}>
                    Voir les détails
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
