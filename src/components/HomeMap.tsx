"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { type PollutionSite, getSectorColor } from "@/lib/google-sheets";

interface HomeMapProps {
  sites: PollutionSite[];
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

// Component to handle map click
function MapClickHandler() {
  const router = useRouter();

  useMapEvents({
    click: () => {
      router.push("/carte");
    },
  });

  return null;
}

export default function HomeMap({ sites }: HomeMapProps) {
  const router = useRouter();
  // Center on the Mont Blanc region
  const center: [number, number] = [45.9, 6.7];

  const handleMarkerClick = (siteId: number) => {
    router.push(`/carte?site=${siteId}`);
  };

  return (
    <>
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .home-map {
          cursor: pointer;
        }
        .home-map .leaflet-marker-icon {
          cursor: pointer;
        }
      `}</style>
      <div className="home-map">
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: "500px", width: "100%" }}
          scrollWheelZoom={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          zoomControl={false}
          attributionControl={true}
          keyboard={false}
          boxZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler />
          {sites.map((site) => {
            const color = getSectorColor(site.sector);

            return (
              <Marker
                key={`${site.id}-${site.name}`}
                position={[site.coordinates.lat, site.coordinates.lng]}
                icon={createCustomIcon(color)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    handleMarkerClick(site.id);
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
