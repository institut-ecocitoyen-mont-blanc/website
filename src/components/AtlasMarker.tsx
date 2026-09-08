"use client";

import { Marker, type MarkerProps } from "react-leaflet";
import type { LeafletKeyboardEvent } from "leaflet";

export default function AtlasMarker({ onSelect, ...props }: Omit<MarkerProps, "eventHandlers"> & { onSelect: () => void }) {
  // Leaflet's built-in Enter handler belongs to Popup. Keep keyboard activation
  // when details are opened outside Leaflet instead.
  return <Marker {...props} eventHandlers={{
    click: onSelect,
    keydown: (event: LeafletKeyboardEvent) => {
      if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
        onSelect();
      }
    },
  }} />;
}
